import RoleSignInPage from "@/app/components/pat/RoleSignInPage";

export const metadata = {
  title: "User Sign In | C2Acct",
  description: "User entry route for PAT.",
};

export default function UserSignInPage() {
  return <RoleSignInPage role="user" />;
}
