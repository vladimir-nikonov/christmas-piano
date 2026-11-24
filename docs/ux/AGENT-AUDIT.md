# Agent brief: UX/UI audit

Act as a senior UX/UI designer, game UX designer, specialist in educational interfaces for children and frontend architect. Study [UX-SPEC.md](UX-SPEC.md), [ACCEPTANCE.md](ACCEPTANCE.md) and [navigation.mmd](navigation.mmd), then the whole project (HTML/CSS/JS/JSON/SVG) and its documentation. Do not rewrite the app in the first stage. Prepare a prioritised list of fixes.

## What to check

1. Inventory the actual screens, states, actions, transitions, automatic conditions, tap counts, duplication, dead ends, lost context, saved state and differences between themes. Documentation is not proof of implementation.
2. Map every scenario to UX-SPEC.md: launch, profile, home, listening, microphone, countdown, game, waiting, pause, results, reward, next level, settings.
3. Check visual hierarchy, consistency of symbols and positions, spatial transitions, minimum touch targets, contrast, legibility from a distance, absence of decorative noise, reduced-motion mode.
4. Check profile restore, independent progress, theme changes, saving the game session, correctness of automatic transitions and contextual states.
5. Check synchronisation of game time, microphone, audio and animation; repeated taps, timers, handlers, releasing resources, denied permissions, losing the microphone, background, Back, full screen and resize.
6. Check all four themes at the target size and at the actual viewport/DPR. Do not claim HarmonyOS compatibility without a test.

## Report

- Executive summary.
- AS-IS and TO-BE maps.
- Unnecessary screens and actions; elements to remove, merge, hide or move.
- Transition table: source state, event, condition, target state, effect, error recovery.
- Problems of each theme; proposals for animation and spatial navigation.
- Prioritised backlog, implementation stages, acceptance criteria, manual and automated tests.

For every problem: ID, P0–P3, screen/state, file/function/lines, actual behaviour, why it gets in a child's way, the fix, expected behaviour, acceptance criterion, effort, dependencies and risks. Mark the evidence: confirmed in code, reproduced at run time, or hypothesis.

- **P0** — the game is blocked, progress is lost, a state cannot be reached.
- **P1** — a significant problem with understanding or playing.
- **P2** — convenience and visual consistency.
- **P3** — decorative improvement.

## Constraints

Do not add screens where a contextual state is enough. Do not complicate the interface for the sake of features. Do not create a separate mechanic per theme. Do not change the musical mechanic without a reason. Do not remove features without explaining the alternative. Do not do a mass refactor before the report is agreed.

The main criterion: a child starts practising on their own, understands which note is expected, finishes the song, gets the reward and carries on, with almost no reading. When watching children play, note pauses, searching for buttons, mistaken taps and calls for an adult.
