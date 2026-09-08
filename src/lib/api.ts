import type { CapturedPhoto } from "./capture";
import type { PhotoAlbum } from "./types";

type ApiErrorBody = { error?: string };

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body as T;
}

export async function listPhotos(admin = false): Promise<PhotoAlbum> {
  return requestJson<PhotoAlbum>(admin ? "/api/admin/photos" : "/api/photos");
}

export async function uploadPhoto(
  capture: CapturedPhoto,
  input: { filterId: string; guestName: string; message: string },
): Promise<string> {
  const initialized = await requestJson<{
    id: string;
    uploadToken: string;
    imageUploadUrl: string;
    thumbUploadUrl: string;
  }>("/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filterId: input.filterId,
      guestName: input.guestName,
      message: input.message,
      imageType: capture.imageBlob.type || "image/jpeg",
      thumbType: capture.thumbBlob.type || "image/jpeg",
      imageSize: capture.imageBlob.size,
      thumbSize: capture.thumbBlob.size,
    }),
  });

  const put = async (url: string, blob: Blob) => {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "content-type": blob.type || "image/jpeg", "x-upload-token": initialized.uploadToken },
      body: blob,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
      throw new Error(body.error || "Could not upload the photo.");
    }
  };

  await Promise.all([
    put(initialized.imageUploadUrl, capture.imageBlob),
    put(initialized.thumbUploadUrl, capture.thumbBlob),
  ]);
  return initialized.id;
}

export function getAdminSession() {
  return requestJson<{ configured: boolean; authenticated: boolean }>("/api/admin/session");
}

export function adminLogin(password: string) {
  return requestJson<{ ok: true }>("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export function adminLogout() {
  return requestJson<{ ok: true }>("/api/admin/logout", { method: "POST" });
}

export function setPhotoHidden(id: string, hidden: boolean) {
  return requestJson<{ ok: true; hidden: boolean }>(`/api/admin/photos/${id}/visibility`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hidden }),
  });
}

export function deletePhoto(id: string) {
  return requestJson<{ ok: true }>(`/api/admin/photos/${id}`, { method: "DELETE" });
}
