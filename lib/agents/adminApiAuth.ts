import { getAdminAccessState } from "@/lib/adminControlPlane";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";

export type AdminApiAuth = { ok: true; email: string } | { ok: false; response: Response };

/** Gate an agent API route behind the admin role. Returns the admin email or a response. */
export async function requireAdminApi(): Promise<AdminApiAuth> {
  const { sessionUser, isAdmin } = await getAdminAccessState();
  if (!sessionUser) {
    return { ok: false, response: unauthorizedResponse() };
  }
  if (!isAdmin) {
    return { ok: false, response: forbiddenResponse() };
  }
  return { ok: true, email: sessionUser.email ?? "admin" };
}
