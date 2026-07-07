import { getSessionUser } from "@/lib/auth/session";
import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import { getConsent } from "@/lib/patAssistant/consent";
import PatConsentPanel from "./PatConsentPanel";

/**
 * Server wrapper for the Pat consent panel. Renders only when Pat is enabled AND
 * a user is signed in, so the shared Meet Pat surface can include it
 * unconditionally: it returns null on public/unauthenticated views and while the
 * flag is off, keeping the foundation dark by default.
 */
export default async function PatConsentPanelMount() {
  if (!isPatAssistantEnabled()) {
    return null;
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }
  const state = await getConsent(sessionUser.id);
  return <PatConsentPanel initialOptedIn={state.optedIn} />;
}
