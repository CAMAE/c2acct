import { isPingsEnabled } from "@/lib/patAssistant/flags";
import NudgeButton from "./NudgeButton";

/**
 * Server wrapper for the nudge button — renders only when PAT_ENABLE_PINGS is on,
 * so consultant/admin views can include it unconditionally and it stays dark
 * until the ping system is enabled.
 */
export default function NudgeButtonMount(props: {
  companyId: string;
  audience: "firm" | "vendor";
  label?: string;
}) {
  if (!isPingsEnabled()) {
    return null;
  }
  return <NudgeButton {...props} />;
}
