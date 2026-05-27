import RoleSignInPage from "@/app/components/pat/RoleSignInPage";

export const metadata = {
  title: "Vendor Sign In | C2Acct",
  description: "Vendor entry route for PAT.",
};

export default function VendorSignInPage() {
  return <RoleSignInPage role="vendor" />;
}
