// Mock API for GitHub Pages deployment
// This replaces the need for a backend server by using static deck.json data

(function() {
  // Load static scenario data from deck.json
  let deckData = null;
  
  // Try to load deck.json data
  async function loadDeckData() {
    try {
      const response = await fetch('./deck.json');
      if (response.ok) {
        deckData = await response.json();
        console.log('Loaded deck.json with', Object.keys(deckData.scenarios || {}).length, 'scenarios');
      }
    } catch (error) {
      console.warn('Could not load deck.json:', error.message);
    }
  }
  
  // Initialize deck data
  loadDeckData();

  // Enhanced mock service that provides more realistic scenarios
  function buildContextFromState(state) {
    const dice = state.currentDice || null;
    const diceInfluence = dice && typeof getDiceInfluence === "function" ? getDiceInfluence(dice) : null;
    const archetypeData = typeof leaderArchetypes !== 'undefined' ? leaderArchetypes[state.archetype] : null;
    const templateData = typeof companyTemplates !== 'undefined' ? companyTemplates[state.template] : null;
    
    return {
      turn: state.turn,
      archetype: state.archetype,
      template: state.template,
      leader: state.leader,
      company: state.company,
      hidden: state.hidden,
      economy: state.economy && {
        runwayMonths: state.economy.runwayMonths,
        burnRate: state.economy.burnRate,
        mau: state.economy.mau,
        revenueIndex: state.economy.revenueIndex,
      },
      flags: state.flags,
      recentScenarios: (state.recentScenarios || []).slice(0, 5),
      recentChoices: (state.recentChoices || []).slice(0, 5),
      pressure: typeof computePressure === "function" ? computePressure() : undefined,
      dice: dice,
      diceInfluence: diceInfluence,
      archetypePreferences: archetypeData ? {
        scenarioAffinity: archetypeData.scenarioAffinity,
        optionModifiers: archetypeData.optionModifiers,
        description: archetypeData.description
      } : null,
      companyContext: templateData ? {
        scenarioTypes: templateData.scenarioTypes,
        exclusiveScenarios: templateData.exclusiveScenarios,
        description: templateData.description
      } : null
    };
  }

  function generateDynamicScenario(context) {
    const phase = context.turn <= 3 ? "early" : context.turn <= 6 ? "mid" : "late";
    const template = context.template;
    const archetype = context.archetype;
    
    // Generate scenario based on context
    const scenarios = {
      early: {
        startup: {
          title: "Team Onboarding Challenge",
          text: "Your new team is struggling with unclear priorities and conflicting direction from different stakeholders. How do you establish clarity?",
          tags: ["onboarding", "clarity", "stakeholder_pressure"]
        },
        scaleup: {
          title: "Growing Pains",
          text: "The team has doubled in size but processes haven't kept up. Communication is breaking down and velocity is dropping.",
          tags: ["scaling_issues", "communication", "process_heavy"]
        },
        bigco: {
          title: "Legacy System Challenge", 
          text: "You've inherited a critical system with no documentation and a team that's afraid to touch it. Stakeholders want improvements.",
          tags: ["legacy_systems", "technical_debt", "stakeholder_pressure"]
        }
      },
      mid: {
        startup: {
          title: "Feature vs. Quality",
          text: "The product team wants to ship fast, but your engineers are concerned about technical debt. The CEO is asking for both speed and quality.",
          tags: ["velocity_low", "tech_debt_high", "stakeholder_pressure"]
        },
        scaleup: {
          title: "Architecture Decision",
          text: "Your system is hitting scaling limits. The team wants to rewrite core components, but stakeholders need new features delivered.",
          tags: ["tech_debt_high", "scaling_issues", "resource_constraint"]
        },
        bigco: {
          title: "Process Overload",
          text: "Compliance requirements are slowing down development. The team is frustrated with bureaucracy, but stakeholders need audit compliance.",
          tags: ["process_heavy", "compliance", "morale_low"]
        }
      },
      late: {
        startup: {
          title: "Growth Crisis",
          text: "User growth is accelerating but your infrastructure is struggling. You need to choose between scaling systems or building new features.",
          tags: ["scaling_issues", "crisis_risk", "resource_constraint"]
        },
        scaleup: {
          title: "Team Restructure",
          text: "The organization is growing and you need to restructure teams. Some engineers want to stay together, others want new challenges.",
          tags: ["team_growth", "morale_low", "strategic_decision"]
        },
        bigco: {
          title: "Strategic Pivot",
          text: "Market conditions have changed and the company needs to pivot. Your team's current work may not align with the new direction.",
          tags: ["strategic_decision", "stakeholder_pressure", "crisis_risk"]
        }
      }
    };

    const scenarioTemplate = scenarios[phase]?.[template] || scenarios[phase]?.startup || {
      title: "Leadership Challenge",
      text: "You face a difficult decision that will impact your team and the company. How do you proceed?",
      tags: ["leadership", "decision"]
    };

    return {
      id: `dynamic-${Date.now()}`,
      scenario: {
        phase: phase,
        tags: scenarioTemplate.tags,
        title: scenarioTemplate.title,
        text: scenarioTemplate.text,
        options: {
          option1: {
            hint: "Quick action",
            description: "Take immediate decisive action to move things forward.",
            immediate: { "company.velocity": 2, "leader.trust": -1, "company.morale": -1 },
            tags: ["execution_focused", "quick_decision"],
            summary: "You chose decisive action, moving quickly but potentially straining relationships."
          },
          option2: {
            hint: "Collaborate",
            description: "Bring stakeholders together to find a collaborative solution.",
            immediate: { "leader.trust": 2, "company.stakeholder": 1, "company.velocity": -1 },
            tags: ["collaborative", "people_focused"],
            summary: "You prioritized collaboration, building trust but potentially slowing progress."
          },
          option3: {
            hint: "Strategic",
            description: "Take time to analyze the situation and develop a comprehensive approach.",
            immediate: { "leader.vision": 2, "company.stakeholder": -1, "company.velocity": -1 },
            tags: ["strategic", "long_term"],
            summary: "You chose a strategic approach, thinking long-term but potentially missing immediate opportunities."
          }
        }
      }
    };
  }

  function selectScenarioFromDeck(context) {
    if (!deckData || !deckData.scenarios) {
      console.warn('No deck data available, using fallback');
      return generateDynamicScenario(context);
    }
    
    const phase = context.turn <= 3 ? "early" : context.turn <= 6 ? "mid" : "late";
    const scenarios = Object.entries(deckData.scenarios);
    
    // Filter by phase
    let candidates = scenarios.filter(([id, scenario]) => scenario.phase === phase);
    
    // If no phase matches, get any scenario
    if (candidates.length === 0) {
      candidates = scenarios;
    }
    
    // Filter by tags that match current context
    const template = context.template;
    const archetype = context.archetype;
    
    // Weight scenarios based on context
    const weightedCandidates = candidates.map(([id, scenario]) => {
      let weight = 1;
      const tags = scenario.tags || [];
      
      // Weight by template-specific tags
      if (template === 'startup' && tags.includes('velocity_low')) weight += 2;
      if (template === 'startup' && tags.includes('financials_low')) weight += 2;
      if (template === 'scaleup' && tags.includes('tech_debt_high')) weight += 2;
      if (template === 'bigco' && tags.includes('process_heavy')) weight += 2;
      
      // Weight by archetype preferences
      if (archetype === 'operator' && tags.includes('execution_focused')) weight += 1.5;
      if (archetype === 'servant_leader' && tags.includes('people_focused')) weight += 1.5;
      if (archetype === 'visionary' && tags.includes('strategic')) weight += 1.5;
      if (archetype === 'firefighter' && tags.includes('crisis_response')) weight += 1.5;
      
      return [id, scenario, weight];
    });
    
    // Select weighted random scenario
    const totalWeight = weightedCandidates.reduce((sum, [, , weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [id, scenario, weight] of weightedCandidates) {
      random -= weight;
      if (random <= 0) {
        return { id, scenario };
      }
    }
    
    // Fallback to first scenario
    const [id, scenario] = candidates[0] || scenarios[0];
    return { id, scenario };
  }

  async function asyncRequest(context) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      if (context.requestType === 'batch') {
        // Return multiple scenarios for batch requests
        const scenarios = [];
        for (let i = 0; i < 3; i++) {
          scenarios.push(selectScenarioFromDeck(context));
        }
        return { scenarios: scenarios };
      } else {
        // Return single scenario
        return selectScenarioFromDeck(context);
      }
    } catch (error) {
      console.warn('[Mock API] Request failed:', error.message);
      return null;
    }
  }

  // Expose the service globally
  window.ScenarioService = {
    buildContextFromState: buildContextFromState,
    asyncRequest: asyncRequest
  };

  console.log('Mock Scenario Service loaded for GitHub Pages deployment');
})();
