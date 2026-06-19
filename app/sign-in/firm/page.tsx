import RoleSignInPage from "@/app/components/pat/RoleSignInPage";

export const metadata = {
  title: "Firm Sign In | Patalign",
  description: "Firm entry route for PAT.",
};

export default function FirmSignInPage() {
  return <RoleSignInPage role="firm" />;
}
