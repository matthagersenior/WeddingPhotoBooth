const encoder = new TextEncoder();

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return rawValue.join("=");
    }
  }
  return null;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function adminTokenForPassword(password: string): Promise<string> {
  return sha256Hex(`wedding-photo-booth-admin:${password}`);
}

export async function isAdminRequest(request: Request, password?: string): Promise<boolean> {
  if (!password) return false;
  const cookie = getCookie(request, "admin_session");
  if (!cookie) return false;
  return cookie === (await adminTokenForPassword(password));
}

export function makeAdminCookie(token: string, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`;
}

export function clearAdminCookie(requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
