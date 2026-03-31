type CookieGetter = {
  get(name: string): { value: string } | undefined;
};

type CookieSetter = {
  set(
    name: string,
    value: string,
    options: {
      expires: Date;
      httpOnly?: boolean;
      path: string;
      sameSite?: "lax";
      secure?: boolean;
    }
  ): void;
};

type AuthCookieSpec = {
  name: string;
  httpOnly: boolean;
  secure: boolean;
};

export const LOCAL_AUTH_COOKIE_SPECS: AuthCookieSpec[] = [
  { name: "authjs.session-token", httpOnly: true, secure: false },
  { name: "__Secure-authjs.session-token", httpOnly: true, secure: true },
  { name: "next-auth.session-token", httpOnly: true, secure: false },
  { name: "__Secure-next-auth.session-token", httpOnly: true, secure: true },
  { name: "authjs.callback-url", httpOnly: false, secure: false },
  { name: "__Secure-authjs.callback-url", httpOnly: false, secure: true },
  { name: "next-auth.callback-url", httpOnly: false, secure: false },
  { name: "__Secure-next-auth.callback-url", httpOnly: false, secure: true },
  { name: "authjs.csrf-token", httpOnly: false, secure: false },
  { name: "__Host-authjs.csrf-token", httpOnly: false, secure: true },
  { name: "next-auth.csrf-token", httpOnly: false, secure: false },
  { name: "__Host-next-auth.csrf-token", httpOnly: false, secure: true },
  { name: "authjs.pkce.code_verifier", httpOnly: true, secure: false },
  { name: "__Secure-authjs.pkce.code_verifier", httpOnly: true, secure: true },
  { name: "next-auth.pkce.code_verifier", httpOnly: true, secure: false },
  { name: "__Secure-next-auth.pkce.code_verifier", httpOnly: true, secure: true },
  { name: "authjs.state", httpOnly: true, secure: false },
  { name: "__Secure-authjs.state", httpOnly: true, secure: true },
  { name: "next-auth.state", httpOnly: true, secure: false },
  { name: "__Secure-next-auth.state", httpOnly: true, secure: true },
  { name: "authjs.nonce", httpOnly: true, secure: false },
  { name: "__Secure-authjs.nonce", httpOnly: true, secure: true },
  { name: "next-auth.nonce", httpOnly: true, secure: false },
  { name: "__Secure-next-auth.nonce", httpOnly: true, secure: true },
] as const;

export function getPresentLocalAuthCookies(cookieStore: CookieGetter) {
  return LOCAL_AUTH_COOKIE_SPECS
    .map((spec) => spec.name)
    .filter((name) => Boolean(cookieStore.get(name)?.value));
}

export function summarizeLocalAuthCookies(cookieNames: string[]) {
  return {
    hasSession: cookieNames.some((name) => name.includes("session-token")),
    hasCallback: cookieNames.some((name) => name.includes("callback-url")),
    hasPkce: cookieNames.some((name) => name.includes("pkce.code_verifier")),
    hasState: cookieNames.some((name) => name.endsWith(".state")),
    hasNonce: cookieNames.some((name) => name.endsWith(".nonce")),
  };
}

export function clearLocalAuthCookies(cookieJar: CookieSetter) {
  const expires = new Date(0);

  for (const spec of LOCAL_AUTH_COOKIE_SPECS) {
    cookieJar.set(spec.name, "", {
      expires,
      httpOnly: spec.httpOnly,
      path: "/",
      sameSite: "lax",
      secure: spec.secure,
    });
  }
}
