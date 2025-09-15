Leadership Simulator (Prototype)
🎯 Goal

A lightweight role simulator for engineering leadership.
Players step into the shoes of a manager making tradeoff decisions under pressure.
The intent is both fun (like a roguelike or sim) and educational (reinforcing best practices in leadership).

🕹 Gameplay Loop

Dice Roll – Each turn rolls 4 dice:

Internal (team health, morale, execution)

External (market, stakeholders, environment)

Opportunity (growth, innovation, upside)

Luck (random chance)

Scenario – Dice + state bias which scenario appears (e.g., crunch time, budget cuts, outages).

Options – Player sees 2–3 options.
Each has tradeoffs (no “perfect” choices).

Choice – Player picks one option.

Stats Update – Immediate and delayed effects are applied to:

Leader stats: trust, execution, vision, culture

Company stats: morale, velocity, tech debt, stakeholder alignment, financials

Hidden stats: burnout, attrition, crisis

Milestones – Every 3 turns = quarterly review; turn 12 = annual review.
These can trigger events or endings (IPO, fired, out of business, trusted leader, balanced operator).

📊 Current Prototype

Runs in the browser only (HTML + CSS + JS).

Uses local JSON files (deck.json, milestones.json) for scenarios and milestone rules.

Persists state only in-memory (refresh = restart).

2 starter scenarios (crunch_time, promotion_request) as proof of concept.

Visuals are minimal: text-driven choices, stat display on sidebar.

🚧 Next Steps
For Dev

Expand deck.json with 8–10 varied scenarios (conflicts, outages, budget cuts, customer escalations).

Implement milestone logic (quarterly/annual reviews with score formulas).

Add delayed effects queue.

Save/load state via localStorage (so sessions persist).

Consider a “meta-progression” layer (leader brand, speaking gigs, promotions).

For Design

Improve UI feedback (stat changes with color-coded animations).

Add dice visuals to reinforce randomness + drama.

Style option cards for readability and fun factor.

Explore light narrative flavor text for immersion.

For PM

Validate if the simulator:

Is fun (engaging turn-to-turn choices).

Is educational (reinforces leadership lessons).

Is sticky (encourages replay, different outcomes).

Define success metrics (avg turns played, replay rate, NPS on “felt realistic/valuable”).

Identify target audience (aspiring managers? leadership workshops? solo play?).

🗂 Files

index.html — container UI

style.css — basic styles

script.js — game loop + logic

deck.json — scenarios & options

milestones.json — quarterly/annual review rules (stubbed)

(future) README.md (this file)
