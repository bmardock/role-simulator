let state = {};
let deck = {};
let milestones = {};
let gamePhase = "setup"; // 'setup', 'playing', 'ended'
let currentDice = null;
let currentScenario = null;
let seenScenarioIds = new Set();
let lastScenarioWhy = [];

// Scenario queue for instant responses
let scenarioQueue = [];
let isLoadingScenarios = false;
let useServiceFiller = false;

// Seeded RNG (LCG)
let rngState = 1;
function seedRng(seed) {
  rngState = Math.max(1, seed >>> 0);
}
function rngNext() {
  // LCG: Numerical Recipes
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  if (state && typeof state === "object") {
    state.rngState = rngState;
  }
  return rngState;
}
function rngFloat() {
  return rngNext() / 0xffffffff;
}

// Leader archetypes
const leaderArchetypes = {
  operator: {
    name: "Operator",
    description: "High execution, moderate trust/vision, lower culture",
    stats: { trust: 45, execution: 75, vision: 50, culture: 35 },
    // Scenario preferences - what this archetype tends to encounter
    scenarioAffinity: {
      "process_heavy": 2,
      "velocity_low": 2,
      "tech_debt_high": 1.5,
      "stakeholder_pressure": 1.5
    },
    // Option effectiveness modifiers
    optionModifiers: {
      "execution_focused": 1.5,  // Options requiring execution get +50% effect
      "process_heavy": 1.3,
      "quick_decision": 1.4
    }
  },
  servant_leader: {
    name: "Servant Leader",
    description: "High culture/trust, weaker execution",
    stats: { trust: 70, execution: 45, vision: 60, culture: 80 },
    scenarioAffinity: {
      "morale_low": 2.5,
      "burnout_high": 2,
      "team_conflict": 2,
      "culture_building": 2
    },
    optionModifiers: {
      "people_focused": 1.6,
      "culture_building": 1.5,
      "collaborative": 1.4,
      "empathy_driven": 1.5
    }
  },
  visionary: {
    name: "Visionary",
    description: "High vision, lower execution",
    stats: { trust: 60, execution: 40, vision: 85, culture: 55 },
    scenarioAffinity: {
      "strategic_decision": 2.5,
      "innovation": 2,
      "long_term_planning": 2,
      "product_vision": 2
    },
    optionModifiers: {
      "strategic": 1.6,
      "innovative": 1.5,
      "long_term": 1.4,
      "vision_driven": 1.5
    }
  },
  firefighter: {
    name: "Firefighter",
    description: "Scrappy, strong in crisis, weaker long-term trust/culture",
    stats: { trust: 35, execution: 70, vision: 45, culture: 30 },
    scenarioAffinity: {
      "crisis_risk": 3,
      "urgent_deadline": 2.5,
      "production_issue": 2,
      "escalation": 2
    },
    optionModifiers: {
      "crisis_response": 1.7,
      "quick_fix": 1.5,
      "decisive": 1.4,
      "high_pressure": 1.6
    }
  },
};

// Company templates
const companyTemplates = {
  startup: {
    name: "Startup",
    description: "Scrappy, lower stakeholder alignment & cash, high velocity",
    stats: {
      morale: 60,
      velocity: 75,
      tech_debt: 40,
      stakeholder: 35,
      financials: 25,
    },
    // Problems that startups face more often
    scenarioTypes: {
      "velocity_low": 2,
      "financials_low": 3,
      "stakeholder_pressure": 2,
      "resource_constraint": 2.5,
      "growth_pressure": 2,
      "scrappy_solutions": 2
    },
    // Unique scenario categories for startups
    exclusiveScenarios: ["funding_crisis", "mvp_pressure", "early_hiring"]
  },
  scaleup: {
    name: "Scaleup",
    description: "Higher financials, but rising tech debt",
    stats: {
      morale: 55,
      velocity: 65,
      tech_debt: 60,
      stakeholder: 60,
      financials: 70,
    },
    scenarioTypes: {
      "tech_debt_high": 3,
      "scaling_issues": 2.5,
      "process_heavy": 2,
      "team_growth": 2,
      "system_complexity": 2,
      "promotion_pressure": 2.5
    },
    exclusiveScenarios: ["team_restructure", "architecture_debt", "hiring_scale"]
  },
  bigco: {
    name: "BigCo",
    description: "Strong financials/stakeholders, but sluggish velocity",
    stats: {
      morale: 50,
      velocity: 45,
      tech_debt: 70,
      stakeholder: 80,
      financials: 85,
    },
    scenarioTypes: {
      "process_heavy": 3,
      "stakeholder_pressure": 2.5,
      "compliance": 2.5,
      "bureaucracy": 2,
      "legacy_systems": 2,
      "political_navigation": 2
    },
    exclusiveScenarios: ["executive_pressure", "compliance_audit", "legacy_migration"]
  },
};

// Stat descriptions and orientation (higherIsBetter)
const statMeta = {
  leader: {
    trust: {
      desc: "Perceived reliability and integrity by your team and peers.",
      higherIsBetter: true,
    },
    execution: {
      desc: "Ability to deliver on commitments consistently.",
      higherIsBetter: true,
    },
    vision: {
      desc: "Clarity and direction for the team's future.",
      higherIsBetter: true,
    },
    culture: {
      desc: "Psychological safety, inclusion, and healthy norms.",
      higherIsBetter: true,
    },
  },
  company: {
    morale: {
      desc: "Team energy and engagement.",
      higherIsBetter: true,
    },
    velocity: {
      desc: "Throughput and ability to ship value.",
      higherIsBetter: true,
    },
    tech_debt: {
      desc: "Shortcuts and legacy complexity.",
      higherIsBetter: false,
    },
    stakeholder: {
      desc: "Alignment with execs/customers; confidence in the plan.",
      higherIsBetter: true,
    },
    financials: {
      desc: "Financial health (proxied by runway).",
      higherIsBetter: true,
    },
  },
  hidden: {
    burnout: {
      desc: "Exhaustion risk across the team.",
      higherIsBetter: false,
    },
    attrition: {
      desc: "Likelihood of losing people soon.",
      higherIsBetter: false,
    },
    crisis: {
      desc: "Probability of major incidents/escalations.",
      higherIsBetter: false,
    },
  },
};

function statQualityLabel(value, higherIsBetter) {
  const oriented = higherIsBetter ? value : 100 - value; // interpret as health
  if (oriented >= 85) return "Excellent";
  if (oriented >= 70) return "Good";
  if (oriented >= 50) return "Fair";
  if (oriented >= 30) return "Low";
  return "Critical";
}

function formatStatTooltip(group, key, value) {
  const meta = (statMeta[group] && statMeta[group][key]) || {
    desc: "",
    higherIsBetter: true,
  };
  const betterText = meta.higherIsBetter ? "Higher is better" : "Lower is better";
  const label = statQualityLabel(value, meta.higherIsBetter);
  const prettyKey = key.replace(/_/g, " ");
  return `${prettyKey}: ${meta.desc} ${betterText}. Current: ${value} — ${label}.`;
}

// Resume presets (map to leader archetypes)
const resumes = {
  ops_focused: {
    name: "Ops-Focused EM",
    summary:
      "Scaled delivery processes, strong program execution, comfortable saying no to scope creep.",
    mapsTo: "operator",
  },
  people_first: {
    name: "People-First EM",
    summary:
      "Built high-trust teams, excellent coaching/retention, invests in culture and systems.",
    mapsTo: "servant_leader",
  },
  product_vision: {
    name: "Product-Vision EM",
    summary:
      "Shipped 0→1 bets, aligns eng with product strategy, great at storytelling.",
    mapsTo: "visionary",
  },
  crisis_manager: {
    name: "Crisis Manager EM",
    summary:
      "Led on-call and incident programs, excels in ambiguity and firefighting.",
    mapsTo: "firefighter",
  },
};

// Tell-tale signals for each company template (shown by recruiter)
const companySignals = {
  startup: [
    "Runway: ~12 months",
    "Morale swings with releases",
    "Velocity high, process still forming",
  ],
  scaleup: [
    "Hyper-growth hiring last 6–12 months",
    "Tech debt accumulating",
    "Stakeholders more involved",
  ],
  bigco: [
    "Great benefits, stable budget",
    "Decision cycles slower",
    "Legacy systems and compliance",
  ],
};

async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function initState(archetype = "operator", template = "startup") {
  const leaderBase = leaderArchetypes[archetype].stats;
  const companyBase = companyTemplates[template].stats;
  const econDefaults = {
    startup: { runwayMonths: 12, burnRate: 1.2, mau: 10, revenueIndex: 0.6 },
    scaleup: { runwayMonths: 24, burnRate: 2.0, mau: 50, revenueIndex: 1.8 },
    bigco: { runwayMonths: 48, burnRate: 5.0, mau: 300, revenueIndex: 5.2 },
  }[template];

  state = {
    leader: { ...leaderBase },
    company: { ...companyBase },
    hidden: { burnout: 2, attrition: 16, crisis: 5 },
    turn: 1,
    delayed: [],
    archetype: archetype,
    template: template,
    quarterlyScores: [],
    economy: { ...econDefaults },
    flags: {},
    followups: [],
    seed: Date.now(),
    recentScenarios: [],
    lastDeltas: {},
  };
  seenScenarioIds = new Set();
  seedRng(state.seed);
}

function updateStats() {
  const el = document.getElementById("stats");
  let html = "<h3>Leader Stats</h3>";
  for (const [k, v] of Object.entries(state.leader)) {
    const delta = state.lastDeltas?.[`leader.${k}`];
    const chip = renderDeltaChip(delta);
    html += `<div class="stat" title="${formatStatTooltip("leader", k, v)}">${k}: ${v} ${chip}</div>`;
  }
  html += "<h3>Company Stats</h3>";
  for (const [k, v] of Object.entries(state.company)) {
    const delta = state.lastDeltas?.[`company.${k}`];
    const chip = renderDeltaChip(delta);
    html += `<div class="stat" title="${formatStatTooltip("company", k, v)}">${k}: ${v} ${chip}</div>`;
  }
  html += "<h3>Hidden Stats</h3>";
  for (const [k, v] of Object.entries(state.hidden)) {
    const delta = state.lastDeltas?.[`hidden.${k}`];
    const chip = renderDeltaChip(delta);
    html += `<div class="stat" title="${formatStatTooltip("hidden", k, v)}">${k}: ${v} ${chip}</div>`;
  }
  const pressure = computePressure();
  html += `<div><strong>Pressure: ${Math.round(pressure)}</strong></div>`;
  const eco = state.economy;
  html += `<div>Runway: ${eco.runwayMonths.toFixed(1)} mo | Burn: ${eco.burnRate.toFixed(2)} | Rev: ${eco.revenueIndex.toFixed(1)} | MAU: ${formatMAU(eco.mau)}</div>`;
  if (state.template !== "bigco") {
    const { next, percent } = computePromotionProgress();
    html += `<div><strong>Next Level (${companyTemplates[next].name}): ${Math.round(
      percent
    )}%</strong></div>`;
  }
  html += `<div><strong>Turn: ${state.turn}</strong></div>`;
  el.innerHTML = html;
}

function formatMAU(mau) {
  if (mau >= 1000) return `${(mau / 1000).toFixed(1)}m`;
  if (mau >= 1) return `${Math.round(mau)}k`;
  return `${(mau * 1000).toFixed(0)}`;
}

function formatNumber(n) {
  const v = Math.round(n * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function computePressure() {
  const s = state.company.stakeholder;
  const f = state.company.financials;
  const c = state.hidden.crisis;
  // 0-100 scale, higher is more pressure
  const pressure = 0.45 * (100 - s) + 0.35 * (100 - f) + 0.20 * Math.min(100, c * 12);
  return Math.max(0, Math.min(100, pressure));
}

function diceRoll() {
  return {
    internal: rand(),
    external: rand(),
    opportunity: rand(),
    luck: rand(),
  };
}

// Dice influence on scenarios and options
function getDiceInfluence(dice) {
  const influence = {
    scenarioModifiers: {},
    optionFilters: {},
    effectMultipliers: {}
  };
  
  // Internal dice affects team-focused scenarios
  if (dice.internal <= 2) {
    influence.scenarioModifiers.morale_low = 2;
    influence.scenarioModifiers.burnout_high = 1.5;
    influence.optionFilters.team_focused = 'preferred';
  } else if (dice.internal >= 5) {
    influence.scenarioModifiers.team_success = 2;
    influence.optionFilters.ambitious = 'available';
  }
  
  // External dice affects stakeholder/market scenarios
  if (dice.external <= 2) {
    influence.scenarioModifiers.stakeholder_pressure = 2;
    influence.scenarioModifiers.crisis_risk = 1.5;
    influence.optionFilters.defensive = 'preferred';
  } else if (dice.external >= 5) {
    influence.scenarioModifiers.market_opportunity = 2;
    influence.optionFilters.aggressive = 'available';
  }
  
  // Opportunity dice affects innovation/growth scenarios
  if (dice.opportunity <= 2) {
    influence.scenarioModifiers.resource_constraint = 1.5;
    influence.optionFilters.conservative = 'preferred';
  } else if (dice.opportunity >= 5) {
    influence.scenarioModifiers.innovation = 2;
    influence.scenarioModifiers.growth_opportunity = 2;
    influence.optionFilters.innovative = 'available';
  }
  
  // Luck affects crisis and unexpected scenarios
  if (dice.luck <= 2) {
    influence.scenarioModifiers.crisis_risk = 2;
    influence.scenarioModifiers.unexpected_problem = 1.5;
    influence.effectMultipliers.negative = 1.2;
  } else if (dice.luck >= 5) {
    influence.scenarioModifiers.lucky_break = 2;
    influence.effectMultipliers.positive = 1.2;
  }
  
  return influence;
}

function rand() {
  return Math.floor(rngFloat() * 6) + 1;
}

async function rollDice() {
  currentDice = diceRoll();
  // persist for autosave/resume
  state.currentDice = currentDice;
  await selectScenario();
  showDiceImpact();
}

async function selectScenario() {
  const turn = state.turn;
  const phase = turn === 1 ? "early" : turn <= 6 ? "mid" : "late";

  // 0) Due follow-ups first (deck-driven continuity)
  const dueIdx = state.followups.findIndex((f) => f.turn <= state.turn);
  if (dueIdx !== -1) {
    const f = state.followups.splice(dueIdx, 1)[0];
    const sc = deck.scenarios && deck.scenarios[f.scenarioId];
    if (sc) {
      currentScenario = sc;
      state.currentScenario = sc;
      state.currentScenarioId = f.scenarioId;
      seenScenarioIds.add(f.scenarioId);
      lastScenarioWhy = ["Follow-up from earlier decision"];
      return;
    }
  }

  // 1) Build deck candidates by phase and freshness
  let entries = deck.scenarios ? Object.entries(deck.scenarios) : [];
  if (!entries.length) {
    // Optional filler via service
    if (useServiceFiller && window.ScenarioService && typeof window.ScenarioService.asyncRequest === 'function') {
      showScenarioLoading();
      const ctx = window.ScenarioService.buildContextFromState(state);
      ctx.requestType = 'single';
      const svc = await window.ScenarioService.asyncRequest(ctx);
      if (svc && svc.id && svc.scenario) {
        currentScenario = svc.scenario;
        state.currentScenario = currentScenario;
        state.currentScenarioId = svc.id;
        lastScenarioWhy = ["Service filler: no deck candidates"]; return;
      }
    }
    console.warn("Deck is empty - cannot select scenario"); return;
  }
  entries = shuffleEntries(entries);
  let candidates = entries.filter(([id, sc]) => sc.phase === phase && !seenScenarioIds.has(id));

  // Keep momentum: same phase then adjacent phases
  if (candidates.length === 0) candidates = entries.filter(([id, sc]) => sc.phase === phase);
  if (candidates.length === 0) {
    const adj = phase === "early" ? ["mid"] : phase === "mid" ? ["early", "late"] : ["mid"];
    for (const p of adj) {
      candidates = entries.filter(([id, sc]) => sc.phase === p && !seenScenarioIds.has(id));
      if (candidates.length) break;
    }
  }
  if (candidates.length === 0) candidates = entries;

  // 2) Flags gating
  candidates = candidates.filter(([id, sc]) => {
    const req = sc.requiresFlags || [];
    for (const flag of req) if (!state.flags[flag]) return false;
    return true;
  });
  if (candidates.length === 0) candidates = entries;

  // 3) Weight by tags, weak stats, template, and dice influence
  const { weighted, reasonsById } = weightScenarios(candidates);
  const [sid, scenario] = pickWeighted(weighted);
  currentScenario = scenario;
  state.currentScenario = scenario;
  state.currentScenarioId = sid;
  seenScenarioIds.add(sid);
  lastScenarioWhy = reasonsById[sid] || [];
  state.recentScenarios = [sid, ...(state.recentScenarios || [])].slice(0, 5);
  if (turn === 1) localStorage.setItem("lastStartScenarioId", sid);
  return;
}

function shuffleEntries(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rngFloat() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function weightScenarios(candidates) {
  const weights = [];
  const reasonsById = {};
  const diceInf = getDiceInfluence(currentDice || { internal: 3, external: 3, opportunity: 3, luck: 3 });

  for (const [id, sc] of candidates) {
    let w = 1;
    const reasons = [];
    const tags = sc.tags || [];
    const L = state.leader;
    const C = state.company;
    const H = state.hidden;
    const pressure = computePressure();

    // Pain-point alignment
    for (const t of tags) {
      if (t === "velocity_low" && C.velocity <= 55) { w += 2; reasons.push("Velocity is low"); }
      if (t === "morale_low" && C.morale <= 55) { w += 2; reasons.push("Morale is low"); }
      if (t === "tech_debt_high" && C.tech_debt >= 60) { w += 2; reasons.push("Tech debt is high"); }
      if (t === "financials_low" && C.financials <= 40) { w += 2; reasons.push("Financials are tight"); }
      if (t === "trust_low" && L.trust <= 50) { w += 2; reasons.push("Leader trust is low"); }
      if (t === "stakeholder_pressure" && (C.stakeholder <= 55 || pressure >= 60)) { w += 2; reasons.push("Stakeholder pressure is high"); }
      if (t === "burnout_high" && H.burnout >= 5) { w += 2; reasons.push("Burnout risk rising"); }
      if (t === "crisis_risk" && H.crisis >= 5) { w += 2; reasons.push("Crisis risk elevated"); }
      if (t === "onboarding" && state.turn === 1) { w += 3; reasons.push("Onboarding phase"); }
    }

    // Template bias
    const templateBias = {
      startup: { velocity_low: 1, stakeholder_pressure: 1, financials_low: 1, tech_debt_high: 1 },
      scaleup: { tech_debt_high: 2, morale_low: 1, promotion_pressure: 1, stakeholder_pressure: 1 },
      bigco: { stakeholder_pressure: 1, process_heavy: 2, crisis_risk: 1 },
    }[state.template] || {};
    for (const t of tags) {
      const inc = templateBias[t];
      if (inc) { w += inc; reasons.push(`Environment: ${state.template}`); }
    }

    // Dice influence
    for (const t of tags) {
      const inc = diceInf.scenarioModifiers && diceInf.scenarioModifiers[t];
      if (inc) { w *= inc; reasons.push("Dice influence"); }
    }

    // Novelty penalty
    const recent = state.recentScenarios || [];
    const idx = recent.indexOf(id);
    if (idx !== -1) {
      const penalty = Math.max(0.1, 1 - 0.2 * (idx + 1));
      w *= penalty;
      reasons.push("Avoiding repeats");
    }

    weights.push([id, sc, Math.max(0.1, w)]);
    reasonsById[id] = reasons;
  }
  return { weighted: weights, reasonsById };
}

function pickWeighted(weightedTuples) {
  const total = weightedTuples.reduce((s, [, , w]) => s + w, 0);
  let r = rngFloat() * total;
  for (const [id, sc, w] of weightedTuples) {
    if ((r -= w) <= 0) return [id, sc];
  }
  return weightedTuples[weightedTuples.length - 1].slice(0, 2);
}

function getDiceReason(tag, dice) {
  if (tag === "morale_low" && dice.internal <= 2) return "low internal morale";
  if (tag === "stakeholder_pressure" && dice.external <= 2) return "external pressure";
  if (tag === "crisis_risk" && dice.luck <= 2) return "bad luck";
  if (tag === "innovation" && dice.opportunity >= 5) return "high opportunity";
  return "dice influence";
}

function generateFallbackScenario() {
  const archetype = leaderArchetypes[state.archetype];
  const template = companyTemplates[state.template];
  const phase = state.turn === 1 ? "early" : state.turn <= 6 ? "mid" : "late";
  
  // Generate scenario based on current context
  const scenarios = {
    early: {
      title: "Team Onboarding",
      text: "As the new leader, you need to establish your approach with the team. How do you want to start building relationships and setting expectations?",
      tags: ["onboarding", "team_norms"]
    },
    mid: {
      title: "Priority Conflict", 
      text: "Multiple urgent requests are competing for your team's attention. Stakeholders want features, engineers want refactoring time, and deadlines are tight.",
      tags: ["stakeholder_pressure", "velocity_low"]
    },
    late: {
      title: "Strategic Decision",
      text: "The company is at a crossroads and needs your team to make a strategic technology choice that will impact the next year of development.",
      tags: ["strategic_decision", "long_term_planning"]
    }
  };
  
  const scenario = scenarios[phase];
  scenario.options = {
    option1: {
      hint: "Quick action",
      description: "Take immediate decisive action to move things forward.",
      tags: ["execution_focused", "quick_decision"],
      immediate: { "company.velocity": 2, "leader.trust": -1 }
    },
    option2: {
      hint: "Collaborate",
      description: "Bring the team together to discuss and find a collaborative solution.",
      tags: ["collaborative", "people_focused"],
      immediate: { "leader.trust": 2, "company.velocity": -1 }
    },
    option3: {
      hint: "Escalate",
      description: "Escalate to leadership for guidance and additional resources.",
      tags: ["strategic", "conservative"],
      immediate: { "company.stakeholder": 1, "company.morale": -1 }
    }
  };
  
  return scenario;
}

// pickWeighted function removed - no longer needed since all scenarios come from service

function showScenarioLoading() {
  document.getElementById("scenario").innerHTML = `
    <div class="dice-display">
      <h3>Dice Roll</h3>
      <div class="dice-values">
        <div class="dice-item">Internal: <span class="dice-value">${currentDice.internal}</span></div>
        <div class="dice-item">External: <span class="dice-value">${currentDice.external}</span></div>
        <div class="dice-item">Opportunity: <span class="dice-value">${currentDice.opportunity}</span></div>
        <div class="dice-item">Luck: <span class="dice-value">${currentDice.luck}</span></div>
      </div>
      <div class="dice-impact">
        <p>🤖 Generating scenario tailored to your leadership style...</p>
      </div>
    </div>
  `;
  document.getElementById("options").innerHTML = "";
}

function showDiceImpact() {
  const diceInfluence = getDiceInfluence(currentDice);
  const impactTexts = [];
  
  if (currentDice.internal <= 2) impactTexts.push("Internal team issues likely");
  else if (currentDice.internal >= 5) impactTexts.push("Team performing well");
  
  if (currentDice.external <= 2) impactTexts.push("External pressure mounting");
  else if (currentDice.external >= 5) impactTexts.push("External opportunities available");
  
  if (currentDice.opportunity <= 2) impactTexts.push("Limited resources/options");
  else if (currentDice.opportunity >= 5) impactTexts.push("Innovation opportunities");
  
  if (currentDice.luck <= 2) impactTexts.push("Crisis risk elevated");
  else if (currentDice.luck >= 5) impactTexts.push("Lucky breaks possible");

  document.getElementById("scenario").innerHTML = `
    <div class="dice-display">
      <h3>Dice Roll</h3>
      <div class="dice-values">
        <div class="dice-item">Internal: <span class="dice-value">${currentDice.internal}</span></div>
        <div class="dice-item">External: <span class="dice-value">${currentDice.external}</span></div>
        <div class="dice-item">Opportunity: <span class="dice-value">${currentDice.opportunity}</span></div>
        <div class="dice-item">Luck: <span class="dice-value">${currentDice.luck}</span></div>
      </div>
      <div class="dice-impact">
        <p><strong>Dice Influence:</strong> ${impactTexts.length ? impactTexts.join(" • ") : "Neutral situation"}</p>
      </div>
    </div>
    <div class="scenario-content">
      <h2>${currentScenario.title}</h2>
      <p>${currentScenario.text}</p>
      ${lastScenarioWhy.length ? `<div class="why-scenario">Why this: ${lastScenarioWhy.join(", ")}</div>` : ""}
    </div>
  `;

  showOptions();
}

function showOptions() {
  const optEl = document.getElementById("options");
  optEl.innerHTML = "";
  const diceInf = getDiceInfluence(currentDice);
  for (const [oid, opt] of Object.entries(currentScenario.options)) {
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `
      <div class="option-title">${opt.hint}</div>
      <div class="option-description">${opt.description}</div>
      ${renderOptionBadges(opt, diceInf)}
    `;
    div.onclick = () => applyChoice(currentScenario, oid, opt);
    optEl.appendChild(div);
  }
}

function renderOptionBadges(opt, diceInf) {
  const tags = opt.tags || [];
  const favFilters = diceInf && diceInf.optionFilters ? diceInf.optionFilters : {};
  let favored = false;
  for (const t of tags) {
    if (favFilters[t] === 'preferred') { favored = true; break; }
  }
  const tagBadges = tags.map(t => `<span class="badge badge-tag">${t.replace(/_/g,' ')}</span>`).join(' ');
  const favBadge = favored ? `<span class="badge badge-favored">Favored</span>` : '';
  if (!tagBadges && !favBadge) return '';
  return `<div class="option-badges">${favBadge} ${tagBadges}</div>`;
}

function showScenario() {
  // This is now just for the initial setup - actual gameplay uses rollDice()
  if (!currentDice) {
    // try to restore from state
    if (state.currentDice) currentDice = state.currentDice;
  }
  if (!currentScenario) {
    if (state.currentScenario) currentScenario = state.currentScenario;
  }
  if (!currentDice || !currentScenario) {
    document.getElementById("scenario").innerHTML = `
      <div class="wait-for-dice">
        <h3>Resume Turn ${state.turn}</h3>
        <p>Ready to continue?</p>
      </div>
    `;
    document.getElementById("options").innerHTML = `
      <button class="roll-dice-btn" onclick="rollDice()">Roll Dice</button>
    `;
    return;
  }
  showDiceImpact();
}

function applyChoice(sc, oid, opt) {
  const prev = JSON.parse(JSON.stringify(state));
  // Apply immediate effects with archetype/dice scaling
  const immediate = ensureTradeoffs(opt.immediate || {});
  const scaled = scaleEffects(immediate, opt);
  for (const [k, v] of Object.entries(scaled)) {
    const [grp, key] = k.split(".");
    if (state[grp] && state[grp][key] !== undefined) {
      state[grp][key] = Math.max(0, Math.min(100, state[grp][key] + v));
    }
    // economy deltas
    if (grp === "economy" && state.economy[key] !== undefined) {
      state.economy[key] = Math.max(0, state.economy[key] + v);
    }
  }

  // Record recent choice for continuity (max 5)
  try {
    const choiceEntry = {
      turn: state.turn,
      scenarioId: state.currentScenarioId || null,
      scenarioTitle: sc && sc.title ? sc.title : null,
      optionId: oid,
      optionHint: opt && opt.hint ? opt.hint : oid,
      tags: opt.tags || [],
      immediate: opt.immediate || {},
      summary: opt.summary || ""
    };
    state.recentChoices = [choiceEntry, ...(state.recentChoices || [])].slice(0, 5);
    state.turnLog = [choiceEntry, ...(state.turnLog || [])].slice(0, 12);
  } catch (_) {}

  // Infer simple flags from option tags to drive continuity
  try {
    const tags = opt.tags || [];
    state.flags = state.flags || {};
    for (const t of tags) state.flags[`chose_${t}`] = true;
  } catch (_) {}

  // Apply delayed effects
  if (opt.delayed) {
    state.delayed.push({
      turn: state.turn + (opt.delayed.turns || 1),
      effects: opt.delayed.effects,
    });
  }

  // Set narrative flags
  if (opt.setFlags) {
    for (const fl of opt.setFlags) state.flags[fl] = true;
  }

  // Schedule a follow-up scenario
  if (opt.followup) {
    const when = opt.followup.turns !== undefined ? opt.followup.turns : 1;
    state.followups.push({ turn: state.turn + when, scenarioId: opt.followup.scenarioId });
  }

  // Process delayed effects
  processDelayedEffects();

  // Show outcome summary
  showOutcomeSummary(sc, oid, opt, prev);

  state.turn++;

  // Check for milestones
  checkMilestones();

  // Economy tick at end of turn
  tickEconomy();

  updateStats();

  // Check for template promotion
  checkPromotion();

  // Keep the outcome summary visible with a Next Turn button

  // autosave after each turn
  autoSave();
}

// Centralized tuning for effect magnitudes
const tuning = {
  base: 1.2, // global boost to make actions feel impactful
  phase: { early: 1.1, mid: 1.25, late: 1.35 },
  template: { startup: 1.2, scaleup: 1.1, bigco: 1.0 },
  pressureBoost: 0.5, // up to +50% at 100 pressure
};

function scaleEffects(effects, option = {}) {
  const phase = state.turn === 1 ? "early" : state.turn <= 6 ? "mid" : "late";
  const pressure = computePressure();
  const archetype = leaderArchetypes[state.archetype];
  const diceInfluence = getDiceInfluence(currentDice);
  
  let mult =
    (tuning.base || 1) *
    (tuning.phase[phase] || 1) *
    (tuning.template[state.template] || 1) *
    (1 + (tuning.pressureBoost || 0) * (pressure / 100));

  // ARCHETYPE EFFECTIVENESS - options work better/worse based on leadership style
  const optionTags = option.tags || [];
  for (const tag of optionTags) {
    const modifier = archetype.optionModifiers[tag];
    if (modifier) {
      mult *= modifier;
    }
  }
  
  // DICE INFLUENCE ON EFFECTS
  if (diceInfluence.effectMultipliers.positive && hasPositiveEffects(effects)) {
    mult *= diceInfluence.effectMultipliers.positive;
  }
  if (diceInfluence.effectMultipliers.negative && hasNegativeEffects(effects)) {
    mult *= diceInfluence.effectMultipliers.negative;
  }

  const scaled = {};
  for (const [k, v] of Object.entries(effects)) {
    // keep integers for stat feel, round towards zero for small values
    const val = Math.abs(v) < 1 ? v * mult : Math.round(v * mult);
    scaled[k] = val;
  }
  return scaled;
}

// Ensure every choice has a tradeoff (at least one positive and one negative)
function ensureTradeoffs(effects) {
  try {
    const values = Object.values(effects);
    if (!values.length) return effects;
    const hasPos = values.some((v) => v > 0);
    const hasNeg = values.some((v) => v < 0);
    if (hasPos && hasNeg) return effects;

    // Derive a small counterweight so choices never feel free
    const clone = { ...effects };
    if (hasPos && !hasNeg) {
      const avgPos = values.filter((v) => v > 0).reduce((a, b) => a + b, 0) / Math.max(1, values.filter((v) => v > 0).length);
      const penalty = -Math.max(1, Math.round(Math.abs(avgPos) / 3));
      // Choose a related counter stat
      const key = clone["company.morale"] === undefined ? (clone["company.velocity"] === undefined ? "leader.trust" : "company.velocity") : "company.morale";
      clone[key] = (clone[key] || 0) + penalty;
      return clone;
    }
    if (hasNeg && !hasPos) {
      const avgNeg = Math.abs(values.filter((v) => v < 0).reduce((a, b) => a + b, 0)) / Math.max(1, values.filter((v) => v < 0).length);
      const gain = Math.max(1, Math.round(avgNeg / 3));
      const key = clone["leader.trust"] === undefined ? "company.stakeholder" : "leader.trust";
      clone[key] = (clone[key] || 0) + gain;
      return clone;
    }
    return effects;
  } catch (_) {
    return effects;
  }
}

function hasPositiveEffects(effects) {
  return Object.values(effects).some(v => v > 0);
}

function hasNegativeEffects(effects) {
  return Object.values(effects).some(v => v < 0);
}

function baselineMAUForTemplate(tpl) {
  return tpl === "startup" ? 10 : tpl === "scaleup" ? 50 : 300;
}

function tickEconomy() {
  const E = state.economy;
  const C = state.company;
  const H = state.hidden;
  const tpl = state.template;

  // MAU growth influenced by velocity, opportunity dice, crisis
  const base = Math.max(0.5, baselineMAUForTemplate(tpl));
  const velTerm = (C.velocity - 50) / 50; // -1..+1
  const oppTerm = currentDice ? (currentDice.opportunity - 3) / 6 : 0; // ~-0.33..+0.5
  const crisisTerm = -H.crisis / 20; // -0.4 at crisis=8
  let growth = 0.03 * velTerm + 0.02 * oppTerm + crisisTerm;
  // clamp mau change to ±10%
  const maxDelta = E.mau * 0.1 + 1;
  const deltaMAU = Math.max(-maxDelta, Math.min(maxDelta, E.mau * growth));
  E.mau = Math.max(0, E.mau + deltaMAU);

  // Revenue mixes MAU normalization with stakeholder alignment
  const mauNorm = Math.max(0, Math.min(1, E.mau / (base * 2)));
  E.revenueIndex = 0.7 * mauNorm + 0.3 * (C.stakeholder / 100);

  // Runway updates from revenue vs burn
  E.runwayMonths = Math.max(0, E.runwayMonths + E.revenueIndex - E.burnRate);

  // Map to financials 0..100
  C.financials = Math.max(0, Math.min(100, E.runwayMonths * 10));

  if (E.runwayMonths <= 0 && gamePhase !== "ended") {
    gamePhase = "ended";
    showMessage("GAME OVER: Out of cash. The company couldn't sustain operations.");
    document.getElementById("options").innerHTML = '<button onclick="start()">New Game</button>';
  }
}

function processDelayedEffects() {
  const now = state.turn;
  state.delayed = state.delayed.filter((delayed) => {
    if (delayed.turn <= now) {
      for (const [k, v] of Object.entries(delayed.effects)) {
        const [grp, key] = k.split(".");
        if (state[grp] && state[grp][key] !== undefined) {
          state[grp][key] = Math.max(0, Math.min(100, state[grp][key] + v));
        }
      }
      return false; // Remove processed effect
    }
    return true; // Keep unprocessed effects
  });
}

function checkMilestones() {
  // Quarterly review
  if (state.turn % milestones.quarterly.everyTurns === 0) {
    const score = calculateQuarterlyScore();
    state.quarterlyScores.push(score);

    let message = `Quarterly Review (Turn ${state.turn}): Score ${score.toFixed(
      1
    )}`;

    // Apply quarterly effects (safe evaluation of condition)
    for (const effect of milestones.quarterly.effects) {
      if (evaluateQuarterlyCondition(effect.condition, score)) {
        message += ` - ${effect.message}`;
        for (const [k, v] of Object.entries(
          effect.bonus || effect.penalty || {}
        )) {
          const [grp, key] = k.split(".");
          if (state[grp] && state[grp][key] !== undefined) {
            state[grp][key] = Math.max(0, Math.min(100, state[grp][key] + v));
          }
        }
      }
    }

    showMessage(message);
  }

  // Annual review
  if (state.turn >= milestones.annual.turn) {
    const ending = checkEnding();
    if (ending) {
      gamePhase = "ended";
      showMessage(`GAME OVER: ${ending.message}`);
      document.getElementById("options").innerHTML =
        '<button onclick="start()">New Game</button>';
    }
  }
}

function evaluateQuarterlyCondition(cond, score) {
  // cond is like "score >= 80" or "score < 40"
  try {
    const expr = cond.replace(/\bscore\b/g, String(score));
    if (!/^[0-9\s<>=!().+-/*]+$/.test(expr)) return false;
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`return (${expr})`)());
  } catch (_) {
    return false;
  }
}

function computePromotionProgress() {
  // Simple heuristic: combine stakeholder, financials, velocity, morale
  const c = state.company;
  const composite = 0.35 * c.stakeholder + 0.35 * c.financials + 0.2 * c.velocity + 0.1 * c.morale - 0.15 * c.tech_debt;
  let next = state.template === "startup" ? "scaleup" : state.template === "scaleup" ? "bigco" : "bigco";
  // Normalize to 0-100 window for progress
  const percent = Math.max(0, Math.min(100, composite));
  return { next, percent };
}

function checkPromotion() {
  if (state.template === "bigco") return;
  const { next, percent } = computePromotionProgress();
  if (percent >= 68) {
    // Promote environment
    state.template = next;
    // Nudge company stats to reflect transition
    if (next === "scaleup") {
      state.company.stakeholder = Math.min(100, state.company.stakeholder + 10);
      state.company.financials = Math.min(100, state.company.financials + 15);
      state.company.tech_debt = Math.min(100, state.company.tech_debt + 5);
    } else if (next === "bigco") {
      state.company.stakeholder = Math.min(100, state.company.stakeholder + 10);
      state.company.financials = Math.min(100, state.company.financials + 10);
      state.company.velocity = Math.max(0, state.company.velocity - 5);
    }
    showMessage(`Environment progressed to ${companyTemplates[next].name}. New challenges ahead.`);
  }
}

function calculateQuarterlyScore() {
  const formula = milestones.quarterly.scoreFormula;
  let score = 0;

  for (const [stat, weight] of Object.entries(formula)) {
    if (state.company[stat] !== undefined) {
      score += state.company[stat] * weight;
    } else if (state.leader[stat] !== undefined) {
      score += state.leader[stat] * weight;
    }
  }

  return score;
}

function checkEnding() {
  const ctx = buildEndingContext();
  for (const ending of milestones.annual.endings) {
    if (evaluateEndingCondition(ending.condition, ctx)) {
      return ending;
    }
  }
  return null;
}

function buildEndingContext() {
  return {
    // leader
    trust: state.leader.trust,
    execution: state.leader.execution,
    vision: state.leader.vision,
    culture: state.leader.culture,
    // company
    morale: state.company.morale,
    velocity: state.company.velocity,
    tech_debt: state.company.tech_debt,
    stakeholder: state.company.stakeholder,
    financials: state.company.financials,
    // hidden
    crisis: state.hidden.crisis,
    burnout: state.hidden.burnout,
  };
}

function evaluateEndingCondition(cond, ctx) {
  try {
    const replaced = cond.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (m) => {
      if (Object.prototype.hasOwnProperty.call(ctx, m)) {
        return String(ctx[m]);
      }
      return m; // keep literals like &&, ||
    });
    if (!/^[0-9\s<>=!&|().+-/*]+$/.test(replaced)) return false;
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`return (${replaced})`)());
  } catch (_) {
    return false;
  }
}

function showMessage(message) {
  const messageEl = document.getElementById("message");
  if (messageEl) {
    messageEl.textContent = message;
  } else {
    const div = document.createElement("div");
    div.id = "message";
    div.className = "message";
    div.textContent = message;
    document.getElementById("scenario").appendChild(div);
  }
}

function showOutcomeSummary(scenario, optionId, option, prev) {
  const {
    text: summaryText,
    deltas,
    positives,
    negatives,
    shortChanges,
    positivesCompact,
    negativesCompact,
  } = generateOutcomeSummary(scenario, optionId, option, prev);

  // Record last deltas for sidebar chips (fade next update)
  state.lastDeltas = collectLastDeltas(option.immediate || {});

  const watch = generateWatchlist();

  document.getElementById("scenario").innerHTML = `
    <div class="outcome-summary">
      <h3>Outcome</h3>
      <p><strong>You chose:</strong> ${option.hint}</p>
      <p>${option.summary ? option.summary : summaryText}</p>
      <p><strong>Result:</strong> ${[...shortChanges].slice(0, 3).join(", ")}</p>
      <div style="margin: 8px 0; color: #9aa3b2; font-size: 13px;">Why this: ${lastScenarioWhy.join(", ")}</div>
      <div class="delta-grid">
        <div>
          <div class="delta-title">Improved</div>
          ${positivesCompact.length
            ? `<ul class="delta-list positive">${positivesCompact
                .map((d) => `<li>${d}</li>`)
                .join("")}</ul>`
            : `<div class="delta-none">None</div>`}
        </div>
        <div>
          <div class="delta-title">Regressed</div>
          ${negativesCompact.length
            ? `<ul class="delta-list negative">${negativesCompact
                .map((d) => `<li>${d}</li>`)
                .join("")}</ul>`
            : `<div class="delta-none">None</div>`}
        </div>
      </div>
      <div class="watchlist">
        <div class="watch-title">Watchlist</div>
        ${watch.length
          ? `<ul class="watch-list">${watch
              .map((w) => `<li>${w}</li>`)
              .join("")}</ul>`
          : `<div class="delta-none">No critical stats right now.</div>`}
      </div>
      ${getCoachNoteHTML(option, prev)}
      ${renderTurnLogSection()}
    </div>
  `;

  document.getElementById("options").innerHTML = `
    <button class="roll-dice-btn" onclick="rollDice()">Next Turn</button>
  `;
}

function renderTurnLogSection() {
  const log = state.turnLog || [];
  if (!log.length) return '';
  const items = log.slice(0, 5).map(e => {
    const changes = Object.entries(e.immediate || {})
      .map(([k,v]) => `${k.split('.').pop()} ${v>0?'+':''}${v}`)
      .slice(0,3)
      .join(', ');
    return `<li><strong>T${e.turn}</strong>: ${e.optionHint || e.optionId} — ${e.summary || ''}${changes ? ` <span style="color:#9aa3b2">(${changes})</span>` : ''}</li>`;
  }).join('');
  return `
    <div class="turn-log">
      <div class="turnlog-title">Turn Log</div>
      <ul class="turnlog-list">${items}</ul>
    </div>
  `;
}

function collectLastDeltas(effects) {
  const out = {};
  for (const [k, v] of Object.entries(effects)) out[k] = v;
  // Clear after next update cycle
  setTimeout(() => {
    state.lastDeltas = {};
    updateStats();
  }, 2000);
  return out;
}

function getCoachNoteHTML(option, prev) {
  const insight = generateCoachInsights(option, prev);
  if (!insight) return "";
  const { why, risk, watch } = insight;
  return `
    <div class="coach-note">
      <div class="coach-title">Coach's note</div>
      <ul class="coach-body">
        <li><strong>Why it can work:</strong> ${why}</li>
        <li><strong>Risk:</strong> ${risk}</li>
        <li><strong>Watch:</strong> ${watch}</li>
      </ul>
    </div>
  `;
}

function generateCoachInsights(option, prev) {
  try {
    const eff = option.immediate || {};
    const entries = Object.entries(eff);
    if (!entries.length) return null;

    const nice = (k) => k.split('.').pop().replace(/_/g, ' ');
    // Select strongest positive and negative delta
    let topPos = null, topNeg = null;
    for (const [k, v] of entries) {
      if (v > 0 && (!topPos || Math.abs(v) > Math.abs(topPos[1]))) topPos = [k, v];
      if (v < 0 && (!topNeg || Math.abs(v) > Math.abs(topNeg[1]))) topNeg = [k, v];
    }

    // Why
    let why = topPos ? `${nice(topPos[0])} improves, unlocking momentum` : `Concentrates on a clear priority`;

    // Risk
    let risk = topNeg ? `${nice(topNeg[0])} suffers; this can backfire if ignored` : `Hidden tradeoffs may surface if overused`;

    // Watch: threshold-aware hints
    const C = state.company, H = state.hidden;
    if (C.morale < 35) {
      risk = `morale is low; attrition risk rises`; 
      why = topPos ? `${why}` : `Stabilizes near‑term without fixing morale`;
    }
    if (H.burnout > 60) risk = `burnout is high; expect mistakes and churn`;
    if (C.tech_debt > 70) watch = `tech debt is heavy; schedule a stability sprint`;

    const watch = (() => {
      if (topNeg && topNeg[0].includes('morale')) return 'follow up with recognition/clarity next turn';
      if (topNeg && topNeg[0].includes('tech_debt')) return 'budget time for refactor to protect velocity';
      if (topNeg && topNeg[0].includes('burnout')) return 'rotate on-call and cut weekend work';
      if (topPos && topPos[0].includes('stakeholder')) return 'convert goodwill into quick, visible progress';
      return 'validate outcomes next turn and correct course if needed';
    })();

    return { why, risk, watch };
  } catch (_) {
    return { why: 'Focus can compound gains', risk: 'Overuse erodes trust or morale', watch: 'Reassess next turn' };
  }
}

function renderDeltaChip(delta) {
  if (delta === undefined) return "";
  const sign = delta > 0 ? "+" : "";
  const cls = delta > 0 ? "delta-up" : "delta-down";
  const mag = Math.abs(delta);
  return `<span class="delta-chip ${cls}">${sign}${mag}</span>`;
}

function showWaitForDiceRoll() {
  document.getElementById("scenario").innerHTML = `
    <div class="wait-for-dice">
      <h3>Turn ${state.turn} Complete</h3>
      <p>Your decision has been made and the consequences are clear.</p>
      <p>Ready for the next challenge?</p>
    </div>
  `;

  document.getElementById("options").innerHTML = `
    <button class="roll-dice-btn" onclick="rollDice()">Roll Dice for Next Turn</button>
  `;
}

function generateOutcomeSummary(scenario, optionId, option, prev) {
  const archetype = leaderArchetypes[state.archetype];
  const template = companyTemplates[state.template];

  // Get stat changes
  const changes = option.immediate || {};
  const statChanges = [];
  const positives = [];
  const negatives = [];
  const positivesCompact = [];
  const negativesCompact = [];
  const shortChanges = [];

  for (const [key, value] of Object.entries(changes)) {
    const [group, stat] = key.split(".");
    const statName = stat.replace("_", " ");
    const direction = value > 0 ? "increased" : "decreased";
    const magnitude = Math.abs(value);

    const before = prev[group] && prev[group][stat] !== undefined ? prev[group][stat] : undefined;
    const after = state[group] && state[group][stat] !== undefined ? state[group][stat] : undefined;
    const crossedUp = before !== undefined && before < 50 && after >= 50;
    const crossedDown = before !== undefined && before >= 50 && after < 50;
    const threshold = crossedUp ? " (crossed into green)" : crossedDown ? " (dropped into red)" : "";
    const beforeAfter =
      before !== undefined && after !== undefined
        ? ` ${formatNumber(before)} → ${formatNumber(after)}`
        : "";
    const sentence =
      group === "leader"
        ? `Your ${statName} ${direction} by ${magnitude}${beforeAfter}${threshold}`
        : group === "company"
        ? `Company ${statName} ${direction} by ${magnitude}${beforeAfter}${threshold}`
        : `Hidden ${statName} ${direction} by ${magnitude}${beforeAfter}${threshold}`;
    statChanges.push(sentence);
    if (value > 0) positives.push(sentence);
    if (value < 0) negatives.push(sentence);

    const compact = `${statName} ${value > 0 ? "+" : ""}${magnitude}`;
    if (value > 0) positivesCompact.push(compact);
    if (value < 0) negativesCompact.push(compact);
    shortChanges.push(compact);
  }

  // Build decision story (prefer deck/service summary if present)
  let outcome = (typeof option.summary === "string" && option.summary.trim()) || buildDecisionStory(scenario, option, changes, positives, negatives);

  return {
    text: outcome,
    deltas: statChanges,
    positives,
    negatives,
    positivesCompact,
    negativesCompact,
    shortChanges,
  };
}

function buildDecisionStory(scenario, option, changes, positives, negatives) {
  try {
    const entries = Object.entries(changes);
    if (!entries.length) return "You made a call, but the immediate impact is limited.";
    // Pick top positive and top negative by magnitude
    let topPos = null, topNeg = null;
    for (const [k, v] of entries) {
      if (v > 0 && (!topPos || Math.abs(v) > Math.abs(topPos[1]))) topPos = [k, v];
      if (v < 0 && (!topNeg || Math.abs(v) > Math.abs(topNeg[1]))) topNeg = [k, v];
    }
    const nice = (k) => k.split('.').pop().replace(/_/g, ' ');
    const posList = positives.map((s) => s.replace(/^(Company|Hidden|Your)\s*/i, '').replace(/\.$/, '')).slice(0,2);
    const negList = negatives.map((s) => s.replace(/^(Company|Hidden|Your)\s*/i, '').replace(/\.$/, '')).slice(0,1);

    // Reason from selection logic (dice/flags/pressure)
    const reason = (lastScenarioWhy && lastScenarioWhy.length) ? ` (${lastScenarioWhy[0].toLowerCase()})` : '';

    // Compose narrative
    if (posList.length && negList.length) {
      return `${option.hint}${reason}: ${posList.join('; ')}, at the cost of ${negList.join('; ')}.`;
    }
    if (posList.length) {
      return `${option.hint}${reason}: ${posList.join('; ')}.`;
    }
    if (negList.length) {
      return `${option.hint}${reason}: ${negList.join('; ')}.`;
    }
    return `${option.hint}${reason}: tradeoffs applied.`;
  } catch (_) {
    return `${option.hint}: tradeoffs applied.`;
  }
}

function generateWatchlist() {
  const items = [];
  const add = (groupName, obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v <= 25) items.push(`${groupName} ${k} is low (${v})`);
      if (v >= 80) items.push(`${groupName} ${k} is high (${v})`);
    }
  };
  add("Leader", state.leader);
  add("Company", state.company);
  add("Hidden", state.hidden);

  // Prioritize most critical signals
  return items.slice(0, 6);
}

function showSetup() {
  gamePhase = "setup";
  document.getElementById("scenario").innerHTML = `
    <h2>Choose Your Leadership Style</h2>
    <div class="archetype-grid">
      ${Object.entries(leaderArchetypes)
        .map(
          ([key, arch]) => `
        <div class="archetype-card" onclick="selectArchetype('${key}')">
          <h3>${arch.name}</h3>
          <p>${arch.description}</p>
        </div>
      `
        )
        .join("")}
    </div>
    <h2>Choose Your Company</h2>
    <div class="template-grid">
      ${Object.entries(companyTemplates)
        .map(
          ([key, template]) => `
        <div class="template-card" onclick="selectTemplate('${key}')">
          <h3>${template.name}</h3>
          <p>${template.description}</p>
        </div>
      `
        )
        .join("")}
    </div>
    <button id="startGame" onclick="startGame()" disabled>Start Game</button>
  `;

  document.getElementById("options").innerHTML = "";
}

let selectedArchetype = null;
let selectedTemplate = null;
let selectedResumeKey = null;

function selectArchetype(key) {
  selectedArchetype = key;
  document
    .querySelectorAll(".archetype-card")
    .forEach((card) => card.classList.remove("selected"));
  event.target.closest(".archetype-card").classList.add("selected");
  checkCanStart();
}

function selectTemplate(key) {
  selectedTemplate = key;
  document
    .querySelectorAll(".template-card")
    .forEach((card) => card.classList.remove("selected"));
  event.target.closest(".template-card").classList.add("selected");
  checkCanStart();
}

function checkCanStart() {
  const startBtn = document.getElementById("startGame");
  if (selectedArchetype && selectedTemplate) {
    startBtn.disabled = false;
  }
}

async function startGame() {
  initState(selectedArchetype, selectedTemplate);
  gamePhase = "playing";
  updateStats();

  // Show initial turn setup
  document.getElementById("scenario").innerHTML = `
    <div class="game-start">
      <h2>Welcome to Leadership Simulator</h2>
      <p>You are a ${leaderArchetypes[selectedArchetype].name} leading a ${companyTemplates[selectedTemplate].name} team.</p>
      <p>Each turn, you'll roll dice to determine what challenges you face, then make decisions that will shape your leadership journey.</p>
      <div class="loading-scenarios" id="loadingScenarios">
        <p>🎲 Preparing scenarios for your leadership style...</p>
      </div>
    </div>
  `;

  document.getElementById("options").innerHTML = `
    <button class="roll-dice-btn" onclick="rollDice()" id="beginBtn" disabled>Preparing...</button>
  `;

  // Preload scenarios for faster response time
  await preloadScenarios();
  
  // Update UI when ready (regardless of preload success)
  document.getElementById("loadingScenarios").style.display = "none";
  const beginBtn = document.getElementById("beginBtn");
  beginBtn.disabled = false;
  if (scenarioQueue.length > 0) {
    beginBtn.textContent = `Roll Dice to Begin (${scenarioQueue.length} scenarios ready)`;
  } else {
    beginBtn.textContent = "Roll Dice to Begin (will generate on demand)";
  }

  // autosave immediately after start
  autoSave();
}

async function preloadScenarios() {
  const service = window.ScenarioService;
  if (!service || typeof service.asyncRequest !== "function") {
    console.warn("Scenario service not available, skipping preload");
    return;
  }

  isLoadingScenarios = true;
  try {
    // Create initial context for batch loading
    const ctx = service.buildContextFromState(state);
    ctx.requestType = 'batch'; // Signal for batch request
    
    console.log("🚀 Preloading 3 scenarios for faster gameplay...");
    const batchResponse = await service.asyncRequest(ctx);
    
    if (batchResponse && batchResponse.scenarios && Array.isArray(batchResponse.scenarios)) {
      scenarioQueue = batchResponse.scenarios.map(item => ({
        id: item.id,
        scenario: item.scenario,
        source: 'preloaded'
      }));
      console.log(`✅ Preloaded ${scenarioQueue.length} scenarios`);
    } else if (batchResponse && batchResponse.id && batchResponse.scenario) {
      // Single scenario fallback
      scenarioQueue = [{
        id: batchResponse.id,
        scenario: batchResponse.scenario,
        source: 'preloaded'
      }];
      console.log("✅ Preloaded 1 scenario (single format)");
    }
  } catch (error) {
    console.warn("Failed to preload scenarios:", error.message);
  } finally {
    isLoadingScenarios = false;
  }
}

async function refillScenarioQueue() {
  // Don't refill if already loading or queue still has scenarios
  if (isLoadingScenarios || scenarioQueue.length >= 2) return;
  
  const service = window.ScenarioService;
  if (!service || typeof service.asyncRequest !== "function") return;
  
  isLoadingScenarios = true;
  try {
    console.log("🔄 Refilling scenario queue...");
    const ctx = service.buildContextFromState(state);
    ctx.requestType = 'batch'; // Get multiple scenarios
    
    const response = await service.asyncRequest(ctx);
    if (response && response.scenarios && Array.isArray(response.scenarios)) {
      const newScenarios = response.scenarios.map(item => ({
        id: item.id,
        scenario: item.scenario,
        source: 'background_loaded'
      }));
      scenarioQueue.push(...newScenarios);
      console.log(`✅ Added ${newScenarios.length} scenarios to queue`);
    }
  } catch (error) {
    console.warn("Failed to refill scenario queue:", error.message);
  } finally {
    isLoadingScenarios = false;
  }
}

function saveGame() {
  localStorage.setItem("leadershipSimulator", JSON.stringify(state));
  showMessage("Game saved!");
}

function autoSave() {
  localStorage.setItem("leadershipSimulator", JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem("leadershipSimulator");
  if (saved) {
    state = JSON.parse(saved);
    seedRng(state.seed || Date.now());
    if (typeof state.rngState === "number") {
      rngState = state.rngState >>> 0;
    }
    gamePhase = "playing";
    // restore dice/scenario if present
    currentDice = state.currentDice || null;
    currentScenario = state.currentScenarioId ? deck.scenarios[state.currentScenarioId] || null : null;
    updateStats();
    showScenario();
    showMessage("Game loaded!");
  }
}

async function start() {
  // deck.json no longer needed - all scenarios come from service
  try {
    deck = await loadJSON("deck.json");
  } catch (e) {
    console.warn("deck.json missing; using empty deck fallback");
    deck = { scenarios: {} };
  }
  
  try {
    milestones = await loadJSON("milestones.json");
  } catch (e) {
    console.warn("milestones.json not found, using defaults");
    milestones = {
      quarterly: { everyTurns: 3, scoreFormula: { velocity: 0.25, stakeholder: 0.2, trust: 0.2, morale: 0.15, tech_debt: -0.1, financials: 0.1 }, effects: [] },
      annual: { turn: 12, endings: [] }
    };
  }

  // Check for saved game
  if (localStorage.getItem("leadershipSimulator")) {
    loadGame();
    return;
  }

  showRecruiterIntro();
}

// Add save/load buttons
// Removed explicit Save/Load buttons since autosave/autoload are enabled

document.getElementById("newRun").onclick = newRun;
const fillerToggle = document.getElementById("useServiceFiller");
if (fillerToggle) fillerToggle.onchange = (e) => {
  useServiceFiller = e.target.checked;
};
start();

function newRun() {
  // wipe autosave and reset runtime globals
  localStorage.removeItem("leadershipSimulator");
  currentDice = null;
  currentScenario = null;
  seenScenarioIds = new Set();
  selectedArchetype = null;
  selectedTemplate = null;
  selectedResumeKey = null;
  gamePhase = "setup";
  // fresh seed
  state = {};
  seedRng(Date.now());
  // clear stats/message UI so old values don't linger
  const statsEl = document.getElementById("stats");
  if (statsEl) statsEl.innerHTML = "";
  const msg = document.getElementById("message");
  if (msg) msg.remove();
  showRecruiterIntro();
}

// ---- Recruiter Intro Flow ----
function showRecruiterIntro() {
  gamePhase = "setup";
  const scenarioEl = document.getElementById("scenario");

  const resumeCards = Object.entries(resumes)
    .map(
      ([key, r]) => `
      <div class="resume-card" onclick="selectResume('${key}', event)">
        <h3>${r.name}</h3>
        <p>${r.summary}</p>
      </div>
    `
    )
    .join("");

  const jdCards = Object.entries(companyTemplates)
    .map(([key, t]) => {
      const signals = companySignals[key] || [];
      return `
        <div class="jd-card" onclick="selectJD('${key}', event)">
          <h3>${t.name}</h3>
          <p>${t.description}</p>
          <ul class="signals">
            ${signals.map((s) => `<li>${s}</li>`).join("")}
          </ul>
        </div>
      `;
    })
    .join("");

  scenarioEl.innerHTML = `
    <div class="recruiter-intro">
      <div class="recruiter-bubble">
        <div class="recruiter-name">Recruiter</div>
        <div>
          Hey! I'm Casey. I've got roles at a scrappy startup, a rocket-ship scaleup, and a stable BigCo. Pick your resume and the JD that speaks to you—I'll line up the interview.
        </div>
      </div>
      <h2>Your Resume</h2>
      <div class="resume-grid">${resumeCards}</div>
      <h2>Open Roles</h2>
      <div class="jd-grid">${jdCards}</div>
      <button id="proceedRecruiter" class="roll-dice-btn" disabled>Proceed</button>
    </div>
  `;

  const proceedBtn = document.getElementById("proceedRecruiter");
  proceedBtn.onclick = () => {
    if (!selectedArchetype || !selectedTemplate) return;
    startGame();
  };

  // Clear previous selections
  selectedArchetype = null;
  selectedTemplate = null;
  selectedResumeKey = null;
}

function selectResume(key, ev) {
  selectedResumeKey = key;
  const mapping = resumes[key]?.mapsTo;
  if (mapping) {
    selectedArchetype = mapping;
  }
  // highlight
  document.querySelectorAll(".resume-card").forEach((card) => card.classList.remove("selected"));
  ev.target.closest(".resume-card").classList.add("selected");
  checkCanProceedRecruiter();
}

function selectJD(key, ev) {
  selectedTemplate = key;
  document.querySelectorAll(".jd-card").forEach((card) => card.classList.remove("selected"));
  ev.target.closest(".jd-card").classList.add("selected");
  checkCanProceedRecruiter();
}

function checkCanProceedRecruiter() {
  const btn = document.getElementById("proceedRecruiter");
  if (!btn) return;
  btn.disabled = !(selectedArchetype && selectedTemplate);
}
