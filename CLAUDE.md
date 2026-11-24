# Developing Snezhnye Noty

The repository's working language is English: documentation, instructions, commit messages and code comments are written in English. The app's user-facing UI is translated into English, Polish, Ukrainian, Russian and Spanish through one dictionary file per language in `src/i18n/` (`en.js`, `pl.js`, `uk.js`, `ru.js`, `es.js`; the language follows the browser and can be changed per player); add every new UI string to all five files. A unit test fails if a key is missing in any language.

The app is vanilla JS in native ES modules with no build step: `index.html` holds the markup and loads `src/styles.css` and `src/main.js`. The site is published to GitHub Pages by the `.github/workflows/pages.yml` workflow: every push to `main` runs the tests and then deploys `index.html` and `src/`, so anything merged into `main` and pushed reaches the kids' tablet within a minute or two. If the tests fail, nothing is deployed. Deployment status is in the Actions tab; to redeploy manually, run `gh workflow run pages.yml`.

## Code layout

```
index.html               markup of all screens
src/main.js              entry point: wiring and startup
src/core/                pure logic and data, no DOM: songs, levels, note names, pitch detection
src/data/                storage (IndexedDB + localStorage fallback) and backup files
src/game/                game session: timing, judging notes, score, main loop
src/input/               microphone and touch input; both call onPlayed(midi, atMs, source)
src/audio/               sound output: tones and metronome
src/ui/                  canvas drawing, themes, icons, art, language picker
src/ui/screens/          home, players, results, parent settings
src/i18n/                UI strings, one file per language
src/platform/            browser APIs that differ per platform (wake lock)
tests/unit/              node:test unit tests for core/, data/ and i18n/
tests/smoke.mjs          headless Chrome run through the main flows, including the microphone
```

Keep `src/core/` and `src/data/` free of DOM access so they stay testable in Node and reusable on a server or in a native shell. ES module bindings are read-only for importers: change another module's state through its setter (for example `setState`, `setDB`, `useLang`, `invalidateBg`).

## Running and testing

ES modules do not load from `file://`, so open the app through the local server:

```bash
npm install
npm run serve        # http://localhost:8080
npm test             # lint + unit tests + browser smoke test (uses the installed Google Chrome)
```

`npm run lint` catches a missing import (`no-undef`) or a write to another module's variable (`no-import-assign`). The smoke test drives the real app; set `CHROME_PATH` to use a Chrome binary other than the installed Google Chrome.

## One worktree per feature

Several sessions often work on the same files at the same time. To keep them from overwriting each other's changes, never develop directly in the main folder (`main`).

1. Create a branch and a worktree from a fresh `main`:
   ```bash
   git switch main && git pull
   git worktree add ../christmas_piano-<feature> -b feature/<feature> main
   ```
   From then on, all work happens only in `../christmas_piano-<feature>`.
2. Build the feature and check it in a browser: run `npm install` once in the worktree, then `npm run serve` and open the page, and run `npm test`. Extend `tests/smoke.mjs` or `tests/unit/` when the feature adds a flow or logic worth guarding.
3. Commit to the feature branch. The commit must contain only this feature's files.
4. Pull the latest `main` and resolve conflicts in the feature branch, not in `main`:
   ```bash
   git fetch origin && git rebase origin/main
   ```
   After the rebase, run `npm test` again.
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

## UX spec

The target UX, the acceptance checklist and the audit brief are in `docs/ux/` (start with `docs/ux/README.md`). UX changes are tracked as GitHub issues labelled `ux`; check a change against `docs/ux/UX-SPEC.md` and `docs/ux/ACCEPTANCE.md`.

## What must not break

- The kids' data is stored in IndexedDB (`snezhnye-noty`, key `db`), with localStorage `snezhnye-noty-v2` as a fallback. When changing the data format, keep compatibility with old records and with backup files (`format: "snezhnye-noty-backup"`).
- Target device: Huawei MatePad 11, Chrome or Huawei Browser; Google services may be unavailable.
