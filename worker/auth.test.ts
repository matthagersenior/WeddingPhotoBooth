import { describe, expect, it } from "vitest";
import { adminTokenForPassword, getCookie, isAdminRequest } from "./auth";

describe("admin auth helpers", () => {
  it("reads a named cookie without confusing it with adjacent names", () => {
    const request = new Request("https://example.com", { headers: { cookie: "xadmin_session=nope; admin_session=right; theme=dark" } });
    expect(getCookie(request, "admin_session")).toBe("right");
  });
  it("creates a stable non-plaintext admin token", async () => {
    const token = await adminTokenForPassword("wedding-secret");
    expect(token).toHaveLength(64);
    expect(token).not.toContain("wedding-secret");
    expect(token).toBe(await adminTokenForPassword("wedding-secret"));
  });
  it("accepts only the matching password-derived cookie", async () => {
    const good = await adminTokenForPassword("correct horse");
    const request = new Request("https://example.com", { headers: { cookie: `admin_session=${good}` } });
    expect(await isAdminRequest(request, "correct horse")).toBe(true);
    expect(await isAdminRequest(request, "wrong horse")).toBe(false);
  });
});
