# Snezhnye Noty (Snowy Notes)

A keyboard/synthesizer trainer: notes fall onto the keys, the microphone listens and counts the hits. The melody is Jingle Bells, with 5 levels (from "the note waits for you" to the original tempo), per-child profiles, and progress saved in the browser.

Open: https://vladimir-nikonov.github.io/christmas-piano/

Plain JavaScript in native ES modules (`index.html` + `src/`), no build step. The interface is available in English, Polish, Ukrainian, Russian and Spanish. To run locally: `npm install`, `npm run serve`, open http://localhost:8080; `npm test` runs lint, unit tests and a headless browser smoke test.

Development workflow (one worktree per feature, commit and merge into `main`): [CLAUDE.md](CLAUDE.md).

## License

Free for personal and other non-commercial use. Any commercial use of the code or the ideas requires the author's written permission. See [LICENSE](LICENSE).
