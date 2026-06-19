# LeapCreww — "While You Sleep" · Creative Brief & Implementation Plan

> A director's plan to turn the current feature-tour promo into a single-protagonist
> narrative film. Grounded in the existing Remotion codebase (`src/`). Every phase
> maps to real files and ships independently.

---

## 0. The verdict on what we have

The current 30s cut is **technically clean but narratively flat**. It opens on the logo,
then lists features (Spotlight) and shows the builder (Grid). There is a half-present
"Sarah Miller" thread, but it's never set up and never paid off. One flat cream palette
the whole way through means the film has **no emotional arc** — only a sequence of nice slides.

A big-agency spot doesn't catalog features. It tells one person's story and lets the
product be the turn in that story. That's the whole rewrite.

---

## 1. The idea (one line)

> **"While you sleep, LeapCreww answers."**

A founder is drowning in customer messages. She hands the thread to LeapCreww. The
machine works through the night — broadcasting, replying, routing, closing — and she
wakes up to a grown business. Product = the moment the chaos goes quiet.

**Protagonist:** Maya — founder of a small boutique brand (the user).
**Customer in the thread:** Sarah Miller (reuse existing asset, now with a real role).
**Antagonist:** the unread-message counter. The thing that never stops climbing.

---

## 2. Story arc (30s / 900f @ 30fps / 120 BPM)

A five-act structure replacing the current six flat scenes. Beat boundaries stay locked
to `make-beat.mjs` (bars of 60f). **Color carries the arc** — we open in a dark "problem"
palette and flood to light at the turn. That single move gives the film its spine.

| Act | Name | Frames | Time | Palette | Beat role |
|-----|------|--------|------|---------|-----------|
| I | **The Pile-Up** (tension) | 0–150 | 0–5s | Dark / ink | build |
| II | **The Leap** (the turn) | 150–270 | 5–9s | Light flood | main drop |
| III | **The Machine** (transformation) | 270–600 | 9–20s | Light | drop A/B |
| IV | **The Payoff** (proof) | 600–750 | 20–25s | Light, warm | breakdown |
| V | **Resolve** (brand + CTA) | 750–900 | 25–30s | Light | outro |

### Act I — The Pile-Up (0–5s)  ·  NEW scene `Pileup.tsx`
Dark screen. A single phone, face-up, **buzzing on the beat**. Notifications stack and
shove each other — "Is this in stock?", "Where's my order?", "Do you ship to…", "Hello??"
— the unread badge counting up fast: `12 → 47 → 213 → 891`. Type punches in:
*"Every message is a customer."* / beat / *"Every missed one is a sale."*
We end on the founder's hand reaching for a phone that won't stop. **This is the pain we
later resolve.** Without this act, nothing else lands.

### Act II — The Leap (5–9s)  ·  rework `LogoReveal.tsx`
On the drop, a **light-flood transition** wipes the dark away (the cream canvas literally
*is* relief). The buzzing cuts to silence for one held beat. The mark draws in, the
wordmark resolves, line: *"Put the thread on autopilot."* The existing reveal is good —
it just needs to be **earned by the dark before it** and entered via the flood, not a flash.

### Act III — The Machine (9–20s)  ·  rework `Spotlight.tsx` + `Grid.tsx`
The product at work, shown as **one continuous control-room move**, not three slides.
A virtual camera pans/zooms across a single wide canvas through three movements:
1. **Broadcast** — a campaign fires; a ripple radiates to thousands of contact dots. (Campaigns)
2. **Autopilot** — Sarah's thread; bot replies instantly, code applied, while typing dots pulse. (Chatbot)
3. **Route & hand-off** — the visual flow lights up the path, escalates the one query that needs a human. (Flows + Inbox)
Reuse the phone + node mockups, but connect them spatially so it reads as *one system*, not a gallery.

### Act IV — The Payoff (20–25s)  ·  NEW scene `Payoff.tsx`
Night. The founder asleep (silhouette / "Do Not Disturb"). Over her, the numbers climb
**by themselves** with spring overshoot: `Messages answered 891`, `Read rate 89.7%`,
`Revenue recovered +42%`, `Hours saved this week 37`. Line: *"While you sleep, LeapCreww works."*
This is the emotional payoff to Act I's pain — same counter, now working *for* her.

### Act V — Resolve (25–30s)  ·  rework `ComingSoon.tsx` + `EndCard.tsx`
*"A new era of conversion."* → brand lockup → tagline → **CTA** (currently missing entirely).
Add a real call to action: `leapcreww.com · Early access open` so the film asks for something.

---

## 3. The craft upgrades (what makes it "agency")

These are the techniques that separate a template from a film. Each becomes a reusable primitive.

1. **A virtual camera.** A single `<Camera>` wrapper driving `translate/scale` on a large
   world, so Act III moves *through* space instead of cutting between slides. This is the
   single biggest perceived-quality jump. → `components/Camera.tsx`
2. **Color as narrative.** Add a dark palette (`COLORS.dark*`) and a `<LightFlood>` transition
   on the Act I→II turn. The film should feel like dawn breaking. → `theme.ts`, `components/LightFlood.tsx`
3. **Match cuts, not flash cuts.** Replace the opaque `FlashCuts` punches with shared-element
   continuity — a phone screen in Act III becomes a dashboard panel; the unread counter in
   Act I is the same digits that climb in Act IV. Keep one strong impact flash for the drop only.
4. **A broadcast particle system.** The campaign send radiates animated dots/arcs to a contact
   field — the one "wow" motion beat. → `components/BroadcastRipple.tsx`
5. **Real device frames with parallax + subtle 3D tilt.** Promote the inline phone chassis to a
   `<DeviceFrame>` with a perspective tilt that reacts to the camera. → `components/DeviceFrame.tsx`
6. **Counters with personality.** A spring-overshoot `<Counter>` that ticks like a slot machine
   settling — used for the pain count (Act I) and the payoff (Act IV). → `components/Counter.tsx`
7. **Kinetic type system.** Extend `Kinetic.tsx` with a `Typewriter` (for the incoming messages)
   and a `WeightShift` reveal. Keep `MaskLine`/`SplitPop`.
8. **Sound shape.** Re-cut `make-beat.mjs` so the arrangement matches the acts: sparse/tense
   intro, a real drop at f150, a breakdown at f600, lifted outro. The visuals already key off
   this grid — the audio should tell the same story.
9. **`prefers-reduced-motion` + cleanup hygiene.** Gate the heaviest motion; this is a render
   target so it's mostly moot, but keep the primitives honest for the embedded `<Player>` case.

---

## 4. Implementation phases

Each phase is independently shippable and ends green on the gates (§6). Order is chosen so the
film is watchable after every phase.

### Phase 0 — Re-scene the spine  *(no new visuals yet)*
- [ ] Rewrite `SCENES` in `src/lib/beat.ts` to the 5-act map in §2.
- [ ] Add `COLORS.darkBg / darkInk / darkDim / darkLine` to `src/theme.ts`.
- [ ] Update `src/Promo.tsx` sequence list + `FLASHES` to the new boundaries (placeholder scenes ok).
- [ ] Re-cut `scripts/make-beat.mjs` arrangement to the act structure; `npm run beat`.
- **Gate:** `tsc --noEmit`, render still renders end-to-end.

### Phase 1 — Primitives
- [ ] `components/Camera.tsx` — frame-driven world transform (keyframe list → translate/scale).
- [ ] `components/Counter.tsx` — spring-settle number with prefix/suffix + format.
- [ ] `components/LightFlood.tsx` — dark→light radial wipe on a trigger frame.
- [ ] Extend `components/Kinetic.tsx` — add `Typewriter`, `WeightShift`.
- **Gate:** primitives render in isolation (temp composition or Studio preview).

### Phase 2 — Act I: The Pile-Up  *(the missing first act)*
- [ ] `scenes/Pileup.tsx` — dark, buzzing phone, stacking notification cards (`Typewriter`),
      runaway unread `Counter`, two type punches.
- [ ] Wire into `Promo.tsx` at f0–150 over a dark `<Background variant="dark">`.
- **Gate:** Act I reads as tension; counter and buzz land on beats.

### Phase 3 — Act II: The Leap
- [ ] `LightFlood` transition at f150; silence-beat handoff into reworked `LogoReveal`.
- [ ] New line *"Put the thread on autopilot."*; remove the now-redundant generic flash.
- **Gate:** dark→light turn feels like a release, not a cut.

### Phase 4 — Act III: The Machine
- [ ] `components/DeviceFrame.tsx` + `components/BroadcastRipple.tsx`.
- [ ] Refactor `Spotlight.tsx` + `Grid.tsx` into a single wide world moved by `<Camera>`:
      broadcast → autopilot (Sarah) → route/hand-off. Reuse existing chat/node mockups.
- [ ] Match-cut phone screen → dashboard panel at the movement seam.
- **Gate:** reads as one continuous system; Sarah's thread is coherent start-to-finish.

### Phase 5 — Act IV: The Payoff
- [ ] `scenes/Payoff.tsx` — night scene, sleeping silhouette, four self-climbing `Counter`s,
      *"While you sleep, LeapCreww works."* (callback to Act I's counter).
- **Gate:** payoff clearly answers Act I's pain.

### Phase 6 — Act V: Resolve + polish
- [ ] Tighten `ComingSoon.tsx` → `EndCard.tsx`; **add the CTA** (`leapcreww.com · Early access`).
- [ ] Pass on grain/vignette/chromatic-on-impact; final beat-sync audit.
- [ ] Regenerate poster still (`npm run still`).
- **Gate:** full §6 verification + a watch-through review against §2 beat table.

---

## 5. File map

```
video/src/
  lib/beat.ts            ✎ re-scene to 5 acts (Phase 0)
  theme.ts               ✎ dark palette tokens (Phase 0)
  Promo.tsx              ✎ new sequence list, match-cut wiring
  components/
    Camera.tsx           + virtual camera          (Phase 1)
    Counter.tsx          + spring-settle counter    (Phase 1)
    LightFlood.tsx       + dark→light transition    (Phase 1)
    DeviceFrame.tsx      + 3D-tilt device chassis    (Phase 4)
    BroadcastRipple.tsx  + campaign particle burst   (Phase 4)
    Kinetic.tsx          ✎ + Typewriter, WeightShift (Phase 1)
    Background.tsx       ✎ dark variant              (Phase 2)
  scenes/
    Pileup.tsx           + Act I  (Phase 2)
    LogoReveal.tsx       ✎ Act II entry via flood    (Phase 3)
    Spotlight.tsx        ✎ folded into Act III world  (Phase 4)
    Grid.tsx             ✎ folded into Act III world  (Phase 4)
    Payoff.tsx           + Act IV  (Phase 5)
    ComingSoon.tsx       ✎ Act V                      (Phase 6)
    EndCard.tsx          ✎ Act V + CTA                (Phase 6)
scripts/make-beat.mjs    ✎ arrangement matches acts   (Phase 0)
```

`+` new · `✎` modified

---

## 6. Verification gates (every phase)

```bash
npx tsc --noEmit              # types clean
npm run beat                  # audio regenerated when arrangement changes
npm run render                # full 30s renders without error → out/leapcreww.mp4
npm run still                 # poster frame regenerates
```

Plus a **director review** against the §2 beat table: does each act land on its beat, and
does Act IV pay off Act I? If the counter in the payoff doesn't echo the counter in the
pile-up, the rewrite has failed its one job.

---

## 7. Scope notes / decisions to confirm

- **Length stays 30s.** Agency spots are tight; the structure fits 900f. (Could extend to 35s
  if Act III needs more room — easy, since beats are parametric.)
- **Protagonist = Maya, the founder.** Sarah stays as the customer in the thread. If you'd
  rather keep it founder-anonymous (hand + phone only, no character), the plan still holds.
- **Audio is generated** (`make-beat.mjs`), not licensed. If you want a licensed track later,
  the visuals are already beat-grid-driven and will re-lock to a new BPM by editing `beat.ts`.
- **No new dependencies.** Everything above is pure Remotion + the primitives we already use
  (spring/interpolate/SVG). No GSAP, no 3D libs needed.

---

*Plan authored as a phased rewrite of the existing Remotion promo. Start at Phase 0 — it's
safe (re-scening + tokens) and makes every later phase drop-in.*
