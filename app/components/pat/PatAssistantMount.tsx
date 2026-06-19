import { isPatAssistantEnabled } from "@/lib/patAssistant/flags";
import PatAssistant from "./PatAssistant";

/**
 * Server wrapper that renders the Pat widget only when PAT_ENABLE_PAT_ASSISTANT
 * is on. Layouts can include <PatAssistantMount /> unconditionally — it returns
 * null while the flag is off, so the foundation stays dark by default.
 */
export default function PatAssistantMount() {
  if (!isPatAssistantEnabled()) {
    return null;
  }
  return <PatAssistant />;
}
