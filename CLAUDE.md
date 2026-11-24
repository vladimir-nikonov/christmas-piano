# Developing Snezhnye Noty

The repository's working language is English: documentation, instructions, commit messages and code comments are written in English. Only the app's user-facing UI text stays in Russian.

The whole app is a single `index.html` file (vanilla JS, no build step). The site is published to GitHub Pages by the `.github/workflows/pages.yml` workflow: every push to `main` deploys `index.html` automatically, so anything merged into `main` and pushed reaches the kids' tablet within a minute. Deployment status is in the Actions tab; to redeploy manually, run `gh workflow run pages.yml`.

## One worktree per feature

Several sessions often work on the same `index.html` at the same time. To keep them from overwriting each other's changes, never develop directly in the main folder (`main`).

1. Create a branch and a worktree from a fresh `main`:
   ```bash
   git switch main && git pull
   git worktree add ../christmas_piano-<feature> -b feature/<feature> main
   ```
   From then on, all work happens only in `../christmas_piano-<feature>`.
2. Build the feature and check it in a browser, for example in headless Chrome via playwright-core. Open `index.html` from the worktree folder.
3. Commit to the feature branch. The commit must contain only this feature's files.
4. Pull the latest `main` and resolve conflicts in the feature branch, not in `main`:
   ```bash
   git fetch origin && git rebase origin/main
   ```
   After the rebase, quickly check again that the page opens without errors.
5. Merge into `main` and push (from the main folder):
   ```bash
   git switch main && git pull
   git merge --ff-only feature/<feature>
   git push origin main
   ```
   If `--ff-only` fails, `main` has moved ahead: go back to step 4.
6. Remove the worktree and the branch:
   ```bash
   git worktree remove ../christmas_piano-<feature>
   git branch -d feature/<feature>
   ```

A feature is done only once it is committed and merged into `main`. Uncommitted changes in the main folder, or a branch not merged into `main`, are unfinished work.

## What must not break

- The kids' data is stored in IndexedDB (`snezhnye-noty`, key `db`), with localStorage `snezhnye-noty-v2` as a fallback. When changing the data format, keep compatibility with old records and with backup files (`format: "snezhnye-noty-backup"`).
- Target device: Huawei MatePad 11, Chrome or Huawei Browser; Google services may be unavailable.
