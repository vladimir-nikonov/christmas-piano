# Target UX

Players are 6–10 years old. They play a physical keyboard; notes are recognised through the microphone. One screen, one task, one obvious next action. A child should understand where they are, what the game expects and how to carry on, with almost no reading.

## Navigation

Launch → restore the profile (ask who is playing only when needed) → game world → Play → countdown → game → reward → continue.

Starting, replaying, the next level and resuming after a pause take one tap; switching child takes two; changing the theme two or three; going home one or two. Granting microphone permission is the only exception.

## Screens and states

- **Home:** avatar, song, five levels (wood, stone, iron, gold, diamond) as one connected path left to right, the current level highlighted, locked levels dimmed with a lock but always visible, a big Play button, a secondary Listen button, unobtrusive settings. Select the current level automatically. Each level plays a set part of the song (the start, half or the whole song), shown on its tile as a sheet whose played lines are bold and the rest thin and grey; there is no separate length picker for the child. A one-line hint under the levels says what to do next and why home looks the way it does (a new level opened, three stars open the next one, after listening, a new or switched player, another song or level picked, nothing tapped for a while). The gesture carries the meaning (the lock leaves the new level, Play pulses, the goal star of the gauge pulses); the text is a caption that fades after a few seconds. Levels opened before stay available for replay. Levels open one by one by default (a parent can open them all).
- **Progress to the next level:** one game with three stars (85% or more) on the current level, at the level's own tempo and timing, opens the next level. Stars: 1 from 50%, 2 from 70%, 3 from 85%; a perfect game (100%) shows one star with a pulsing halo instead of three. Under the level row stands the selected level's gauge, from nothing to the goal, between that level's block and the next one's, filled with its best result; the three star marks stand under the line, so the child sees how much is missing without numbers. A soft beam of the theme's light joins the selected tile's edges to the gauge's edges, and the levels not selected are dimmed, so it is clear whose progress the gauge shows. The links between the tiles are filled up to the level being worked on. Each theme draws the path, the gauge and the beam its own way (`src/ui/progress.js`): Pixel Quest a dotted pixel road, a segmented XP bar and a stepped dashed beam; Music Buddies a soft tube, a glossy tube gauge and a soft beam; Winter Melody a footprint trail as links and as the gauge with a snowman walking along it, and a frosty white beam; Anime Music Academy thin glowing lines, a glowing beam gauge with a sparkle at its tip and a light beam with glowing edges. Everything in the middle of home (songs, the path, the hint, Play) stands on one framed card that strongly blurs the world behind it.
- **Levels:** each level adds one new skill and fades the help: Wood waits for each note, plays the start and shows every cue (hand and finger, lit key, note names, colours); Stone waits, plays the whole song, no hand; Iron is timed and slow, half the song, lit key and colours; Gold is timed, the whole song, colours only; Diamond is timed at the original tempo with only the notes. The player's options can hide a cue but never bring back one the level has faded (`src/core/levels.js`).
- **Entry:** the selected block grows, everything else fades out, the keyboard appears and a 3–2–1 countdown runs. No separate confirmation. Check the microphone before the countdown; if access is denied, show a clear action that restores it.
- **Game:** only the playback column on the left edge (Play/Pause and Home), progress, microphone status, the full-screen toggle, notes, the hit line and the keyboard. No settings, profiles, themes or difficulty. Note colours are the same in every theme.
- **Waiting:** not a separate page. Stop the notes, highlight the lane, the note and the key, show an arrow. The right note continues the game automatically. A wrong note gets soft feedback, never punishment.
- **Pause:** no popup. The frozen field dims; in the left playback column, as in a media player, Pause turns into a big Resume button and Replay appears above Home. Keep the time, note positions, the expected note, the score and the mode. Use a short countdown on resume when needed. Losing focus or the microphone pauses the game safely.
- **Input:** there is no input mode to choose. The microphone always listens for a real piano, and screen taps and the computer keyboard always count; a tap or key sounds its note and quiets the microphone for a moment so the speaker tone is not counted twice. The child can move between the piano, the screen and the keyboard mid-song without switching anything.
- **Results:** the last note turns into particles and stars; 0–3 stars, the accuracy as a small caption, progress. Stars are the only currency the child sees: no points or combo in the game; the best % and past results are in the parent table. 0–1 stars → replay; 2–3 stars without a new level → keep practising; a new level opened → play it; the last level → play again. Home and Replay are secondary and never duplicate the main action. The next game never starts automatically. The reward does not need to be dismissed.
- **Together (party):** opened from the team button next to the avatar on home. Several children share the tablet as one team, never against each other. Setup picks the players (every saved player is picked at first; a new one can be made from there and comes back picked), the song and 1–5 rounds, then the order is drawn and shown one player at a time; it stays for the whole party. A round is one turn per player; a turn is three tries of the player's own current level of that song, so children of different levels help equally. Between turns a hand-over screen shows whose turn it is, in that child's theme and language, with one big Play. The two best tries of each turn (% of notes played right) go to one shared team bank: one bar filled in each player's colour, with star marks where bigger fireworks start. After the third try the turn's result passes the tablet on by itself after a few seconds. At the end the whole team gets fireworks sized by the share of the maximum collected (sparklers below 50%, fireworks from 50%, big fireworks from 75%, golden fireworks from 90%). Stopping early judges only the turns played, so it never takes the fireworks away. Home from a paused try leaves only that try; each try still counts for the child's own stars and levels (`src/core/party.js`, `src/ui/screens/party.js`).
- **Profiles:** opened from the avatar; restores the child's own progress, theme, songs and settings. The theme does not affect progress.
- **Settings:** a service panel over the world: tempo, timing tolerance, latency and microphone sensitivity, note labels, difficulty, a reset with confirmation and protection against accidental taps. The panel can be set up for any player (adults play too): a songs × levels table shows each level's length, best stars and %, and the current level; tapping a cell changes that level's length for that song.

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
