import app from "./index";

interface Env {
  DB?: D1Database;
  PHOTOS?: R2Bucket;
  ADMIN_PASSWORD?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      const result: {
        ok: boolean;
        bindings: { db: boolean; photos: boolean };
        db: { ok: boolean; error?: string };
        r2: { ok: boolean; error?: string };
        adminConfigured: boolean;
      } = {
        ok: false,
        bindings: { db: Boolean(env.DB), photos: Boolean(env.PHOTOS) },
        db: { ok: false },
        r2: { ok: false },
        adminConfigured: Boolean(env.ADMIN_PASSWORD),
      };

      if (!env.DB) {
        result.db.error = "DB binding is missing";
      } else {
        try {
          await env.DB.prepare("SELECT 1 AS ok").first();
          result.db.ok = true;
        } catch (error) {
          result.db.error = message(error);
        }
      }

      if (!env.PHOTOS) {
        result.r2.error = "PHOTOS binding is missing";
      } else {
        try {
          await env.PHOTOS.list({ limit: 1 });
          result.r2.ok = true;
        } catch (error) {
          result.r2.error = message(error);
        }
      }

      result.ok = result.db.ok && result.r2.ok;
      return json(result, result.ok ? 200 : 503);
    }

    return app.fetch(request, env as Parameters<typeof app.fetch>[1]);
  },
} satisfies ExportedHandler<Env>;
