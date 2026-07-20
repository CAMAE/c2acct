import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next-auth so importing the action doesn't drag next/server into the node
// test env; the action and this test then share ONE AuthError class (instanceof).
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

/**
 * Block 17 · A3 — lock the provisioned-pilot sign-in server action's redirect
 * branches so it can never return a silent no-error state again:
 *   success  → redirect(finalRedirect)  (the A2 fix — same-origin, not AUTH_URL)
 *   invalid  → redirect(...error=pilot_password_invalid...)
 *   missing  → redirect(...error=pilot_password_missing...)
 *   mustChangePassword → redirect(/sign-in/password-update...)
 */

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/auth", () => ({ signIn: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { user: { findFirst: vi.fn() } } }));
vi.mock("@/lib/security/authRateLimit", () => ({ checkAuthRateLimit: vi.fn(async () => true) }));

import { AuthError } from "next-auth";
import { signInWithPilotCredentials } from "@/lib/auth/pilotPasswordActions";
import { signIn } from "@/auth";
import prisma from "@/lib/prisma";
import { checkAuthRateLimit } from "@/lib/security/authRateLimit";

const mockSignIn = vi.mocked(signIn);
const mockFindFirst = vi.mocked(prisma.user.findFirst);
const mockRateLimit = vi.mocked(checkAuthRateLimit);

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function captureRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof RedirectSignal) return e.url;
    throw e;
  }
  throw new Error("action returned without redirecting — this is the silent no-error bounce");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockResolvedValue(true);
  mockFindFirst.mockResolvedValue({ mustChangePassword: false, passwordHash: "scrypt$..." } as never);
});

describe("signInWithPilotCredentials redirect branches", () => {
  it("valid creds ALWAYS redirect to the target (no silent no-error return)", async () => {
    mockSignIn.mockResolvedValue(undefined as never);
    const url = await captureRedirect(() =>
      signInWithPilotCredentials(form({ email: "demo@x.com", password: "pw", view: "firm", redirectTo: "/firm" }))
    );
    expect(url).toBe("/firm");
  });

  it("mustChangePassword routes to the password-update flow", async () => {
    mockFindFirst.mockResolvedValue({ mustChangePassword: true, passwordHash: "scrypt$..." } as never);
    mockSignIn.mockResolvedValue(undefined as never);
    const url = await captureRedirect(() =>
      signInWithPilotCredentials(form({ email: "demo@x.com", password: "pw", view: "firm", redirectTo: "/firm" }))
    );
    expect(url).toMatch(/^\/sign-in\/password-update\?returnTo=/);
  });

  it("invalid creds redirect WITH the error param (never silent)", async () => {
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"));
    const url = await captureRedirect(() =>
      signInWithPilotCredentials(form({ email: "demo@x.com", password: "bad", view: "firm", redirectTo: "/firm" }))
    );
    expect(url).toContain("error=pilot_password_invalid");
    expect(url).toContain("view=firm");
  });

  it("missing password redirects with the missing-credentials error", async () => {
    const url = await captureRedirect(() =>
      signInWithPilotCredentials(form({ email: "demo@x.com", view: "firm" }))
    );
    expect(url).toContain("error=pilot_password_missing");
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("does not swallow a non-auth error as a silent success", async () => {
    mockSignIn.mockRejectedValue(new Error("db exploded"));
    await expect(
      signInWithPilotCredentials(form({ email: "demo@x.com", password: "pw", view: "firm", redirectTo: "/firm" }))
    ).rejects.toThrow("db exploded");
  });
});
