Leadership Simulator (Prototype)
🎯 Vision

We’re building a role simulator game for engineering leadership.
There are endless books and courses on “how to manage,” but little that lets people practice.
This game puts players in the role of an engineering leader, making hard tradeoff decisions under uncertainty.
It’s designed to be both:

Fun: playful, replayable, with dice and scenarios like a roguelike.

Educational: reinforcing what good (and not-so-good) leadership looks like.

Sticky: each run feels different, with replay value and “what if I’d chosen differently?” curiosity.

🕹 Core Gameplay Loop

Dice Roll – Four dice each turn:

Internal (team morale, execution)

External (market, stakeholders)

Opportunity (growth, innovation)

Luck (random chance)
The dice influence which scenarios are drawn and which options are available.

Scenario – A situation is presented (e.g. crunch time, production outage).
Dice and state bias the selection.

Options – 2–3 choices appear.

Every option has tradeoffs (no perfect answers).

On paper, even “bad-sounding” options (like weekend crunch) might be the best in context.

Choice → Stat Deltas

Immediate effects update leader/company stats.

Delayed effects may trigger later (e.g. burnout → attrition).

Milestones

Quarterly Reviews every 3 turns. Score formula blends velocity, stakeholder alignment, trust, morale, and tech debt.

Annual Review at turn 12 ends the run with an outcome (IPO, Fired, Out of Business, High-Trust Leader, Balanced Operator).

📊 Stats

Leader: trust, execution, vision, culture

Company: morale, velocity, tech debt, stakeholder alignment, financials

Hidden: burnout, attrition, crisis (derived, not shown directly)

Stats start based on Leader Archetype + Company Template.

🧑‍🤝‍🧑 Leader Archetypes

At the start of a run, you pick a leader style.
This sets initial stats and shapes play:

Operator: high execution, moderate trust/vision, lower culture

Servant Leader: high culture/trust, weaker execution

Visionary: high vision, lower execution

Firefighter: scrappy, strong in crisis, weaker long-term trust/culture

🏢 Company Templates

Different starting environments:

Startup: scrappy, lower stakeholder alignment & cash, high velocity

Scaleup: higher financials, but rising tech debt

BigCo: strong financials/stakeholders, but sluggish velocity

🎲 Example Scenarios (Deck)

We brainstormed a starter deck of 8 scenarios (expandable later):

First Standup — set meeting style (round robin, blockers-first).

Crunch Time — slipping deadline (crunch, cut scope, negotiate).

Promotion Request — senior IC wants a lead role (approve, deny, growth plan).

Design Conflict — seniors disagree on architecture (pick quick, facilitate, escalate).

Budget Cut — CFO demands reduction (contractors, freeze, negotiate).

Production Outage — catastrophic bug (lead fix, manage comms, escalate).

Customer Escalation — top client threatening churn (discount, hotfix, exec call).

Refactor Investment — engineers want big refactor (limited, full, defer).

Each option has immediate & delayed effects, sometimes conditional on dice or hidden stats (e.g. burnout → attrition).

🛠 Current Prototype

Pure browser app (HTML/CSS/JS).

Uses local JSON (deck.json, milestones.json) to define scenarios & milestone rules.

Persists state in-memory (refresh = reset).

2 sample scenarios wired up: crunch_time, promotion_request.

Shows stat sidebar + scenario card + clickable options.

🚧 Next Steps
Dev

Expand deck with full 8+ scenarios.

Implement delayed effects queue.

Add milestone scoring (quarterly/annual reviews).

Persist state in localStorage.

Add randomization/refresh to keep deck fresh.

Design

Better UI feedback (dice visuals, stat change animations).

Option cards styled like a board game.

Flavor/narrative text for immersion.

PM

Validate target audience (aspiring managers, leadership workshops).

Success metrics: replay rate, perceived realism, learning value.

Prioritize features: deck variety vs. polish vs. meta-progression.

📂 Files

index.html — UI container

style.css — styling

script.js — game loop logic

deck.json — scenarios & options

milestones.json — milestone rules

README.md — this file
