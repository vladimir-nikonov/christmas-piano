# Gap analysis against the UX spec (2026-11-24)

A first pass over the code against [UX-SPEC.md](UX-SPEC.md) and [ACCEPTANCE.md](ACCEPTANCE.md). Evidence is from reading the code unless marked otherwise; nothing here was tested on a real MatePad or under HarmonyOS. Each gap is tracked as a GitHub issue with the label `ux`.

## What already matches

- Launch restores the last player (`db.current`); the player picker appears only when there is no profile.
- Play is one tap once the microphone is allowed; the microphone is checked before the count-in starts.
- Waiting (wood level) stops the notes on the screen without changing it; the right note continues automatically.
- Each player has independent progress; the theme is per player and does not touch progress.
- Note colours (`PC_COLOR`) are the same in every theme; decorations are drawn under the notes.
- Settings are a panel over home; reset and delete need a second tap within 3 s.
- CSS honours `prefers-reduced-motion`; layout scales from the 1280×800 design grid with live viewport and DPR.

## Gaps

| Issue | Priority | Area | Gap |
|---|---|---|---|
| [#9](https://github.com/vladimir-nikonov/christmas-piano/issues/9) | P0 | Pause, Back | Android Back leaves the app mid-game; pause shows theme/language; no count-in on resume; no auto-pause on blur, full-screen exit or mic loss; no double-tap guards |
| [#8](https://github.com/vladimir-nikonov/christmas-piano/issues/8) | P1 | Results | Two dominant buttons after most games; the main action does not depend on stars or level-up; weak level-up and reward |
| [#10](https://github.com/vladimir-nikonov/christmas-piano/issues/10) | P1 | Waiting | Lane not highlighted; key hint depends on a parent setting; a wrong note pops a cross |
| [#11](https://github.com/vladimir-nikonov/christmas-piano/issues/11) | P1 | Microphone | A denied microphone shows a line of text only: no retry, no hint per error, no screen-taps fallback |
| [#12](https://github.com/vladimir-nikonov/christmas-piano/issues/12) | P2 | Motion, tablet | Canvas ignores reduced motion; HUD buttons are 58 units (< 64); clipping on short viewports not checked |
| [#13](https://github.com/vladimir-nikonov/christmas-piano/issues/13) | P2 | Home, entry | Current level not distinguished; selection does not follow the song's current level; instant cut instead of zoom-in entry; busy corner buttons |
| [#14](https://github.com/vladimir-nikonov/christmas-piano/issues/14) | P2 | Architecture | No central state machine; deferred until the fixes above land (the brief forbids a mass refactor before agreement) |
| [#15](https://github.com/vladimir-nikonov/christmas-piano/issues/15) | P3 | Themes | Theme-specific transitions and rewards; deferred until the base transitions exist |

#8–#13 touch mostly separate files, so they can be built in parallel, one worktree each; [AGENT-AUDIT.md](AGENT-AUDIT.md) is the brief for a deeper audit, including watching children play.
