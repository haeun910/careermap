<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## IEUM version and deployment workflow

- The product name is 이음 (IEUM). Keep existing database paths, cookie names, and deployment environment keys compatible unless a migration is explicitly requested.
- Use the existing checkout; do not create a worktree unless requested.
- Work on `daily/YYYY-MM-DD`, using the user's current date in Asia/Seoul. Reuse the same day's branch for additional changes. Check local and remote branches before creating or switching; preserve user changes.
- Commit and push completed work to the dated branch. `main` is the production deployment branch: update it only after relevant tests and the production build pass. The user has authorized this ongoing workflow and deployment; routine commits, both pushes, and release tags do not need another confirmation.
- Before updating `main`, fetch and verify its latest history is included. Merge concurrent changes into the dated branch and revalidate as needed. Never force-push.
- Tag each production release as `release/YYYY-MM-DD.N` (N starts at 1 and increments on the same day), push the tag, and confirm Vercel deployed that commit. Leave the active checkout on the dated work branch.
- Administrator selection is server-only configuration. Never put the owner's email or credentials in this public repository. Do not grant roles from editable profiles or client requests. Test anonymous and ordinary-account denial as well as administrator success.
