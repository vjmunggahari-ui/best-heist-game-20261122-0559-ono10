# Velvet Vault — The Meridian Heist

[![bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/vjmunggahari-ui/best-heist-game-20261122-0559-ono10/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/vjmunggahari-ui/best-heist-game-20261122-0559-ono10/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A complete top-down stealth heist game that runs offline in a desktop
browser from static files. You are Wren, a thief working three floors of
the Meridian estate in one night: lift the Golden Idol, pick the vault for
the Meridian Star, then grab the last paintings and reach the getaway van —
all before the alarm hits 100.

## How to play

Serve `game/` with any static server (for example
`python3 -m http.server` inside `game/`) and open `index.html` in desktop
Chrome. No network request is made; all art and sound are drawn and
synthesized in code.

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| SHIFT | Sprint (fast, loud — guards hear you) |
| C | Sneak (slow, quiet, harder to spot in shadows) |
| 1 or mouse click | Toss a coin to lure a guard to that spot |
| 2 | Drop a smoke bomb that blinds cones |
| E (hold) | Pick the vault lock |
| M | Mute |
| ENTER / R | Start, advance floors, retry |

## The heist

- **Guards** patrol waypoints with sweeping vision cones. Being seen
  raises suspicion (`?`), a full spot (`!`) jumps the alarm and sends the
  guard chasing. Breaking line of sight cools everything down.
- **Cameras** sweep their arcs and feed the alarm directly while you are
  in the cone. Smoke blinds both.
- **Shadow tiles** hide a still thief; sprinting draws a visible noise
  ring the guards can hear.
- **Loot** is worth score: gold $150, paintings $300, the Golden Idol
  $600, the Meridian Star $1,200. The target must be secured before the
  exit opens, and a time bonus rewards a fast, quiet run.
- **The alarm meter** is the tension dial: it climbs while anyone sees
  you, decays while you are unseen, and at 100 the museum locks down.

Three floors, rising heat: the Gilded Gallery, the Vault Hall (pick the
vault door to reach the Star), and the Rooftop Getaway (the alarm starts
at 25 and the van is waiting).

## Structure

- `main.ts` — the hand-in program (Node 22 stdlib only): copies `game/`
  and `screenshots/` to `$MAKEFUN_OUTPUT_DIR` and writes `dossier.json`
  with the kit's vendored library, then reads the dossier back and
  verifies it byte for byte.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `game/index.html` + `game/src/` — the game, split by job:
  `config.js` (tuning + palette), `levels.js` (three floors, BFS
  pathfinding), `player.js` (the thief), `guards.js` (patrol + suspicion
  + chase), `cameras.js` (sweep + detection), `vision.js` (cones + line
  of sight), `loot.js`, `alarm.js`, `audio.js` (synthesized sound, no
  files), `input.js`, `render.js`, `shots.js` (deterministic screenshot
  staging via `?shot=start|play|vault|escape`), `main.js` (loop + rules),
  `rng.js` (seeded RNG).
- `screenshots/` — four real renders of the game's own code: the title,
  the gallery heist, the vault lockpick, and the rooftop getaway.

## License

MIT — see `LICENSE`.
