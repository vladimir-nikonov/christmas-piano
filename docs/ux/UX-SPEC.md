# Target UX

Players are 6–10 years old. They play a physical keyboard; notes are recognised through the microphone. One screen, one task, one obvious next action. A child should understand where they are, what the game expects and how to carry on, with almost no reading.

## Navigation

Launch → restore the profile (ask who is playing only when needed) → game world → Play → countdown → game → reward → continue.

Starting, replaying, the next level and resuming after a pause take one tap; switching child takes two; changing the theme two or three; going home one or two. Granting microphone permission is the only exception.

## Screens and states

- **Home:** avatar, song, five levels (wood, stone, iron, gold, diamond), the current level highlighted, locked levels dimmed with a lock, XP, a big Play button, a secondary Listen button, unobtrusive settings. Select the current level automatically; remember the song length and other parameters. Levels opened before stay available for replay.
- **Entry:** the selected block grows, everything else fades out, the keyboard appears and a 3–2–1 countdown runs. No separate confirmation. Check the microphone before the countdown; if access is denied, show a clear action that restores it.
- **Game:** only pause, progress, microphone status, score/stars, notes, the hit line and the keyboard. No settings, profiles, themes, home or difficulty. Note colours are the same in every theme.
- **Waiting:** not a separate page. Stop the notes, highlight the lane, the note and the key, show an arrow. The right note continues the game automatically. A wrong note gets soft feedback, never punishment.
- **Pause:** the frozen field under a dimmed overlay, a big Resume button, secondary Replay and Home. Keep the time, note positions, the expected note, the score and the mode. Use a short countdown on resume when needed. Losing focus or the microphone pauses the game safely.
- **Results:** the last note turns into particles and stars; 0–3 stars, accuracy, XP, progress. 0–1 stars → replay; 2–3 stars without a new level → keep practising; a new level opened → play it; the last level → play again. Home and Replay are secondary and never duplicate the main action. The next game never starts automatically. The reward does not need to be dismissed.
- **Profiles:** opened from the avatar; restores the child's own progress, theme, songs and settings. The theme does not affect progress.
- **Settings:** a service panel over the world: tempo, timing tolerance, latency and microphone sensitivity, note labels, difficulty, a reset with confirmation and protection against accidental taps.

## Spatial navigation

| Action | Transition |
|---|---|
| Entry | Zoom into the selected level |
| Home | Camera zooms out |
| Next level | Movement to the right |
| Replay | Short fade and reset |
| Pause | The frozen field dims |
| Resume | The dimming fades away |
| Profile | Expands from the avatar |
| Settings | Temporary panel |
| Reward | Notes turn into stars |

Ordinary transitions take 180–400 ms (entry 250–400 ms); rewards are short and skippable. Support reduced motion. Shared elements keep their position. One dominant button; secondary buttons are smaller and calmer. Target: outline, glow, pulse; unavailable: lock; success: particles; error: a soft signal. Never rely on colour alone. Touch targets are at least 64×64 logical units; check the physical size and spacing.

## Themes

- **Pixel Quest:** the block opens, the lock crumbles, pixel particles.
- **Music Buddies:** soft spring, zoom into the toy, puffy stars.
- **Winter Melody:** zoom into a lit square, new lanterns and decorations.
- **Anime Music Academy:** crystal portal, musical energy turns into stars and XP.

One mechanic and one navigation for every theme. Decorations never cover the notes.

## Architecture

A central state machine. Countdown, Waiting, Paused and LevelUp are contextual states, not separate pages. Keep navigation, the game session, the microphone, the profile, progress, the theme and animation apart. Guard against double taps and against overlapping timers and handlers; release audio resources. Back, leaving full screen, resize, going to the background and locking the screen must behave predictably. On pause, remember the state it came from, including the countdown.

## Tablet

Huawei MatePad 11: 2560×1600 physical, 16:10, base layout 1280×800. Read the CSS viewport and DPR at run time; nothing may be clipped or scroll. Check full screen, legibility from a distance, 60 FPS, the microphone and losing focus. HarmonyOS compatibility has not been confirmed on a real device.
