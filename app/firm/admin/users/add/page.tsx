import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  FIRM_ACCESS_ROLES,
  createFirmManagedUser,
  normalizeFirmAdminUserInput,
  requireFirmAdminActor,
} from "@/lib/firmAdminAccess";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  created?: string;
};

function decodeMessage(value: string | undefined) {
  return value ? decodeURIComponent(value) : null;
}

export default async function FirmAdminAddUserPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const firm = await requireFirmAdminActor(sessionUser);
  if (!firm) {
    redirect("/firm");
  }

  const params = searchParams ? await searchParams : undefined;
  const errorMessage = decodeMessage(params?.error);

  async function addUser(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveFirm = await requireFirmAdminActor(actor);
    if (!liveFirm) {
      redirect("/firm");
    }

    const parsed = normalizeFirmAdminUserInput(formData);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Complete the required fields before adding a user.";
      redirect(`/firm/admin/users/add?error=${encodeURIComponent(message)}`);
    }

    const result = await createFirmManagedUser(liveFirm.id, parsed.data);
    if (!result.ok) {
      redirect(`/firm/admin/users/add?error=${encodeURIComponent(result.error)}`);
    }

    redirect("/firm/admin/users?created=1");
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Add User</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Add PAT access for {firm.name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Create a firm PAT access record with the profile fields needed for sane onboarding. This flow is PAT-specific and does not imply external identity sync exists.
        </p>
        {errorMessage ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Firm onboarding form</div>
        <form action={addUser} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="name" className="pat-input" placeholder="Full name" required />
          <input name="email" type="email" className="pat-input" placeholder="name@firm.com" required />
          <input name="phone" className="pat-input" placeholder="Phone" required />
          <input name="title" className="pat-input" placeholder="Title" required />
          <input name="department" className="pat-input" placeholder="Department" />
          <select name="role" className="pat-input" defaultValue="MEMBER">
            {FIRM_ACCESS_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <textarea
            name="onboardingNote"
            className="pat-textarea md:col-span-2"
            rows={4}
            placeholder="Optional PAT onboarding context"
          />
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button type="submit" className="pat-button-primary">
              Add PAT user
            </button>
            <Link className="pat-button-secondary" href="/firm/admin/users">
              Existing users
            </Link>
            <Link className="pat-button-secondary" href="/firm/admin">
              Back to admin
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
