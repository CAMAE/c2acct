# Mac Mini Setup Checklist (PAT Runtime)

Historical note: older host notes may still use "BUILD AAE" naming or an `aae` account label. PAT is the active product/runtime.

1. Enable FileVault
2. Enable Firewall
3. Create non-admin `aae` user if you are following the existing host-account convention
4. Install Xcode CLT
5. Install Homebrew
6. Install Node LTS + pnpm
7. Clone repo
8. `pnpm install`
9. `pnpm prisma:generate`
10. `pnpm build`
11. Configure staging env vars
12. Install runner (GitHub/OpenClaw)
