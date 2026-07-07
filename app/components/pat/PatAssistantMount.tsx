import { getSessionUser } from "@/lib/auth/session";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import PatAssistant from "./PatAssistant";

/**
 * Server wrapper that renders the Pat widget only when PAT_ENABLE_PAT_ASSISTANT
 * is on AND the signed-in user has opted in (Elite Sprint Block A). Layouts can
 * include <PatAssistantMount /> unconditionally — it returns null while the flag
 * is off, for signed-out visitors, or for users who have not consented, so the
 * foundation stays dark and opt-out by default.
 */
export default async function PatAssistantMount() {
  if (!isPatAssistantEnabled()) {
    return null;
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }
  if (!(await hasPatConsent(sessionUser.id))) {
    return null;
  }
  return <PatAssistant />;
}
