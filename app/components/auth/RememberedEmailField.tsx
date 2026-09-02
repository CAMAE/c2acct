"use client";

import { useState } from "react";

/**
 * Sign-in email field that remembers the email across visits — and NEVER the
 * password.
 *
 * Closes the July commitment's second half. The asymmetry is the whole design:
 * an email is a convenience worth persisting, a password is a credential and is
 * never written anywhere by this component. There is no code path here that
 * reads or stores a password field.
 *
 * Storage is `localStorage` on the visitor's own device, per origin. It is not
 * an identity, is never sent anywhere, and is cleared by clearing site data. It
 * is wrapped in try/catch at every access because private windows, cleared site
 * data, and browsers configured to block storage all throw rather than returning
 * null — and a sign-in form that crashes because it could not remember an email
 * is worse than one that simply does not remember it.
 *
 * PRECEDENCE, and it matters: a `defaultValue` handed in by the server always
 * wins. That value is the email carried back after a FAILED attempt, which is
 * both more recent and more relevant than anything remembered from a previous
 * visit — restoring the older one over it would silently undo the correction the
 * person just made.
 */

const STORAGE_KEY = "pat.signin.email";

function readRemembered(): string | null {
  // `typeof window` guards the server render; the try/catch guards private
  // windows, cleared site data, and browsers configured to block storage, all
  // of which THROW rather than returning null. A sign-in form that crashes
  // because it could not remember an email is worse than one that does not.
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(email: string): void {
  try {
    const trimmed = email.trim();
    if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — the form still works, it just does not remember.
  }
}

export default function RememberedEmailField({
  defaultValue,
  autoComplete,
  placeholder,
  className = "pat-input",
  name = "email",
  required = true,
}: {
  /** Server-supplied value (e.g. the email carried back after a failed attempt). */
  defaultValue?: string;
  /**
   * Passed through unchanged rather than chosen here. The two sign-in forms
   * deliberately differ — see the Phase 2.5 #11 note on the pilot form — and
   * this component must not quietly override that decision.
   */
  autoComplete: string;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
}) {
  // Lazy initialiser rather than an effect: the remembered value is known
  // synchronously on first client render, so setting state from an effect would
  // both trip react-hooks/set-state-in-effect and render one frame with an empty
  // field before filling it.
  //
  // A server-supplied defaultValue always wins. That value is the email carried
  // back after a FAILED attempt — more recent and more relevant than anything
  // remembered from a previous visit, so restoring the older one over it would
  // silently undo the correction the person just made.
  const [value, setValue] = useState(() => defaultValue ?? readRemembered() ?? "");

  return (
    <input
      name={name}
      type="email"
      autoComplete={autoComplete}
      className={className}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      // Persist on blur and on submit rather than on every keystroke: a
      // half-typed address written to storage would be restored on the next
      // visit as if it were a real one.
      onBlur={(event) => remember(event.target.value)}
    />
  );
}
