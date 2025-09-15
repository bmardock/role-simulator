let state = {};
let deck = {};
let milestones = {};
let gamePhase = "setup"; // 'setup', 'playing', 'ended'
let currentDice = null;
let currentScenario = null;

// Leader archetypes
const leaderArchetypes = {
  operator: {
    name: "Operator",
    description: "High execution, moderate trust/vision, lower culture",
    stats: { trust: 45, execution: 75, vision: 50, culture: 35 },
  },
  servant_leader: {
    name: "Servant Leader",
    description: "High culture/trust, weaker execution",
    stats: { trust: 70, execution: 45, vision: 60, culture: 80 },
  },
  visionary: {
    name: "Visionary",
    description: "High vision, lower execution",
    stats: { trust: 60, execution: 40, vision: 85, culture: 55 },
  },
  firefighter: {
    name: "Firefighter",
    description: "Scrappy, strong in crisis, weaker long-term trust/culture",
    stats: { trust: 35, execution: 70, vision: 45, culture: 30 },
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
  },
};

async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function initState(archetype = "operator", template = "startup") {
  const leaderBase = leaderArchetypes[archetype].stats;
  const companyBase = companyTemplates[template].stats;

  state = {
    leader: { ...leaderBase },
    company: { ...companyBase },
    hidden: { burnout: 2, attrition: 16, crisis: 5 },
    turn: 1,
    delayed: [],
    archetype: archetype,
    template: template,
    quarterlyScores: [],
  };
}

function updateStats() {
  const el = document.getElementById("stats");
  let html = "<h3>Leader Stats</h3>";
  for (const [k, v] of Object.entries(state.leader)) {
    html += `<div>${k}: ${v}</div>`;
  }
  html += "<h3>Company Stats</h3>";
  for (const [k, v] of Object.entries(state.company)) {
    html += `<div>${k}: ${v}</div>`;
  }
  html += "<h3>Hidden Stats</h3>";
  for (const [k, v] of Object.entries(state.hidden)) {
    html += `<div>${k}: ${v}</div>`;
  }
  html += `<div><strong>Turn: ${state.turn}</strong></div>`;
  el.innerHTML = html;
}

function diceRoll() {
  return {
    internal: rand(),
    external: rand(),
    opportunity: rand(),
    luck: rand(),
  };
}

function rand() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
  currentDice = diceRoll();
  selectScenario();
  showDiceImpact();
}

function selectScenario() {
  const keys = Object.keys(deck.scenarios);
  const sid = keys[Math.floor(Math.random() * keys.length)];
  currentScenario = deck.scenarios[sid];
}

function showDiceImpact() {
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
        <p>The dice have influenced the situation...</p>
      </div>
    </div>
    <div class="scenario-content">
      <h2>${currentScenario.title}</h2>
      <p>${currentScenario.text}</p>
    </div>
  `;

  showOptions();
}

function showOptions() {
  const optEl = document.getElementById("options");
  optEl.innerHTML = "";
  for (const [oid, opt] of Object.entries(currentScenario.options)) {
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `
      <div class="option-title">${opt.hint}</div>
      <div class="option-description">${opt.description}</div>
    `;
    div.onclick = () => applyChoice(currentScenario, oid, opt);
    optEl.appendChild(div);
  }
}

function showScenario() {
  // This is now just for the initial setup - actual gameplay uses rollDice()
  showDiceImpact();
}

function applyChoice(sc, oid, opt) {
  // Apply immediate effects
  for (const [k, v] of Object.entries(opt.immediate || {})) {
    const [grp, key] = k.split(".");
    if (state[grp] && state[grp][key] !== undefined) {
      state[grp][key] = Math.max(0, Math.min(100, state[grp][key] + v));
    }
  }

  // Apply delayed effects
  if (opt.delayed) {
    state.delayed.push({
      turn: state.turn + (opt.delayed.turns || 1),
      effects: opt.delayed.effects,
    });
  }

  // Process delayed effects
  processDelayedEffects();

  // Show outcome summary
  showOutcomeSummary(sc, oid, opt);

  state.turn++;

  // Check for milestones
  checkMilestones();

  updateStats();

  if (gamePhase === "playing") {
    showWaitForDiceRoll();
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

    // Apply quarterly effects
    for (const effect of milestones.quarterly.effects) {
      if (eval(effect.condition.replace("score", score))) {
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
  for (const ending of milestones.annual.endings) {
    if (eval(ending.condition)) {
      return ending;
    }
  }
  return null;
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

function showOutcomeSummary(scenario, optionId, option) {
  const outcome = generateOutcomeSummary(scenario, optionId, option);

  document.getElementById("scenario").innerHTML = `
    <div class="outcome-summary">
      <h3>Outcome</h3>
      <p>${outcome}</p>
    </div>
  `;

  document.getElementById("options").innerHTML = `
    <div class="continue-prompt">Continue to next scenario...</div>
  `;
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

function generateOutcomeSummary(scenario, optionId, option) {
  const archetype = leaderArchetypes[state.archetype];
  const template = companyTemplates[state.template];

  // Get stat changes
  const changes = option.immediate || {};
  const statChanges = [];

  for (const [key, value] of Object.entries(changes)) {
    const [group, stat] = key.split(".");
    const statName = stat.replace("_", " ");
    const direction = value > 0 ? "increased" : "decreased";
    const magnitude = Math.abs(value);

    if (group === "leader") {
      statChanges.push(`Your ${statName} ${direction} by ${magnitude} points`);
    } else if (group === "company") {
      statChanges.push(
        `Company ${statName} ${direction} by ${magnitude} points`
      );
    } else if (group === "hidden") {
      statChanges.push(
        `Hidden ${statName} ${direction} by ${magnitude} points`
      );
    }
  }

  // Generate contextual outcome based on scenario and stats
  let outcome = "";

  switch (scenario.title) {
    case "Design Conflict":
      if (optionId === "facilitate") {
        outcome = `You brought Alex and Jordan together for a structured technical debate. Your ${archetype.name.toLowerCase()} approach to ${archetype.description.toLowerCase()} helped guide them toward a compromise solution. The team appreciated your facilitation skills, and both engineers felt heard. ${statChanges.join(
          ". "
        )}.`;
      } else if (optionId === "pick_quick") {
        outcome = `You made a decisive call based on your technical judgment. Your ${archetype.name.toLowerCase()} instincts kicked in, and you chose the approach that seemed most practical. The team respected your decisiveness, though some felt their input wasn't fully considered. ${statChanges.join(
          ". "
        )}.`;
      } else {
        outcome = `You escalated the decision to the principal architect. This removed the burden from you and brought in the highest technical authority. The team appreciated that you recognized when to defer to expertise, though some felt you could have handled it yourself. ${statChanges.join(
          ". "
        )}.`;
      }
      break;

    case "Crunch Time":
      if (optionId === "crunch") {
        outcome = `You led by example, staying late and working alongside the team. Your ${archetype.name.toLowerCase()} approach meant you were in the trenches with them. The team appreciated your commitment, though the long hours are taking a toll. ${statChanges.join(
          ". "
        )}.`;
      } else if (optionId === "cut") {
        outcome = `You sat down with the team and identified what could be cut. Your transparent approach and willingness to make tough tradeoffs earned respect. The team felt involved in the decision-making process. ${statChanges.join(
          ". "
        )}.`;
      } else {
        outcome = `You went to the CEO and negotiated a more realistic timeline. Your ${archetype.name.toLowerCase()} style showed you know when to push back. The team appreciated your advocacy for them, though stakeholders were disappointed. ${statChanges.join(
          ". "
        )}.`;
      }
      break;

    case "Promotion Request":
      if (optionId === "approve") {
        outcome = `You recognized Sarah's excellent work and approved the promotion. Your ${archetype.name.toLowerCase()} approach prioritized retaining top talent. Sarah was thrilled, though other team members might expect similar treatment. ${statChanges.join(
          ". "
        )}.`;
      } else if (optionId === "deny") {
        outcome = `You explained the budget constraints honestly. Your ${archetype.name.toLowerCase()} style meant making tough financial decisions. Sarah understood but was disappointed, and you'll need to work to keep her engaged. ${statChanges.join(
          ". "
        )}.`;
      } else {
        outcome = `You created a detailed growth plan for Sarah. Your ${archetype.name.toLowerCase()} approach showed investment in her development. Sarah appreciated the structured path forward, though she was hoping for immediate recognition. ${statChanges.join(
          ". "
        )}.`;
      }
      break;

    default:
      outcome = `Your ${archetype.name.toLowerCase()} leadership style influenced the outcome. ${statChanges.join(
        ". "
      )}. The team's response reflects your current ${template.name.toLowerCase()} environment.`;
  }

  return outcome;
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

function startGame() {
  initState(selectedArchetype, selectedTemplate);
  gamePhase = "playing";
  updateStats();

  // Show initial turn setup
  document.getElementById("scenario").innerHTML = `
    <div class="game-start">
      <h2>Welcome to Leadership Simulator</h2>
      <p>You are a ${leaderArchetypes[selectedArchetype].name} leading a ${companyTemplates[selectedTemplate].name} team.</p>
      <p>Each turn, you'll roll dice to determine what challenges you face, then make decisions that will shape your leadership journey.</p>
    </div>
  `;

  document.getElementById("options").innerHTML = `
    <button class="roll-dice-btn" onclick="rollDice()">Roll Dice to Begin</button>
  `;
}

function saveGame() {
  localStorage.setItem("leadershipSimulator", JSON.stringify(state));
  showMessage("Game saved!");
}

function loadGame() {
  const saved = localStorage.getItem("leadershipSimulator");
  if (saved) {
    state = JSON.parse(saved);
    gamePhase = "playing";
    updateStats();
    showScenario();
    showMessage("Game loaded!");
  }
}

async function start() {
  deck = await loadJSON("deck.json");
  milestones = await loadJSON("milestones.json");

  // Check for saved game
  if (localStorage.getItem("leadershipSimulator")) {
    if (confirm("Load saved game?")) {
      loadGame();
      return;
    }
  }

  showSetup();
}

// Add save/load buttons
document.addEventListener("DOMContentLoaded", function () {
  const header = document.querySelector("header");
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Game";
  saveBtn.onclick = saveGame;
  const loadBtn = document.createElement("button");
  loadBtn.textContent = "Load Game";
  loadBtn.onclick = loadGame;
  header.appendChild(saveBtn);
  header.appendChild(loadBtn);
});

document.getElementById("newRun").onclick = start;
start();
