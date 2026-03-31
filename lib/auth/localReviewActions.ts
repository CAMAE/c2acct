import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { findLocalReviewUserByEmail } from "@/lib/auth/localReview";

function getSingleFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeRedirect(target: string) {
  return target.startsWith("/") ? target : "/";
}

function sanitizeView(target: string) {
  return target === "vendor" || target === "firm" || target === "individual" || target === "admin"
    ? target
    : "vendor";
}

export async function signInWithLocalReviewCredentials(formData: FormData) {
  "use server";

  const email = getSingleFormValue(formData.get("email")).toLowerCase();
  const password = getSingleFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirect(getSingleFormValue(formData.get("redirectTo")) || "/");
  const source = getSingleFormValue(formData.get("source")) || "login";
  const view = sanitizeView(getSingleFormValue(formData.get("view")) || "vendor");

  if (!findLocalReviewUserByEmail(email)) {
    redirect(`/${source}?view=${view}&error=local_review_invalid`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/${source}?view=${view}&error=local_review_invalid`);
    }

    throw error;
  }
}
