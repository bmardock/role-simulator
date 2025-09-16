## Leadership Trail — Requirements (v0.9)

### 1) Purpose & Success Criteria

- **Purpose**: Teach engineering leadership through repeated, consequence-driven runs that feel like a journey.
- **Fun**: Players feel tension and agency every turn (risk/reward, tradeoffs, randomness).
- **Educational**: Each decision produces a short why/so-what insight; milestones and post-mortem synthesize lessons.
- **Sticky**: Runs are replayable with different archetypes/paths; meta progression rewards learning by doing.
- **Player success metrics**: average turns per run ≥ 8; ≥ 2 replays/session; 80% agree “learned something actionable.”

### 2) Core Game Loop (per turn)

1. **Roll Dice**: Internal, External, Opportunity, Luck (d6 each).
2. **Scenario Select (dice-biased)**: Pull 1 card from deck; dice + state weights the draw.
3. **Options Present**: 3 core choices + optional modifier (see §5) with clear tradeoffs.
4. **Apply Effects**: Immediate deltas + queue delayed effects (turn+n).
5. **Journey Log Entry**: 1–2 sentences: what you did, what changed, and a “watch this” note.
6. **Milestone Check**: Turns 4, 8, 12 → chapter summary, coach tip, and possible bonuses/penalties.

### 3) Stats & State Model

- **Leader**: trust, execution, vision, culture
- **Company**: morale, velocity, techDebt, stakeholder, financials
- **Hidden (derived)**: burnout, attrition, crisis
- **Run Meta**: turn, flags (story continuity), delayedEffects[], recentChoices[], journal[], archetype, template, influencePoints
- **Ranges**: 0–100 (clamped).
- **Thresholds (examples)**:
  - morale < 30 → Attrition event risk
  - burnout > 60 → Forced attrition next 2–3 turns
  - financials ≤ 0 → Out of Business (hard fail)
  - techDebt > 80 → Tech Meltdown crisis (play continues with penalties)

### 4) Initialization

- **Company Template**: startup / scaleup / bigco → seeds company stats (biases).
- **Leader Archetype**: operator / servant / visionary / firefighter → seeds leader stats (nudges).
- **Onboarding Micro-Quiz (5 Qs)**: small ±3–5 adjustments to personalize the run.
- **Seeded RNG**: Reproducible per run, plus light per-turn noise.

### 5) Choice Design (breadth without overwhelm)

- **3 Core Options** per scenario (mutually exclusive, meaningful tradeoffs).
- **1 Modifier Lever (optional)**: “how” you execute (Empathy / Execution / Strategic) or intensity (Light / Moderate / Hard).
- **Mechanics**: base option effects × modifier multiplier; unlock “favored” states when dice align with archetype.
- **Resource Spend**: influencePoints (1–2 per run) to reroll one die or soften a penalty.

### 6) Dice & Randomness

- **Dice roles**:
  - Internal → gates people/process options
  - External → unlocks/boosts stakeholder/market actions
  - Opportunity → unlocks investment/innovation actions
  - Luck → swing hooks (rare bonuses/complications)
- **Bias controls**: Weighted scenario draw by current weak stats (e.g., low morale → higher chance of morale scenarios).
- **Fairness**: No single roll should end a run; big failures come from compounding choices.

### 7) Deck & Narrative Structure

#### 7.1 Backbone (12 scenarios / “season”)

- **Early (Turns 1–4)**: First Standup; New Scope; Design Conflict; Early Customer Ask
- **Mid (Turns 5–8)**: Crunch Time; Promotion Request; Budget Cut; Production Outage
- **Late (Turns 9–12)**: Refactor Investment; Competitive Threat; Board Review; Launch / Endgame

#### 7.2 Follow-Ups (branching, light)

- Each of 3–4 backbone cards has 1–2 sequels triggered by flags:
  - Crunch → Attrition Wave or Team Rally
  - Approve Promotion → New Lead Struggles or New Lead Shines
  - Cut Scope → Stakeholder Pushback
  - Refactor → Velocity Dip then Stability Win
- **Target deck v1**: 12 backbone + 6 follow-ups = 18 total.

### 8) Milestones & Endings

- **Quarterly (T4, T8)**: Compute score (Velocity, Stakeholder, Trust, Morale, − TechDebt).
  - Outcomes: Budget up/down; dice bias shift; 1 coach tip; 1 sentence chapter title.
- **Annual (T12) / Endings**:
  - IPO / Unicorn: Financials ≥ 70, Stakeholder ≥ 70, Velocity ≥ 70
  - Acquired: Financials ≥ 70, Stakeholder ≥ 70, Vision ≥ 60
  - High-Trust Leader: Trust ≥ 65 & Culture ≥ 60
  - Balanced Operator: All core stats ≥ 50
  - Fired: Trust < 30 & Stakeholder < 40 (hard fail)
  - Out of Business: Financials ≤ 0 (hard fail)
  - Crisis Survivors: Recovered from meltdown/attrition with middling score

### 9) Educational Layer (non-negotiable)

- **Journey Log (every turn)**:
  - “You chose X. Immediate effect: A↑, B↓. Why it can work: … Risk: … Watch: …”
- **Coach Tips (milestones)**: 1–2 line guidance anchored to recent patterns.
- **Post-Mortem (end)**:
  - 4 bullets: Strengths, Blind Spots, Pivotal Turns, What to try next (archetype/template/modifier suggestions).
- **Glossary Tooltips**: Terms like “Tech Debt,” “Attrition” have brief, practical definitions.

### 10) Economy / Resources (Oregon Trail feel)

- Runway Months, Burn Rate, MAU, Revenue Index (simple models tied to Financials/Velocity/External).
- Supply-like feel: visible depletion/refill moments; strategic tradeoffs (spend goodwill now vs earn later).

### 11) UX Requirements

- **Clarity first**: Stats sidebar with color-coded changes (+/−), dice panel with 4 icons, scenario card with 3 options + optional modifier.
- **Feedback**: Animate stat changes (brief flash), badge “Favored” when dice/archetype boost an option.
- **Journal**: Persistent journey log panel; milestone chapters visually distinct.
- **Pace**: 20–40 seconds per turn read/choose; milestone beats feel like “chapters.”

### 12) Balancing Rules

- **Tradeoffs**: Every option must raise ≥1 stat and lower ≥1 stat (no free wins).
- **Scaling**: Effects scale with context (e.g., low morale amplifies crunch penalties).
- **Caps & Floors**: Clamp 0–100; introduce soft caps where needed (e.g., diminishing returns on repeated crunch).
- **Randomness**: Luck modifies outcomes but doesn’t override player agency; use it for color and spice.

### 13) Meta-Progression

- **Leader Brand Points**: Earn across runs (Operator/Servant/Visionary tracks).
- **Unlocks**: New scenarios, perks (e.g., +1 influence reroll), harder templates (Funding Winter).
- **Career Ladder**: Promotion titles as cosmetic achievements (Mgr → Dir → VP → CTO).

### 14) Telemetry (for learning & tuning)

- **Per turn**: scenario id, option id, dice, deltas, thresholds crossed, time to decide.
- **Per run**: archetype/template, ending, number of turns, milestone scores.
- **Qual**: quick post-run rating (“realistic?” / “learned?” / “play again?”).

### 15) Content Guidelines (authoring checklist)

For each scenario:

- **Title + 1-liner**: concrete tension (“Deadline slips; pressure mounts.”)
- **3 Options**: clear verbs; tradeoffs explicit; tags (e.g., people, execution, stakeholder).
- **Modifier hooks**: which modifier(s) bias outcomes (Empathy/Execution/Strategic or Light/Moderate/Hard).
- **Immediate Effects**: 2–4 stat changes (±3 to ±8 typical).
- **Delayed Effects**: 0–2 queued changes (turn+1..3).
- **Dice Gates/Boosts**: availability or effectiveness tied to dice.
- **Flags**: optional sequel triggers.
- **Journey Insight**: a sentence of why/risk/watch.

### 16) Failure & Crisis Design

- **True Game Over**: Fired, Out of Business only.
- **Crisis (continue with penalties)**: Team Collapse, Tech Meltdown, Market Shock → heavy stat hits + crisis sub-deck for next 2–3 turns.
- **Comeback stories**: Explicit paths for recovery (e.g., apology tour, retention sprint, stabilizing refactor).

### 17) Accessibility & Tone

- Inclusive language; avoid glamorizing crunch.
- Subtitles/tooltips for all icons; color-blind safe palette.
- Short, punchy text; 6th–8th grade reading level for speed.

### 18) Roadmap (2 sprints)

- **Sprint 1 (MVP backbone)**:
  - 12 scenarios (no follow-ups yet), dice-biased selection.
  - 3 options + 1 simple modifier (Light/Moderate/Hard) on 3 scenarios.
  - Immediate + delayed effects; thresholds for 3 crisis types.
  - Milestones (T4, T8, T12) with coach tips; 4 endings.
  - Journey Log + Post-Mortem.

- **Sprint 2 (Depth & stickiness)**:
  - Add 6 follow-ups; influence reroll resource; “Favored” badges.
  - Economy model (runway/burn) tied to Financials.
  - Meta-progression: brand points + simple perk.
  - Telemetry + balancing pass.

### 19) Risks & Mitigations

- **Too random**: cap Luck impact; add influence reroll.
- **Too lecture-y**: keep insights short, pragmatic; show not tell.
- **Analysis paralysis**: 3 options only + compact hints; modifiers optional.
- **Content load**: start with backbone; add follow-ups incrementally.

### 20) Definition of Done (MVP)

- 12-turn run playable end-to-end in <10 minutes.
- Each turn generates a Journey Log entry; milestones generate chapter summaries.
- Post-Mortem highlights strengths, blind spots, 2 “try next” tips.
- At least 4 distinct endings reachable; at least 2 archetypes feel different.
- ≥70% of playtesters report it’s “useful for practicing leadership tradeoffs.”


