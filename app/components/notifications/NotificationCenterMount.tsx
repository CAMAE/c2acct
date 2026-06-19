import { isPingsEnabled } from "@/lib/patAssistant/flags";
import NotificationCenter from "./NotificationCenter";

/**
 * Server wrapper that renders the notification center only when PAT_ENABLE_PINGS
 * is on. Layouts can include it unconditionally — returns null while the flag is
 * off, so the ping system stays dark by default.
 */
export default function NotificationCenterMount() {
  if (!isPingsEnabled()) {
    return null;
  }
  return <NotificationCenter />;
}
