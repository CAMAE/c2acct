import { redirect } from "next/navigation";

export default function InviteeSignInPage() {
  redirect("/sign-in?error=invitee_retired");
}
