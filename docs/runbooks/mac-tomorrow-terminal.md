# MAC MINI TOMORROW (paste into Terminal)
# 1) xcode-select --install
# 2) /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# 3) brew install node pnpm git
# 4) mkdir -p ~/dev && cd ~/dev
# 5) git clone git@github.com:CAMAE/c2acct.git
# 6) cd c2acct && git switch chore/ci-add-checks
# 7) pnpm install
# 8) pnpm -s build
# 9) create .env.local (staging) + set DATABASE_URL (managed Postgres preferred)
