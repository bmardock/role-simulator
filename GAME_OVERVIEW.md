## App setup and architecture

- **Frontend**
  - `index.html`: Shell (header, stats sidebar, scenario panel).
  - `style.css`: Dark UI, cards, option styling, badges, outcome/turn-log styles.
  - `script.js`: Game state, mechanics, dice/turn loop, UI rendering, outcome.
  - `scenarioService.js`: Client for POST `/api/scenario`, timeouts, context build.

- **Backend**
  - `server.js` (Express): POST `/api/scenario` → OpenAI; JSON-only; validates/normalizes payload; prewarms cache; latency logs.

## Core game loop

1. Start → Recruiter intro → `startGame()` initializes `state`, preloads scenarios.
2. Each turn:
   - `rollDice()` → `currentDice = diceRoll()`
   - `selectScenario()`:
     - Uses preloaded queue if available; else calls service for a single scenario.
     - Saves `state.currentScenario`, `state.currentScenarioId`, and `lastScenarioWhy`.
   - UI: `showDiceImpact()` renders dice and the scenario; `showOptions()` renders 3 options with descriptions and badges.
3. Choose option:
   - `applyChoice(scenario, optionId, option)`:
     - Scales and applies `option.immediate` via `scaleEffects()`.
     - Updates `state` (leader, company, hidden, economy) and records `recentChoices`/`turnLog`.
     - Runs `processDelayedEffects()`, `tickEconomy()`, `checkMilestones()`, `checkPromotion()`.
     - `showOutcomeSummary()` displays: service `option.summary` (or fallback), “Why this”, deltas, watchlist, and a Turn Log.

## Game state (key fields)

- `state.leader`: `trust`, `execution`, `vision`, `culture`.
- `state.company`: `morale`, `velocity`, `tech_debt`, `stakeholder`, `financials`.
- `state.hidden`: `burnout`, `attrition`, `crisis`.
- `state.economy`: `runwayMonths`, `burnRate`, `mau`, `revenueIndex`.
- `state.flags`: narrative/continuity flags (also inferred as `chose_<tag>` from options).
- `state.followups`: scheduled scenarios (turn-indexed).
- `state.recentChoices` / `state.turnLog`: recent decisions for continuity and UI.
- `state.currentScenario`, `state.currentScenarioId`, `currentDice`.

## “Physics” and mechanics (where the math lives)

- `scaleEffects(effects, option)`
  - Multiplies raw deltas by:
    - `tuning.base`, `tuning.phase[early|mid|late]`, `tuning.template[startup|scaleup|bigco]`.
    - Pressure scaling from `computePressure()`.
    - Archetype effectiveness via `option.tags` (e.g., `execution_focused`, `collaborative`).
    - Dice influence multipliers (positive/negative).

- `computePressure()`
  - Weighted function of stakeholder, financials, crisis → 0–100 “pressure”. Higher pressure amplifies effects.

- `tickEconomy()`
  - Updates `mau` (growth from velocity/opportunity/crisis), `revenueIndex`, `runwayMonths`, and maps to `company.financials`. Triggers GAME OVER on zero runway.

- `processDelayedEffects()`
  - Applies scheduled future deltas from `state.delayed` when due.

- `checkMilestones()`
  - Every 3 turns calculates a quarterly score (`calculateQuarterlyScore()`), applies milestone effects.
  - On `annual.turn` checks endings via condition evaluation.

- `checkPromotion()` / `computePromotionProgress()`
  - Progresses company template (e.g., startup → scaleup) based on composite of company stats; nudges stats on change.

## Scenario service

- Client: `scenarioService.js`
  - `buildContextFromState(state)`: builds minimal context (turn, template, archetype, stats, flags, `recentScenarios`, dice impact) for the API.
  - `asyncRequest(context)`: POSTs to `/api/scenario`, with timeouts (single: 6s, batch: 8s) and `Accept: application/json`.

- Server: `server.js`
  - Validates/normalizes JSON response:
    - Ensures exactly 3 options with `{ hint, description, immediate, tags, summary }`.
    - Filters deltas to allowed keys; guarantees 2–3 tradeoffs; derives `summary` if missing.
  - Prewarms a cache on startup and logs OpenAI latency/usage.

## UI elements that matter to players

- **Dice section**: shows the 4 dice and a short line describing influence (internal/external/opportunity/luck).
- **Option badges**: tags (e.g., `strategic`, `crisis_response`) and a “Favored” badge if dice/topical conditions prefer it.
- **Outcome panel**: service `summary`, “Why this”, improved/regressed lists, watchlist, and a **Turn Log** of recent decisions.

## Notable functions to know

- Turn flow: `rollDice()` → `selectScenario()` → `showDiceImpact()` → `showOptions()` → `applyChoice()` → `showOutcomeSummary()`
- Mechanics: `scaleEffects()`, `computePressure()`, `tickEconomy()`, `processDelayedEffects()`, `checkMilestones()`, `checkPromotion()`
- Service integration: `ScenarioService.buildContextFromState()`, `ScenarioService.asyncRequest()`; server `generateWithOpenAI()` and `normalizeScenario()`

## Extension points

- Add option gating or tooltips based on tags/dice to preview tradeoffs.
- Expand follow-ups: let the service schedule sequels using flags/`recentChoices`.
- Add a sidebar Turn Log (fixed position) for persistent run history.
- Minimize prompt/context for faster responses; cache by context signature for instant reuse.


