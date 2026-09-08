import {
  adminTokenForPassword,
  clearAdminCookie,
  isAdminRequest,
  makeAdminCookie,
  sha256Hex,
} from "./auth";
import { ensureSchema } from "./schema";
import {
  extensionForContentType,
  MAX_IMAGE_BYTES,
  MAX_THUMB_BYTES,
  normalizeContentType,
  normalizeFilterId,
  normalizeOptionalText,
  validateUpload,
} from "./validation";

interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ADMIN_PASSWORD?: string;
}

type PhotoRow = {
  id: string;
  guest_name: string | null;
  message: string | null;
  filter_id: string;
  image_key: string;
  thumb_key: string;
  image_type: string;
  thumb_type: string;
  upload_token_hash: string;
  image_uploaded: number;
  thumb_uploaded: number;
  hidden: number;
  created_at: string;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...Object.fromEntries(new Headers(extraHeaders).entries()) },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function publicPhoto(row: PhotoRow) {
  return {
    id: row.id,
    guestName: row.guest_name,
    message: row.message,
    filterId: row.filter_id,
    createdAt: row.created_at,
    hidden: Boolean(row.hidden),
    imageUrl: `/api/photos/${row.id}/image`,
    thumbUrl: `/api/photos/${row.id}/thumb`,
  };
}

async function listPhotos(env: Env, admin = false): Promise<Response> {
  const where = admin
    ? "image_uploaded = 1 AND thumb_uploaded = 1"
    : "image_uploaded = 1 AND thumb_uploaded = 1 AND hidden = 0";
  const result = await env.DB.prepare(
    `SELECT * FROM photos WHERE ${where} ORDER BY created_at DESC LIMIT 500`,
  ).all<PhotoRow>();
  const items = (result.results ?? []).map(publicPhoto);
  return json({ items, total: items.length });
}

async function initUpload(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!body) return error("Invalid upload request.");

  const imageType = normalizeContentType(String(body.imageType ?? ""));
  const thumbType = normalizeContentType(String(body.thumbType ?? ""));
  const imageSize = Number(body.imageSize ?? 0);
  const thumbSize = Number(body.thumbSize ?? 0);
  const imageValidation = validateUpload(imageType, imageSize, MAX_IMAGE_BYTES);
  if ("error" in imageValidation) return error(imageValidation.error, imageValidation.status);
  const thumbValidation = validateUpload(thumbType, thumbSize, MAX_THUMB_BYTES);
  if ("error" in thumbValidation) return error(thumbValidation.error, thumbValidation.status);

  const id = crypto.randomUUID();
  const uploadToken = crypto.randomUUID();
  const tokenHash = await sha256Hex(uploadToken);
  const imageKey = `photos/${id}.${extensionForContentType(imageType)}`;
  const thumbKey = `thumbs/${id}.${extensionForContentType(thumbType)}`;

  await env.DB.prepare(
    `INSERT INTO photos (
      id, guest_name, message, filter_id, image_key, thumb_key,
      image_type, thumb_type, upload_token_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      normalizeOptionalText(body.guestName, 80),
      normalizeOptionalText(body.message, 220),
      normalizeFilterId(body.filterId),
      imageKey,
      thumbKey,
      imageType,
      thumbType,
      tokenHash,
    )
    .run();

  return json(
    {
      id,
      uploadToken,
      imageUploadUrl: `/api/uploads/${id}/image`,
      thumbUploadUrl: `/api/uploads/${id}/thumb`,
    },
    201,
  );
}

async function uploadPart(
  request: Request,
  env: Env,
  id: string,
  kind: "image" | "thumb",
): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM photos WHERE id = ? LIMIT 1")
    .bind(id)
    .first<PhotoRow>();
  if (!row) return error("Upload not found.", 404);
  if (row.image_uploaded && row.thumb_uploaded) return error("Upload is already complete.", 409);

  const token = request.headers.get("x-upload-token");
  if (!token || !row.upload_token_hash || (await sha256Hex(token)) !== row.upload_token_hash) {
    return error("Invalid upload token.", 403);
  }

  const expectedType = kind === "image" ? row.image_type : row.thumb_type;
  const actualType = normalizeContentType(request.headers.get("content-type") ?? "");
  if (actualType !== expectedType) return error("Image type does not match upload metadata.", 415);

  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_THUMB_BYTES;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 0) {
    const validation = validateUpload(actualType, contentLength, maxBytes);
    if ("error" in validation) return error(validation.error, validation.status);
  }
  if (!request.body) return error("Image is empty.");

  const key = kind === "image" ? row.image_key : row.thumb_key;
  const stored = await env.PHOTOS.put(key, request.body, {
    httpMetadata: { contentType: actualType },
    customMetadata: { photoId: id, kind },
  });
  if (!stored) return error("Could not store image.", 500);
  if (stored.size <= 0 || stored.size > maxBytes) {
    await env.PHOTOS.delete(key);
    return error(stored.size <= 0 ? "Image is empty." : "Image is too large.", stored.size <= 0 ? 400 : 413);
  }

  const column = kind === "image" ? "image_uploaded" : "thumb_uploaded";
  await env.DB.prepare(`UPDATE photos SET ${column} = 1 WHERE id = ?`).bind(id).run();
  const completion = await env.DB.prepare(
    "SELECT image_uploaded, thumb_uploaded FROM photos WHERE id = ? LIMIT 1",
  )
    .bind(id)
    .first<{ image_uploaded: number; thumb_uploaded: number }>();
  const complete = Boolean(completion?.image_uploaded && completion?.thumb_uploaded);
  if (complete) {
    await env.DB.prepare("UPDATE photos SET upload_token_hash = '' WHERE id = ?").bind(id).run();
  }
  return json({ ok: true, complete });
}

async function servePhotoPart(
  request: Request,
  env: Env,
  id: string,
  kind: "image" | "thumb",
): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM photos WHERE id = ? LIMIT 1")
    .bind(id)
    .first<PhotoRow>();
  if (!row || !row.image_uploaded || !row.thumb_uploaded) return new Response(null, { status: 404 });

  const admin = row.hidden ? await isAdminRequest(request, env.ADMIN_PASSWORD) : false;
  if (row.hidden && !admin) return new Response(null, { status: 404 });

  const key = kind === "image" ? row.image_key : row.thumb_key;
  const object = await env.PHOTOS.get(key);
  if (!object?.body) return new Response(null, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", row.hidden ? "private, no-store" : "public, max-age=3600");
  if (new URL(request.url).searchParams.get("download") === "1") {
    const extension = extensionForContentType(kind === "image" ? row.image_type : row.thumb_type);
    headers.set("content-disposition", `attachment; filename="ever-after-${id}.${extension}"`);
  }
  return new Response(object.body, { headers });
}

async function adminSession(request: Request, env: Env): Promise<Response> {
  return json({
    configured: Boolean(env.ADMIN_PASSWORD),
    authenticated: await isAdminRequest(request, env.ADMIN_PASSWORD),
  });
}

async function adminLogin(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_PASSWORD) return error("Admin password is not configured in Cloudflare.", 503);
  const body = await readJson(request);
  const password = typeof body?.password === "string" ? body.password : "";
  const submitted = await adminTokenForPassword(password);
  const expected = await adminTokenForPassword(env.ADMIN_PASSWORD);
  if (submitted !== expected) return error("Incorrect password.", 401);
  return json(
    { ok: true },
    200,
    { "set-cookie": makeAdminCookie(submitted, request.url) },
  );
}

async function setVisibility(request: Request, env: Env, id: string): Promise<Response> {
  if (!(await isAdminRequest(request, env.ADMIN_PASSWORD))) return error("Unauthorized.", 401);
  const body = await readJson(request);
  if (typeof body?.hidden !== "boolean") return error("Visibility value is required.");
  const result = await env.DB.prepare("UPDATE photos SET hidden = ? WHERE id = ?")
    .bind(body.hidden ? 1 : 0, id)
    .run();
  if (!result.meta.changes) return error("Photo not found.", 404);
  return json({ ok: true, hidden: body.hidden });
}

async function deletePhoto(request: Request, env: Env, id: string): Promise<Response> {
  if (!(await isAdminRequest(request, env.ADMIN_PASSWORD))) return error("Unauthorized.", 401);
  const row = await env.DB.prepare("SELECT image_key, thumb_key FROM photos WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ image_key: string; thumb_key: string }>();
  if (!row) return error("Photo not found.", 404);
  await env.PHOTOS.delete([row.image_key, row.thumb_key]);
  await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    try {
      await ensureSchema(env.DB);

      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({ ok: true, adminConfigured: Boolean(env.ADMIN_PASSWORD) });
      }
      if (url.pathname === "/api/photos" && request.method === "GET") return listPhotos(env);
      if (url.pathname === "/api/photos" && request.method === "POST") return initUpload(request, env);

      const uploadMatch = url.pathname.match(/^\/api\/uploads\/([0-9a-f-]{36})\/(image|thumb)$/);
      if (uploadMatch && request.method === "PUT") {
        return uploadPart(request, env, uploadMatch[1], uploadMatch[2] as "image" | "thumb");
      }

      const photoMatch = url.pathname.match(/^\/api\/photos\/([0-9a-f-]{36})\/(image|thumb)$/);
      if (photoMatch && request.method === "GET") {
        return servePhotoPart(request, env, photoMatch[1], photoMatch[2] as "image" | "thumb");
      }

      if (url.pathname === "/api/admin/session" && request.method === "GET") return adminSession(request, env);
      if (url.pathname === "/api/admin/login" && request.method === "POST") return adminLogin(request, env);
      if (url.pathname === "/api/admin/logout" && request.method === "POST") {
        return json({ ok: true }, 200, { "set-cookie": clearAdminCookie(request.url) });
      }
      if (url.pathname === "/api/admin/photos" && request.method === "GET") {
        if (!(await isAdminRequest(request, env.ADMIN_PASSWORD))) return error("Unauthorized.", 401);
        return listPhotos(env, true);
      }

      const visibilityMatch = url.pathname.match(/^\/api\/admin\/photos\/([0-9a-f-]{36})\/visibility$/);
      if (visibilityMatch && request.method === "POST") return setVisibility(request, env, visibilityMatch[1]);

      const deleteMatch = url.pathname.match(/^\/api\/admin\/photos\/([0-9a-f-]{36})$/);
      if (deleteMatch && request.method === "DELETE") return deletePhoto(request, env, deleteMatch[1]);

      return error("Not found.", 404);
    } catch (cause) {
      console.error("WeddingPhotoBooth API error", cause);
      return error("The photo booth hit an unexpected error.", 500);
    }
  },
} satisfies ExportedHandler<Env>;
