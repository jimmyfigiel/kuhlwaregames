# Code Name: Sector — Computer Emulator Functional Spec

Reverse-engineered from the 1977/78 Parker Brothers rules booklet, generalized to
support **1–8 ships** and **1–N subs**, with a configurable RNG mode.

This document specifies *behavior only* — no code, no UI layout. It's the
contract the game-module build should satisfy (see §0.1 for deployment
context: a module on an existing real-time room system, not a standalone PWA).

## 0. Roadmap & Architecture Posture

### 0.1 Deployment target

This is **not** a standalone pass-and-play app. It deploys as a game module
on an existing real-time room system (Node/Vite/Firebase) with these already
solved by that system:

- Lobby/room creation, join codes, player-to-room assignment.
- **State sync model: full-snapshot.** Each client subscribes to a Firestore
  document (or doc + subcollections) and receives the *entire* current state
  on every change — there is no discrete event/message stream between
  clients. ("Snapshot sync," not "event sourcing.")
- **Per-player private data is already supported** at the document/field
  level — the room system can give each client a different slice of the
  room's data (e.g. one player's private fields are absent or unreadable
  from another player's snapshot).
- **Execution model: fully client-side.** Every client runs the same game
  logic locally and is responsible for computing the next state and writing
  it back to the room document for others to pick up. There is **no Cloud
  Function and no server-side authority** in this system — any client can
  write canonical state.

This spec's earlier framing (§0 in prior draft) assumed an event-log /
scoped-broadcast model. **That assumption is superseded.** The architecture
below replaces it with a model that fits snapshot-sync + client-side
execution, while preserving the same forward-compatibility goals (Hunter
mode, Versus mode) from a different angle.

### 0.2 The one real conflict: hidden sub state in a fully client-side, honor-system world

Because every client runs the full game engine locally and any client can
write state, **any client's local memory can, in principle, contain
everything** — including the sub's true position, course, and depth — even
if the UI never displays it. A player willing to open devtools could read it
directly. **Decision: this tradeoff is accepted.** No Cloud Function or
server-side authority will be added solely to hide the sub. This matches how
every other game on this room system already operates, and the target
audience (friends, honor system) doesn't justify the added operational
surface of a server-side component for one game module.

**Practical implication:** the engine still computes and *internally*
tracks true sub state, and the spec's hidden-information rules (§5) remain
the *intended* play experience — they are a design/UX contract, not a
cryptographic guarantee. If this product ever needs real anti-cheat
guarantees (e.g. for a public/competitive release), revisit §0.2 first;
nothing else in this spec needs to change to add a Cloud Function later
(see §0.4) — only where state computation happens, not what it computes.

### 0.3 State shape (Firestore document contract)

A room running Code Name: Sector holds:

```
room/{roomId} = {
  public: {
    gameMode: "classic",
    rngMode: "random" | "seeded",
    seed?: string,
    limitLine: { minN, maxN, minE, maxE },
    turnOrder: ActorId[],           // ship ids, in play order
    currentActorIndex: number,
    roundNumber: number,
    ships: {
      [shipId]: {
        position: {N, E}, course, speed,
        lastFiringResult: enum,     // public broadcast outcomes (COLL/SOS/OFF1/OFF2/SUB/MISS)
      }
    },
    subsAliveCount: number,         // public-safe aggregate, never per-sub detail
    gameStatus: "lobby" | "in_progress" | "won" | ...
  },
  private: {
    [playerId]: {
      // this player's own ship's full history/derived data they're
      // entitled to, e.g. their own past RANGE results, their own AIM
      // cursor state, pending action draft
    }
  },
  // Sub true state (position, course, depth, alive) lives HERE, in the
  // same document, simply under a key that the UI layer never reads and
  // never renders. Per §0.2, this is a UX convention, not a security
  // boundary — it is technically visible to a client inspecting Firestore
  // data directly, same as it would be in local engine memory.
  engineInternal: {
    subs: {
      [subId]: { position: {N, E}, course, depth, alive }
    }
  }
}
```

- Clients **write** the full `room` document (or relevant sub-paths) after
  locally resolving an action — there is no separate "intent" vs "result"
  step; the resolving client computes the result and writes it directly,
  consistent with how other games on this system work.
- Clients **read** via the live snapshot listener already provided by the
  room system; the UI layer is responsible for only ever rendering `public`
  and `private.<thisPlayerId>` — never `engineInternal` or another player's
  `private` slice, even though, per §0.2, nothing stops a determined client
  from reading them directly off the snapshot.
- Concurrency: since any client can write, and Code Name: Sector is strictly
  turn-based (only `turnOrder[currentActorIndex]`'s controlling client should
  ever be computing a move), write collisions are a non-issue *as long as*
  every client respects whose turn it is before writing — this is a client
  discipline rule, not enforced by the data layer. Flag as a build-time
  invariant to test: a client must never write a state change for a turn
  that isn't currently theirs.

### 0.4 Forward-compatible internals (engine-internal, unaffected by 0.1–0.3)

Even though the *transport* is full-snapshot rather than event-log, the
engine's internal factoring should still follow these commitments, because
they're about code structure, not about Firestore:

| Commitment | Why it matters later | Cost now |
|---|---|---|
| **Sensor actions are data-described, not hardcoded buttons.** RANGE/AIM/FIRE are each modeled as a `SensorAction` definition (type, cost, precision, optional broadcast/detection footprint), resolved by one generic resolver function, not bespoke per-button logic. | Hunter mode's active/passive sonar is two new `SensorAction` definitions plus a detection-broadcast rule, not a parallel system. | None — Classic mode's RANGE/AIM/FIRE behavior is identical either way. |
| **Every entity that moves is driven by a `Controller` interface** (`decideMove(state) -> {course, speed}`). Classic mode ships use a `LocalHumanController` (this client's own input); Classic mode's sub uses a `RuleBasedSubController` implementing §4. | Versus mode's human-controlled sub is just a `LocalHumanController` attached to a sub entity on the sub-player's device instead of a ship. | None — same logic as §4, called through one extra layer of indirection. |
| **Public/private/internal state partition is explicit in the data model from day one** (§0.3's three top-level keys), not bolted on. | Hunter mode's "ping broadcasts to nearby listeners" and Versus mode's "sub player needs their own private slice" are both just new fields under the existing `private.<playerId>` or a new `private.<subPlayerId>` — no restructuring. | None — Classic mode already needs exactly this partition for RANGE/AIM results to stay private per ship. |
| **Turn order is a list of actor IDs (ship or sub), not "ships then subs."** | Adding a human-controlled sub as a turn-taking actor (Versus mode) requires no loop changes. | None — for Classic mode the actor list is exactly the ships; subs resolve as a batch step the currently-acting client also computes (§3), still through the same actor-list mechanism conceptually. |

None of §0.4 changes Classic mode's *behavior* — every rule in §1–§9 below
is unaffected. It only changes how the engine code is factored, so that
adopting the Firestore snapshot model (§0.1–0.3) doesn't itself become a
rewrite when Hunter/Versus modes arrive.

---

## 1. Coordinate System & Grid

- Grid is labeled in **N (North)** and **E (East)** points, e.g. `35N, 25E`.
- Origin and extent are derived from the **LIMIT LINE**, a rectangle the sub may
  never cross (manual pp. 4, 26: "the computer will never allow the sub to travel
  outside the ... LIMIT LINE").
- Original board implies a fixed limit line per game (looked roughly 20x20 to
  25x25 points in the examples — 25N–50N, 25E–50E). **Generalized spec: limit
  line is a configurable rectangle** `{minN, maxN, minE, maxE}`, set at game
  start (default 26×26, matching the manual's examples).
- All positions are integer lattice points within the limit line, inclusive of
  its boundary (ships/subs can sit ON the line, page 27 figure 22 shows the sub
  hugging the line before bouncing).

### Distance metric — Chebyshev (king-move) distance

Per p. 6 (Figure 4/5 commentary): diagonal, horizontal, and vertical steps
all count as **1 point each**, and you must "always try to count points along the
shortest possible route." This is **Chebyshev distance**:

```
range(A, B) = max(|A.N - B.N|, |A.E - B.E|)
```

This single formula explains the diamond-square RANGE rings shown in Figures 4/5
(a range-7 box is a 15×15 square centered on the ship, consistent with Chebyshev,
not Euclidean).

---

## 2. Entities

### 2.1 Ship
```
Ship {
  id: int                      // 1-8, player-assigned order
  position: {N, E}
  course: one of 8 compass dirs (N, NE, E, SE, S, SW, W, NW) | null (not yet moved)
  speed: int 0-9
  controller: human | none (if computer-controlled placeholder, out of scope)
  alive: bool                  // false if knocked out (optional house rule; original has no ship sinking)
  lastFiringResult: enum {NONE, MISS, OFF1, OFF2, SOS, SUB, COLL} // most recent FIRE/MOVE outcome
}
```

### 2.2 Sub
```
Sub {
  id: int                      // 1-N
  position: {N, E}             // hidden from all players until sunk
  course: one of 8 compass dirs
  speed: 1 (constant — see 4.1)
  depth: 1 | 2 | 3             // hidden, fixed for the game (set at sub creation)
  alive: bool
}
```

> Original game has exactly one sub. Multi-sub generalization: each sub is
> fully independent (own course/depth/position) and is tracked, aimed at, and
> fired upon **individually** — see §6 for target selection in the N-sub case.

---

## 3. Turn Structure

The original is **strictly sequential and manual**: each player completes a
full turn before pressing NEXT SHIP to hand off. The emulator should preserve
this turn-based discipline even though it's no longer literally "passing a
console":

```
GAME LOOP:
  for each active Ship in player order (1..K), repeat each round:
    1. RANGE — show current range(s) from this ship to sub(s) per visibility rules (§5)
    2. Player chooses DIRECTION (8-way) and SPEED (0-9)
    3. PLOT — compute the straight-line path from current position,
       `speed` points in `course` direction
       - reject (or clamp) moves that would leave the limit line — ship
         movement is NOT restricted to the limit line in the original
         (only the sub is restricted), so no clamping needed for ships;
         allow ships to leave the limit line freely.
    4. COLLISION CHECK (§4.3) against every alive sub's actual position
       — if the path crosses a sub's current position, that sub registers
         a COLL: sub is bounced (relocated + new course, see §4.3) and the
         ship registers a COLL event (counts as a free, automatic, fully-
         accurate "hit" location reveal for exactly one instant — see p.23)
    5. MOVE SHIP — commit new position
    6. Optionally: AIM, then FIRE (see §6) — a ship may fire at most once
       per turn ("No player is ever allowed to fire more than once during
       a turn," p. 19)
    7. RANGE again if desired (post-move) — free, unlimited presses
    8. NEXT SHIP — advance to next ship in order

  AFTER all ships have moved once (one full round):
    for each alive Sub:
      - advance 1 point along its course (§4.1)
      - if this hits/crosses the limit line, recompute course (§4.2)
  (Sub movement is depicted in the manual as happening "continuously" /
   conceptually between ship turns rather than in one batch — but because
   the original is single-threaded with one player at a time, the *effective*
   timing is: the sub has moved by the time NEXT SHIP next reveals new info.
   Spec choice: advance ALL subs once per full round, after the last ship's
   turn, immediately before round n+1 begins. This is simplest to reason
   about and matches the "moves 1 point whenever NEXT SHIP is pressed"
   language if we treat "NEXT SHIP" as wrapping back to Ship 1.)
```

**Design note for multi-ship play:** the original explicitly supports 2–4
ships taking turns "in order... maintained throughout the game" (p. 3). We
extend this to 1–8. Each ship's owner only sees that ship's own dashboard
state (course/speed/position they've plotted themselves) — never another
ship's plotted course — exactly as in the original chart-and-crayon system
where each player tracks their own ship on their own copy of the chart.

**Multi-device write discipline (per §0.1/§0.3):** in this deployment, the
client whose ship is `turnOrder[currentActorIndex]` is the one responsible
for running steps 1–7 locally and writing the resulting state — including
step 9's sub advancement, since there is no server to do it independently.
Concretely: the acting client computes its own move, runs the collision
check against `engineInternal`, resolves any FIRE, advances all subs for
that round if it was the last ship in turn order, and writes the full
updated `room` document. Every other client only ever reads. This must be
enforced as a client-side invariant (§0.3) — nothing in Firestore stops a
client from writing out of turn, so the UI should simply never expose
write-triggering actions when it isn't that client's turn.

---

## 4. Sub Behavior

### 4.1 Movement

- Each sub moves **exactly 1 point per round**, in its current `course`
  direction, **always** (manual: "The sub always moves 1 point... moved 1
  point in an unknown direction," p. 9; "the computer ... moves the sub's
  movement" at constant 1-point increments throughout the teach game).
- Speed is therefore fixed at 1 — there is no sub speed control in the
  original. (Optional house-rule extension, not in spec default: variable
  sub speed 1-3.)
- Direction is one of 8 compass points and is **not directly visible** to
  players. It can only be inferred by triangulating successive RANGE circles
  (this is the core deduction mechanic, pp. 12-15) — the emulator must NOT
  leak the course directly except via the legitimate RANGE numbers.

### 4.2 Limit-line bounce behavior

From p. 27 (Figure 22) and p. 4: when continuing on the current course would
cross the limit line, the sub is **forced to change course**, choosing
**1 point off** its limit-line-bound heading (figure shows 3 possible new
courses fanning out from the corner, each 45° apart from forbidden headings).

Formal rule:
```
On each move, BEFORE advancing:
  candidate_position = position + 1 step in `course`
  if candidate_position is outside the limit line on one or both axes:
      forbidden_directions = the 1 (edge) or 3 (corner) compass directions
          that would continue taking the sub further outside the box
          OR directly into/along the violated boundary
      new_course = RNG-selected direction from the remaining legal directions
          that are within ±45° "1 point off" the original course AND do not
          re-violate the limit line this step
        (Figure 22 shows exactly 3 legal alternatives fanning from a corner;
         along a flat edge there is exactly 1 forced new heading, e.g. due
         N -> NE or NW.)
      course = new_course
  position = position + 1 step in course   // using the (possibly new) course
```

This is the one place genuine randomness enters sub behavior in the original
("Its new course will relate to the limit line as shown," p. 27 — multiple
valid choices, computer picks one).

### 4.3 Collision (COLL) behavior

Manual pp. 22-23: if a ship's plotted *path* (not just endpoint — the whole
line segment it travels that turn) crosses the sub's actual position:

1. The chasing ship's move is "punished": it is **knocked off course** —
   spec: ship's actual landing position/course is **randomly reassigned** by
   the computer (within reasonable bounds — page 22 example shows ship 4
   ending up at a position consistent with speed 9 in a randomly chosen
   direction). RECALL reveals the (randomized) actual outcome.
2. The sub is **forced to a new random position and course** ("Your new
   position and course may be very different, depending on the random
   selection of the computer," p. 21 caption to Fig 18 — same mechanic as
   firing a near-miss, see §6.3).
3. The display flashes `COLL`.

**Multi-sub note:** check collision independently against every alive sub.
A single ship move could in principle collide with multiple subs in the
same path — original game only has 1 sub so this is undefined; spec choice:
**resolve the nearest (first-crossed) sub only**, ignore further collisions
in the same move (closest first, since physically the ship can't pass
through one sub to hit another in the same instant).

---

## 5. Information Visibility Rules (the deduction layer)

This is the heart of the game and must be preserved exactly. Per §0.3, each
row below maps onto a specific part of the Firestore document — `public`,
`private.<playerId>`, or `engineInternal` (honor-system-only, §0.2):

| Action | What player learns | Lives in |
|---|---|---|
| RANGE (button) | Chebyshev distance from **this ship's current plotted position** to the sub's **actual current position** — exact, single integer. Nothing else. | Computed by the acting client from `engineInternal.subs`, written to `private.<thisPlayerId>.lastRange` |
| PLOT | Player's own ship's position only (private bookkeeping; not hidden info) | `public.ships.<shipId>.position` (ship position is not secret from other ships — only the sub's position is secret) |
| NEXT SHIP (sub's turn happens) | Nothing revealed directly — sub moves silently; effect only inferable next time RANGE is pressed | Sub move updates `engineInternal.subs` only; no public or private field changes |
| AIM | Cycles compass direction; gives no distance info, only a binary "is this the right firing direction" via lights (N + sequential pattern flashes when correct, p. 19) — **direction is exact and discoverable for free by cycling**, this is intentional (manual explicitly allows unlimited AIM presses) | `private.<thisPlayerId>.aimCursor` (in-progress), not written to public until FIRE resolves |
| FIRE (after correct AIM, range ≤ 2) | Resolves hit/miss per §6 | Outcome (`COLL`/`SOS`/`OFF1`/`OFF2`/`SUB`/`MISS`) is **public** per §5.2 — written to `public.ships.<shipId>.lastFiringResult` and, on `SUB`, `engineInternal.subs.<subId>.alive` flips false and that sub's identity/position *can* move to `public` since it's no longer hidden info once sunk |
| COLL | Reveals an exact, instantaneous "ship is directly on top of sub" event — full position match for that instant only | Public (`public.ships.<shipId>.lastFiringResult = "COLL"`); the momentary position match itself is not separately exposed, only the COLL label, matching the original console's behavior |
| SUB FINDER (single-player aid, p. 28) | "Reduces the sub's challenge" — exact mechanism not specified in text beyond "displays the sub's exact location, depth, and compass heading." Spec: full reveal of one targeted sub's {position, depth, course}. Treat as an explicit cheat/practice toggle, off by default. | Reads directly from `engineInternal.subs` and surfaces to `private.<thisPlayerId>` only — this is an intentional, opt-in reveal, distinct from the devtools-level exposure discussed in §0.2 |
| EVASIVE SUB (toggle on Combat Info Center) | Changes sub behavior (see §4.2/4.3), not an info-reveal | `public.evasiveSubEnabled` flag, read by `RuleBasedSubController` |

**Critical constraint:** RANGE must be computed against the sub's position
*at the moment RANGE is pressed*, i.e. it reflects all sub moves that have
already occurred, but never previews a sub move that hasn't happened yet.

**Reminder on enforcement (§0.2):** every row above describing something as
"hidden" or "private" is a UX/UI contract enforced by which fields the
client *chooses* to render and write to which top-level key — not a security
boundary. `engineInternal` is readable in the snapshot by any client that
looks. This is an accepted tradeoff, not an oversight.

### 5.1 Multi-sub visibility

For N>1 subs, RANGE should report **one range value per sub still alive**,
each independently computed, each still hidden as to *which sub is which*
in terms of position — i.e. you get N numbers but they are unlabeled distances
unless/until a sub is sunk (matching how the original treats "Ships 2 and 3
both covered the display a brand-new sub" — multiple unresolved hypotheses is
explicitly the intended challenge, p. 24-25 SHIP 3 misfire example). These
unlabeled distances are written as an array to
`private.<thisPlayerId>.lastRange: number[]`, order-independent (the order
itself must not leak which-sub-is-which across turns — re-sort or otherwise
decorrelate ordering before writing, or a client could infer identity from
array position alone over time).

### 5.2 Multi-ship visibility

Each ship's owner sees only:
- their own ship's position/course/speed history — `private.<playerId>` plus
  the position fields that are actually public per §0.3 (ship position is
  not secret; only sub position is)
- their own RANGE results — `private.<playerId>.lastRange`
- **shared knowledge ONLY if players choose to communicate it themselves**
  (manual: "you share information with your fellow commanders... only one
  commander can destroy the sub" but "with this information, you and your
  allies act as a double agent" — i.e. the *game* doesn't auto-share; players
  verbally share, by design, exactly like the original's "tell the others...
  read the chart aloud")
- the **public broadcast outcomes** of every ship's FIRE attempts
  (`COLL`/`SOS`/`OFF1`/`OFF2`/`SUB`/`MISS`) — these ARE public in the
  original ("the chart's information confirms... his opponents guessing,"
  p. 24, since all players historically watched the same shared console) and
  remain public here via `public.ships.<shipId>.lastFiringResult`.

**Design implication (multi-device, per §0.1):** the room's `public` slice
must never include sub position/course/depth/identity (that's
`engineInternal`-only), and each player's UI must render only `public` plus
their own `private.<playerId>` — never another player's `private` slice.
The room system's existing per-player field scoping handles the *delivery*
side of this; the game module is responsible for *writing* data into the
correct top-level key in the first place, since nothing downstream will
catch a mistake (e.g. accidentally writing sub position into `public`).

---

## 6. Aiming & Firing

### 6.1 AIM

- 8-direction cycle (compass rose), advanced by repeated AIM presses.
- "Correct" direction = the compass octant containing the target sub's
  *current* position, where direction is computed by the sign of
  `(sub.N - ship.N, sub.E - ship.E)`. Ties (exact N/S/E/W alignment vs
  diagonal) resolve to the geometrically exact octant — if exactly on a
  diagonal, diagonal direction is correct; if exactly on an axis, the
  cardinal direction is correct.
- Feedback (p. 19): wrong direction → only the static "N" light. Correct
  direction → "the N light is blinking" plus sequential flash pattern.
  This reveal is **free and repeatable** — players may cycle AIM as many
  times as they like before FIRE with no penalty. (Spec faithfully keeps
  this generous — it's intentionally not the bottleneck; DEPTH is.)

### 6.2 FIRE preconditions

Per p. 26 "FIRING RESTRICTIONS":
- Range must be **≤ 2** points (Chebyshev) from ship to the targeted sub's
  *actual* position at the moment of firing, in **one of the 8 compass
  directions exactly** — diagonal ranges of 2 are allowed only if the sub
  is exactly on that diagonal (Figure 21: a range-2 diagonal cell is
  marked "2" and allowed; closer non-aligned cells at distance 1 in some
  off-axis combos are marked "not allowed" — i.e. **the sub must lie
  exactly on one of the 8 rays from the ship**, not just within Chebyshev
  distance 2 generally).
  - Formalize: let `dN = sub.N - ship.N`, `dE = sub.E - ship.E`.
    Firing is legal iff `(dN, dE)` is one of: `(0,0)` excluded (can't
    target your own square), and otherwise `dN` and `dE` satisfy one of:
    - `dN == 0 and |dE| <= 2` (E/W ray)
    - `dE == 0 and |dN| <= 2` (N/S ray)
    - `|dN| == |dE| and |dN| <= 2` (diagonal ray)
  - If AIM direction selected doesn't match the true ray direction to that
    sub, firing produces a normal miss-class result (see below), not an
    error — but the manual's UI simply won't *register* the shot ("the sub
    will fire back, knocking you off course" only applies to wrong-aim
    miscalibration *attempts*; functionally treat "wrong AIM direction but
    in range" the same as "out of range": shot does not connect — display
    shows nothing happens, or optionally OFF with a note, see p. 26: "the
    computer will not display an F2... the sub will fire back, knocking
    you off course" — actually a wrong-direction FIRE attempt is its own
    penalty case, see 6.4).

- Player must have pressed AIM until the correct direction was found before
  FIRE is meaningful (the game does not stop you from firing in the wrong
  direction, but doing so triggers the misfire/retaliation case).

### 6.3 Depth guess & hit resolution

Per pp. 18-19, 24-25:
- Once range ≤2 and direction correct, FIRE prompts a **DEPTH** guess: 1, 2,
  or 3.
- Resolution:

| Range to sub (exact) | Depth guess correct? | Result |
|---|---|---|
| 0 (directly on top) | correct | **SUB** (sunk, win) |
| 0 | incorrect | **OFF 1** ("very close shot... severe damage") — but see note: p.19 distinguishes OFF1/OFF2 by range, not just depth-correctness; reconcile below |
| 1 | correct | **SUB** |
| 1 | incorrect | **OFF 1** |
| 2 | correct | **SUB** |
| 2 | incorrect | **OFF 2** ("close shot... minor damage") |
| direction wrong / out of range | n/a | shot does not connect; sub fires back → ship is **knocked off course** (random new position/course, p.17/21 "SOS" sequence) and flashes **SOS** |

Reconciling p.19 vs p.24-25 language: p.19 ties OFF1/OFF2 to range alone
("OFF 1 – a very close shot... OFF 2 – a close shot"), while p.24-25's
"misfire... announce either OFF 1 or OFF 2 exactly how deep the sub really
is" implies **depth-miss distance** determines OFF1 vs OFF2, not raw range.
Spec resolution (most internally consistent reading): **on a depth miss,
which OFF code displays is determined by how far off the depth guess was**:
- guessed depth is 1 step off the true depth (e.g. guessed 2, true 1 or 3)
  → **OFF 2** (close, minor)
- guessed depth is 2 steps off (guessed 1, true 3, or vice versa)
  → **OFF 1** (very close call, severe) — counterintuitive label but matches
  p.24's worked example: misfire at Depth 1 *or* Depth 3 both register
  OFF1 or OFF2 depending on which extreme true depth is, while a Depth-2
  guess that's wrong always reveals partial info either way.
  **Build note:** this rule is the single most ambiguous part of the
  original ruleset as written. Recommend confirming against actual unit
  behavior via video/forum reference before finalizing; document as
  `TODO: verify OFF1 vs OFF2 mapping against physical unit` in code.

- **SOS** = complete miss / wrong-direction fire attempt: sub also fires
  back, randomly relocating AND re-coursing the *firing* ship, per p.21
  (Figure 17/18: ship displaced and given a new random course/speed by the
  computer after an SOS).

- **OFF1 / OFF2** do NOT relocate the sub or the ship — they are pure
  information (partial depth confirmation), per p. 25's full discussion of
  using OFF1/OFF2 across multiple ships' attempts to triangulate depth by
  elimination.

- A ship may fire **at most once per its own turn** (p.19, p.26).

### 6.4 Multi-sub targeting

When N>1 subs are alive, AIM/FIRE target **whichever sub is geometrically on
the correct ray** at the moment of firing. If multiple subs sit on
qualifying rays simultaneously (rare edge case), resolve to the **nearest**
one. If none qualify, treat as SOS-class miss.

---

## 7. RNG Modes (per your "let me choose at game start" requirement)

Expose at game setup:

```
RngMode = "random" | "seeded"
seed: string | int   // only used/shown if mode == "seeded"
```

- `random`: standard CSPRNG/Math.random-backed, matches original unpredictability.
- `seeded`: all stochastic events (initial sub position/course/depth, limit-line
  bounce direction choice, COLL relocation, SOS relocation) draw from a seeded
  PRNG (e.g. a small deterministic generator like xorshift or mulberry32)
  seeded from the user-supplied string/int, so the **entire game is
  reproducible** — same seed + same player inputs ⇒ identical game, useful for
  testing and for sharing/replaying a tricky scenario.
- All RNG draws must funnel through one injectable `Rng` interface so the
  sim engine never calls `Math.random()` directly — this is what makes the
  seeded mode trustworthy and the engine unit-testable.

---

## 8. Generalization Summary (beyond the literal 1977 ruleset)

| Aspect | Original | This spec |
|---|---|---|
| Ships | 1–4, fixed order | 1–8, fixed order |
| Subs | exactly 1 | 1–N, independently simulated |
| Sub speed | always 1 | always 1 (kept faithful; flagged as extension point) |
| RNG | physically random (analog noise / pseudo-random ROM table) | selectable random/seeded |
| Visibility | enforced by physically having one shared console | enforced in software per §5 |
| Ship sinking | not modeled (only subs sink) | not modeled by default (ships never "die"); flagged as optional house rule |

---

## 9. Forward Compatibility Hooks (do not implement now — just don't preclude)

These are NOT part of Classic mode. Listed here only so build decisions in
§1–8 don't accidentally make them harder later. See §0 for the binding
architecture commitments these depend on.

- **Active/passive sonar (Hunter mode):** active ping ≈ today's RANGE+AIM
  bundled into one `SensorAction`, but tagged as broadcasting a detectable
  event to passive listeners within some radius. Passive listening ≈ a new,
  free, always-available `SensorAction` returning bearing-only (8-octant,
  matching AIM's existing resolution) to every contact within passive
  range, no distance. Requires: (a) sub gains a detection radius / noise
  profile, (b) ships gain the option to "listen" as a free action instead
  of/alongside RANGE, (c) event scope on a successful active ping includes
  "every entity within radius R," not just the pinging ship.
- **Human-controlled subs (Versus mode):** requires a sub-side dashboard
  (its own sensor actions, its own win condition, optionally its own
  attack capability against ships, which Classic mode does not have — ships
  are never destroyed in Classic mode). Requires the `Controller` and
  turn-order generalizations from §0 to already be in place; otherwise this
  is a turn-loop rewrite instead of "swap in a new controller type."

## 10. Open Questions / Things to Verify Before Coding

1. **OFF1 vs OFF2 exact mapping** (§6.3) — ambiguous in source text, flagged above.
2. **Exact limit-line size** — manual's figures suggest ~26×26 but this may
   have been an instructional simplification; physical unit's real bound is
   unknown. Defaulting to a configurable rectangle sidesteps this.
2a. Whether the **limit line is fixed for the whole game** or could move —
   spec assumes fixed.
3. Whether ship moves are blocked by the limit line at all (spec assumes
   **no** — only subs are constrained — but worth double-checking against
   any surviving photos/video of actual gameplay).
4. Exact RNG fairness/distribution for limit-line bounce and COLL/SOS
   relocation — spec leaves this as "uniform among valid options," which is
   a reasonable default absent more detail.

---

## 11. Suggested Build Order (for the next phase, code)

1. Pure simulation engine (no Firestore, no UI): entities, `Controller`
   interface, `SensorAction`-based RANGE/AIM/FIRE resolver, turn loop driven
   by an actor list, RNG-injectable (§7) — fully unit-testable headless,
   operating on a plain in-memory object shaped like §0.3's `room` document
   (`public` / `private.<playerId>` / `engineInternal`). This is where the
   §0.4 architecture commitments get paid for; everything above this layer
   just calls into it and reads/writes the same shape Firestore will hold.
2. Regression test harness: replay the manual's own worked walkthrough
   (pp. 7–25, Ships 1–4) move-for-move against the pure engine — the manual
   IS a fully worked sample game, this validates RANGE/AIM/FIRE/COLL math
   independent of any networking concerns.
3. Game-module integration: wire the pure engine into the existing room
   system's game-module contract — lobby setup writes initial `room` state,
   each client's local engine instance computes its own turn's resolution
   and writes the updated document per §0.3/§3's write-discipline rule,
   and the UI subscribes to the snapshot and renders only `public` plus
   `private.<thisPlayerId>`.
4. Add a build-time/test-time check for the §3 write-discipline invariant
   (a client never writes when it isn't the current actor) — this is the
   one new failure mode multi-device introduces that pass-and-play never
   had, since there's no physical device handoff enforcing it anymore.
5. UI: chart/grid view (per-ship), compass+digital readout widget styled
   after Figure 1/15/16, "your turn" / "waiting for Ship N" states driven
   directly off `public.currentActorIndex`.
