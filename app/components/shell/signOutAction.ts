"use server";

import { signOut } from "@/auth";

/**
 * R3 (box 2, 2026-09-11): the one sign-out action shared by the signed-in
 * header controls. AppShell keeps its own inline `signOutFromFooter` (pinned by
 * tests/app-shell.contract.test.ts); both call the same Auth.js signOut with
 * the same redirect, so the user path is identical from either shell.
 */
export async function signOutToHome() {
  await signOut({ redirectTo: "/" });
}
