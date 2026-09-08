export function getCookie(_request: Request, _name: string): string | null {
  throw new Error("not implemented");
}

export async function adminTokenForPassword(_password: string): Promise<string> {
  throw new Error("not implemented");
}

export async function isAdminRequest(_request: Request, _password?: string): Promise<boolean> {
  throw new Error("not implemented");
}
