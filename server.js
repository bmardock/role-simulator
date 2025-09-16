// Simple Scenario API server (mock, OpenAI-ready)
// Run: npm install && npm start
// POST /api/scenario { context }
// Returns: { id, scenario } matching deck.json shape

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Allowed keys for immediate deltas
const ALLOWED_KEYS = [
  "leader.trust",
  "leader.execution",
  "leader.vision",
  "leader.culture",
  "company.morale",
  "company.velocity",
  "company.tech_debt",
  "company.stakeholder",
  "company.financials",
  "hidden.burnout",
  "hidden.attrition",
  "hidden.crisis",
  "economy.runwayMonths",
  "economy.burnRate",
  "economy.mau",
  "economy.revenueIndex",
];

// Optional OpenAI client (only used if OPENAI_API_KEY is set)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // eslint-disable-next-line no-console
    console.log("OpenAI client initialized");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("OpenAI SDK not installed. Run: npm i openai");
  }
}

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: "200kb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/scenario", async (req, res) => {
  const context = req.body && req.body.context ? req.body.context : {};
  try {
    // Check cache first
    global.scenarioCache = global.scenarioCache || [];
    if (global.scenarioCache.length > 0) {
      const cached = global.scenarioCache.shift();
      console.log(`[Cache] Serving cached scenario ${cached.id}`);
      try {
        normalizeScenario(cached.scenario, ALLOWED_KEYS);
      } catch (_) {}
      return res.json(cached);
    }

    // Generate with OpenAI only
    if (openai) {
      const out = await generateWithOpenAI(openai, context);
      if (out) return res.json(out);
    }

    // No fallback - return error if OpenAI fails
    console.warn("OpenAI generation failed and no fallback configured");
    res.status(503).json({ error: "scenario_generation_unavailable" });
  } catch (err) {
    console.error("/api/scenario error", err);
    res.status(500).json({ error: "scenario_generation_failed" });
  }
});

// Serve static frontend from project root
app.use(express.static(path.join(__dirname)));

// SPA fallback (keep after API routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Scenario API listening on http://127.0.0.1:${PORT}`);
  // Prewarm cache on boot (non-blocking)
  prewarmCache().catch(() => {});
});


// OpenAI integration
async function prewarmCache() {
  if (!openai) return;
  try {
    const dummy = await generateWithOpenAI(openai, {
      turn: 1,
      template: "startup",
      archetype: "operator",
      leader: { trust: 50, execution: 60, vision: 55, culture: 50 },
      company: { morale: 55, velocity: 60, tech_debt: 55, stakeholder: 55, financials: 50 },
      hidden: { burnout: 2, attrition: 10, crisis: 3 },
      requestType: 'batch'
    });
    if (dummy) {
      global.scenarioCache = global.scenarioCache || [];
      // If dummy is a single, push; if batch path, it already cached
      if (!dummy.scenarios) {
        global.scenarioCache.push(dummy);
      }
      console.log(`[Prewarm] Cache size: ${global.scenarioCache.length}`);
    }
  } catch (e) {
    console.warn('[Prewarm] failed', e?.message || e);
  }
}
function normalizeScenario(scn, allowedKeys) {
  // Ensure exactly 3 options with tradeoffs and allowed keys only
  if (!scn || !scn.options || typeof scn.options !== 'object') return;
  const optionKeys = Object.keys(scn.options);
  if (optionKeys.length !== 3) {
    // If API returned fewer/more, attempt to trim/pad minimally
    while (optionKeys.length > 3) optionKeys.pop();
    while (optionKeys.length < 3) {
      const k = `alt_${optionKeys.length+1}`;
      scn.options[k] = {
        hint: "Alternative",
        description: "Alternative approach with tradeoffs.",
        immediate: { "company.velocity": 1, "company.morale": -1 },
        tags: ["strategic"]
      };
      optionKeys.push(k);
    }
  }
  for (const ok of Object.keys(scn.options)) {
    const opt = scn.options[ok] || {};
    const imm = opt.immediate || {};
    const filtered = {};
    for (const key of Object.keys(imm)) {
      if (allowedKeys.includes(key)) filtered[key] = imm[key];
    }
    // Enforce 2-3 deltas and tradeoffs
    const entries = Object.entries(filtered);
    if (entries.length === 0) {
      filtered["company.velocity"] = 1;
      filtered["company.morale"] = -1;
    } else if (entries.length === 1) {
      const [onlyKey, onlyVal] = entries[0];
      filtered[onlyKey] = onlyVal;
      filtered[onlyKey === "company.velocity" ? "company.morale" : "company.velocity"] = onlyVal > 0 ? -1 : 1;
    }
    scn.options[ok].immediate = filtered;
    // Ensure concise summary exists
    if (!opt.summary || typeof opt.summary !== 'string' || !opt.summary.trim()) {
      const positives = Object.entries(filtered).filter(([,v]) => v > 0).map(([k,v]) => `${k.split('.').pop()} +${v}`);
      const negatives = Object.entries(filtered).filter(([,v]) => v < 0).map(([k,v]) => `${k.split('.').pop()} ${v}`);
      const posTxt = positives.length ? `Gains: ${positives.join(', ')}` : '';
      const negTxt = negatives.length ? `Costs: ${negatives.join(', ')}` : '';
      scn.options[ok].summary = [posTxt, negTxt].filter(Boolean).join('. ');
    }
  }
}
async function generateWithOpenAI(client, context) {
  try {
    const phase = context.turn <= 3 ? "early" : context.turn <= 6 ? "mid" : "late";
    const allowedKeys = [
      "leader.trust",
      "leader.execution",
      "leader.vision",
      "leader.culture",
      "company.morale",
      "company.velocity",
      "company.tech_debt",
      "company.stakeholder",
      "company.financials",
      "hidden.burnout",
      "hidden.attrition",
      "hidden.crisis",
      "economy.runwayMonths",
      "economy.burnRate",
      "economy.mau",
      "economy.revenueIndex",
    ];

    const compact = {
      turn: context.turn,
      template: context.template,
      archetype: context.archetype,
      pressure: context.pressure,
      leader: context.leader,
      company: context.company,
      hidden: context.hidden,
      economy: context.economy,
      flags: Object.keys(context.flags || {}).filter((k) => context.flags[k]).slice(0, 8),
      recentScenarios: (context.recentScenarios || []).slice(0, 5),
    };

    // Build dynamic system prompt based on context
    const archetypeHint = context.archetypePreferences ? 
      `The leader is a ${context.archetype} who specializes in: ${Object.keys(context.archetypePreferences.scenarioAffinity).join(', ')}. Generate scenarios that align with these strengths.` : '';
    
    const companyHint = context.companyContext ? 
      `This is a ${context.template} that commonly faces: ${Object.keys(context.companyContext.scenarioTypes).join(', ')} problems. Focus on these scenario types.` : '';
    
    const diceHint = context.diceInfluence ? 
      `Current dice influence suggests: ${Object.keys(context.diceInfluence.scenarioModifiers).join(', ')} scenarios are more likely.` : '';

    // Check if this is a batch request (game start)
    const isBatchRequest = context.requestType === 'batch' || context.turn === 1;
    const scenarioCount = isBatchRequest ? 3 : 1;
    
    const sys = [
      `You generate ${scenarioCount} perfect leadership scenario${scenarioCount > 1 ? 's' : ''} as strict JSON only.`,
      isBatchRequest ? 
        "Return: { scenarios: [{ id, scenario: { phase, tags, title, text, options } }, { id, scenario: { phase, tags, title, text, options } }, { id, scenario: { phase, tags, title, text, options } }] }." :
        "Return: { id, scenario: { phase, tags, title, text, options } }.",
      "CRITICAL: Keep 'text' under 60 words, focused on the core dilemma.",
      "Make the text specific: include a stakeholder (e.g. CEO, key customer), a constraint (deadline/budget/headcount), and a metric or impact (e.g. velocity, runway months).",
      "Avoid generic phrasing like 'long-term sustainability' or 'alternative approach'. Be concrete and vivid.",
      "options is an object with EXACTLY 3 keys, each containing { hint, description, immediate, tags, summary }.",
      "DO NOT return fewer than 3 or more than 3 options.",
      "CRITICAL: Each option must have both positive AND negative impacts (2-3 total deltas per option).",
      "hint: 2-3 words max. description: 1 sentence max.",
      "immediate contains 2-3 deltas with clear tradeoffs (e.g. { 'company.velocity': +2, 'company.morale': -1 }).",
      "summary is a concise (<= 40 words) consequence-focused narration of what happened because of that option, explicitly referencing the tradeoffs.",
      "tags should include option style tags like: execution_focused, people_focused, strategic, collaborative, crisis_response, innovative, etc.",
      `Allowed immediate keys: ${allowedKeys.join(", ")}.`,
      "All deltas should be integers between -3 and 3, or small decimals (-0.4..0.4) for economy.* only.",
      "Do not include any explanations or extra fields.",
      isBatchRequest ? "Make each scenario unique with different themes and challenges." : "",
      archetypeHint,
      companyHint, 
      diceHint
    ].filter(s => s).join("\n");

    const user = {
      ask: "Create 3 diverse, concise scenarios with meaningful tradeoffs.",
      phase,
      context: compact,
      requirements: {
        text_length: "Under 60 words, include stakeholder + constraint + metric",
        option_structure: "Each option must have both gains and losses (2-3 immediate deltas)",
        decision_types: "Leadership dilemmas with no perfect choice",
        tags_hint: "Use 1-2 tags like morale_low, velocity_low, stakeholder_pressure, tech_debt_high, financials_low, crisis_risk",
        diversity: "Make each scenario unique - different themes, situations, challenges",
      }
    };

    const tStart = Date.now();
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: isBatchRequest ? 0.9 : 0.7, // Higher creativity for batch, faster for single
      max_tokens: isBatchRequest ? 1800 : 600, // Reduce token budget slightly
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(user) },
      ],
    });
    const tEnd = Date.now();
    try {
      const usage = resp.usage || {};
      console.log(`[OpenAI] ${isBatchRequest ? 'batch' : 'single'} ${tEnd - tStart}ms`, usage);
    } catch (_) {}
    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    
    // Fix common JSON issues with + signs
    const cleanedRaw = raw.replace(/:\s*\+(\d)/g, ': $1');
    const parsed = JSON.parse(cleanedRaw);

    // Handle batch response format
    if (parsed && parsed.scenarios && Array.isArray(parsed.scenarios)) {
      // Cache scenarios and return first one
      const validScenarios = parsed.scenarios.filter(item => 
        item && item.id && item.scenario && item.scenario.options
      );
      
      if (validScenarios.length > 0) {
        // Store remaining scenarios in global cache for later use
        global.scenarioCache = global.scenarioCache || [];
        for (let i = 1; i < validScenarios.length; i++) {
          const cached = validScenarios[i];
          // Sanitize cached scenarios
          const opts = cached.scenario.options;
          for (const k of Object.keys(opts)) {
            const imm = opts[k]?.immediate || {};
            const filtered = {};
            for (const key of Object.keys(imm)) {
              if (allowedKeys.includes(key)) filtered[key] = imm[key];
            }
            opts[k].immediate = filtered;
          }
          normalizeScenario(cached.scenario, allowedKeys);
          cached.scenario.phase = phase;
          global.scenarioCache.push(cached);
        }
        
        // Return first scenario
        const first = validScenarios[0];
        const opts = first.scenario.options;
        for (const k of Object.keys(opts)) {
          const imm = opts[k]?.immediate || {};
          const filtered = {};
          for (const key of Object.keys(imm)) {
            if (allowedKeys.includes(key)) filtered[key] = imm[key];
          }
          opts[k].immediate = filtered;
        }
        normalizeScenario(first.scenario, allowedKeys);
        first.scenario.phase = phase;
        return first;
      }
    }

    // Fallback: handle single scenario format
    if (!parsed || !parsed.id || !parsed.scenario || !parsed.scenario.options) return null;
    const opts = parsed.scenario.options;
    for (const k of Object.keys(opts)) {
      const imm = opts[k]?.immediate || {};
      const filtered = {};
      for (const key of Object.keys(imm)) {
        if (allowedKeys.includes(key)) filtered[key] = imm[key];
      }
      opts[k].immediate = filtered;
    }
    normalizeScenario(parsed.scenario, allowedKeys);
    parsed.scenario.phase = phase;
    return parsed;
  } catch (e) {
    console.warn("OpenAI generation failed", e?.message || e);
    return null;
  }
}


