import fs from "fs";
import path from "path";
import {
  getInviteTerminalState,
  isInviteClaimSatisfied,
} from "../lib/network/inviteCodes.ts";

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function main() {
  const now = new Date("2026-03-15T00:00:00.000Z");

  assert(
    getInviteTerminalState(
      {
        status: "ACTIVE",
        expiresAt: new Date("2026-03-14T00:00:00.000Z"),
        claimCount: 0,
        maxClaims: 1,
      },
      now
    ) === "EXPIRED",
    "expired invites must classify as EXPIRED"
  );

  assert(
    getInviteTerminalState(
      {
        status: "REVOKED",
        expiresAt: null,
        claimCount: 0,
        maxClaims: 1,
      },
      now
    ) === "REVOKED",
    "revoked invites must classify as REVOKED"
  );

  assert(
    getInviteTerminalState(
      {
        status: "ACTIVE",
        expiresAt: null,
        claimCount: 1,
        maxClaims: 1,
      },
      now
    ) === "EXHAUSTED",
    "fully consumed invites must classify as EXHAUSTED"
  );

  assert(
    isInviteClaimSatisfied({
      existingRelationship: {
        status: "ACTIVE",
        launchMode: "PRIVATE_LAUNCH",
        productAccessMode: "ALL_PRODUCTS",
      },
      inviteCode: {
        status: "ACTIVE",
        launchMode: "PRIVATE_LAUNCH",
        productAccessMode: "ALL_PRODUCTS",
      },
    }),
    "matching active relationship should satisfy repeat claim idempotency"
  );

  assert(
    !isInviteClaimSatisfied({
      existingRelationship: {
        status: "PAUSED",
        launchMode: "PRIVATE_LAUNCH",
        productAccessMode: "ALL_PRODUCTS",
      },
      inviteCode: {
        status: "ACTIVE",
        launchMode: "PRIVATE_LAUNCH",
        productAccessMode: "ALL_PRODUCTS",
      },
    }),
    "non-active relationships must not satisfy invite claims"
  );

  const claimRoute = read("app/api/network/invite-codes/claim/route.ts");

  assert(
    claimRoute.includes("getInviteTerminalState") &&
      claimRoute.includes("isInviteClaimSatisfied"),
    "claim route must use shared invite lifecycle helpers"
  );
  assert(
    claimRoute.includes("updateMany") &&
      claimRoute.includes("claimCount: inviteCode.claimCount"),
    "claim route must consume invite slots atomically"
  );
  assert(
    claimRoute.includes('status: 404 as const, error: "Invite code not found"') &&
      claimRoute.includes('error: "Invite code has expired"') &&
      claimRoute.includes('error: "Invite code has been revoked"') &&
      claimRoute.includes('error: "Invite code is no longer claimable"'),
    "claim route must preserve clear 404/403 lifecycle responses"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "terminal invite states",
          "repeat claim idempotency",
          "atomic claim consumption",
          "clear invite lifecycle responses",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_INVITE_CODE_LIFECYCLE_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
