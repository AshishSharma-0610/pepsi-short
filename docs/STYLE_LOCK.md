# STYLE LOCK: what this project fixes, and what a new story changes

This project is an approved result in the `cartoon-3d-ytshort` style (flat 2D characters in a painted, ink-lined 3D world, Remotion + three.js).
Use it as the template for every new short. **Locked = copy unchanged. Rewrite = new for each story.**

## LOCKED (do not edit; copy into the next project as is)
| File | What it fixes |
|---|---|
| `src/videos/pepsi/ink.ts` | world ink: ~3 px geometry-edge lines, constant width, plum not black, NOINK layer for cards/effects |
| `lensblur.ts` | thin-lens depth of field (cInf / focus model) |
| `grade.ts` | tone map + colour grade + bloom feel |
| `shade.ts`, `cardshade.ts` | two-tone world shading, character-card shading, contact blobs |
| `paint.ts` | painted canvas textures (`ctex`, `rep`, `rng`) |
| `lights.ts` | the two light presets (day, golden) incl. camera-relative sun. Only the fog distances were adapted for an interior. |
| `toon.ts` (top part) | the 2D character system: bean head, 3.5 head-heights, stick limbs, ink-dot hands, plum outline, expressions, blink, `Pen`, core fx (burst, stars, puff, shadow) |
| `Store.tsx` | composition: ink -> lens blur -> bloom -> tone map -> grade, shot crossfade, 4-frame white flash, **captions** |
| `story.ts` camera grammar | `glide` (smootherstep 18-40 f), `pushK` (0.15-0.35 %/f, punch ~0.6 %/f for 35 f), `kickAt` (7 f sign-flip kick), `dolly`, roll 4-5 deg, hard cut on a big reframe, reactions `LEAD` = 2 f before the word |
| `audio/dsp.py`, `instruments.py`, `sfx_gen.py`, `mix.py` chain | synth library; voice -16 LUFS, music -10 LU under voice and ducked 3 dB, SFX peak -7 LU, programme -14.5 LUFS, true peak <= -1.2 dBTP |
| `scripts/*`, `package.json`, `remotion.config.ts` | `npm run sync / stills / framing / render / mux / check / make`, pinned versions |
| Output | 1080x1920 @ 30 fps, rendered x1.3333 = 1440x2560, H.264 CRF 16, audio AAC 320k |
| Captions | ONE bold white word at a time, thick dark outline, lower-middle (27 % from the bottom), 3-frame pop-in, timed to `voice/words.json` |

## REWRITE PER STORY
1. `docs/SCRIPT.txt` (spoken words) and `voice/voice.mp3`, then `npm run sync` -> `voice/words.json` (+ `scripts/align_words.py` `SYL` table for odd words)
2. `story.ts`: the shot table (`SHOT_DEFS`: set, start word, light, camera keys, actors with expression cues, focus), prop animations (`propsAt`), kicks.
   Cues are words: `"Paris"`, `["But", 1]` (second occurrence). `timing.ts` needs no edit.
3. `sets.ts`: the places and props (procedural). `base.ts` (materials, textures, batching) is shared and stays.
4. `cast.ts` (the bottom `stage()`: effect cards per shot) and `world.ts` (pools of props; usually only the `mk(...)` pool list changes)
5. `toon.ts` bottom part: outfits (hairstyle, clothes, age, glasses, beard...), new props, new effect cards
6. `audio/music.py` (mood + chord per shot), `audio/sfx.py` (events on cue words), `audio/timeline.py` needs no edit
7. `docs/SHOTPLAN.md`

## Character variety (keep doing this)
Every character must differ in at least three of: hairstyle (`hairStyle`: short, side, curly, afro, bun, pony, long, mohawk, spiky, balding, bald),
age/build (`build`: kid, teen, adult, stout, elder; `wrinkles`, `freckles`), clothes (`jacket`, `pants`, `dress`, `tie`, `vest`, `stripe`, `collar`,
`scarf`, hats), face (`glasses`, `beard`, `moustache`) and expression range (`Expr`). See the cast table in `docs/SHOTPLAN.md`.

## Story rules from the skill (keep)
Hook = wide establishing shot; one story turn = a light/place change (day -> golden here) with an 8 f crossfade; every phrase illustrated literally;
no text in the picture except captions; reactions before their words; hard cuts on punch words; always run `npm run framing` after moving a camera.
Full study: `skill/references/STYLE_BIBLE.md` and `skill/references/reports/*.md`.

## Not verified by a render when this project was prepared
Type-check, webpack bundle, cue/camera sweep over all frames, audio generation and measurement were run. The user rendered it locally and approved the result.
