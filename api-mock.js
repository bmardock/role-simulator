// Mock API for GitHub Pages deployment
// This replaces the need for a backend server

(function() {
  // Mock scenario data
  const mockScenarios = [
    {
      id: "startup-1",
      scenario: {
        phase: "early",
        tags: ["onboarding", "team_building"],
        title: "First Team Meeting",
        text: "It's your first week as the new engineering manager. The team seems skeptical of yet another leadership change. How do you establish credibility?",
        options: {
          option1: {
            hint: "Listen first",
            description: "Spend time understanding the team's challenges before making changes.",
            immediate: { "leader.trust": 2, "company.morale": 1, "company.velocity": -1 },
            tags: ["people_focused", "collaborative"],
            summary: "You chose to listen and understand before acting, building trust but slowing initial progress."
          },
          option2: {
            hint: "Quick wins",
            description: "Identify and fix immediate pain points to show impact.",
            immediate: { "company.velocity": 2, "leader.execution": 1, "leader.trust": -1 },
            tags: ["execution_focused", "quick_decision"],
            summary: "You focused on delivering quick wins to demonstrate competence, but may have rushed the relationship building."
          },
          option3: {
            hint: "Set vision",
            description: "Present your strategic vision for the team's future.",
            immediate: { "leader.vision": 2, "company.stakeholder": 1, "company.morale": -1 },
            tags: ["strategic", "vision_driven"],
            summary: "You shared your vision for the team's future, inspiring some but potentially overwhelming others."
          }
        }
      }
    },
    {
      id: "startup-2", 
      scenario: {
        phase: "early",
        tags: ["resource_constraint", "prioritization"],
        title: "Feature vs. Bug Fix",
        text: "A critical bug is blocking production, but the CEO wants the new feature shipped by Friday. The team is split on what to prioritize.",
        options: {
          option1: {
            hint: "Fix bug first",
            description: "Address the production issue before moving to new features.",
            immediate: { "company.velocity": 1, "company.stakeholder": -2, "leader.trust": 1 },
            tags: ["technical", "quality_focused"],
            summary: "You prioritized system stability over feature delivery, maintaining quality but disappointing stakeholders."
          },
          option2: {
            hint: "Parallel work",
            description: "Split the team to handle both simultaneously.",
            immediate: { "company.velocity": -1, "company.morale": -2, "leader.execution": 1 },
            tags: ["execution_focused", "ambitious"],
            summary: "You attempted to handle both priorities simultaneously, showing execution skills but risking team burnout."
          },
          option3: {
            hint: "Negotiate timeline",
            description: "Work with the CEO to adjust expectations and create a realistic plan.",
            immediate: { "leader.trust": 1, "company.stakeholder": 1, "company.velocity": -1 },
            tags: ["collaborative", "strategic"],
            summary: "You negotiated a more realistic timeline, building trust with stakeholders while managing team capacity."
          }
        }
      }
    },
    {
      id: "scaleup-1",
      scenario: {
        phase: "mid", 
        tags: ["tech_debt_high", "scaling_issues"],
        title: "Architecture Decision",
        text: "Your system is struggling under increased load. The team wants to rewrite the core service, but stakeholders need features delivered. What's your approach?",
        options: {
          option1: {
            hint: "Rewrite now",
            description: "Invest in a complete rewrite to solve the scaling issues.",
            immediate: { "company.tech_debt": -3, "company.velocity": -2, "company.stakeholder": -1 },
            tags: ["technical", "long_term"],
            summary: "You committed to a full rewrite, reducing technical debt but significantly slowing feature delivery."
          },
          option2: {
            hint: "Incremental fixes",
            description: "Make targeted improvements while continuing feature development.",
            immediate: { "company.tech_debt": -1, "company.velocity": 1, "company.morale": 1 },
            tags: ["balanced", "pragmatic"],
            summary: "You chose incremental improvements, making steady progress on both technical debt and features."
          },
          option3: {
            hint: "Hire expertise",
            description: "Bring in senior engineers to accelerate the rewrite while maintaining feature velocity.",
            immediate: { "company.financials": -2, "company.velocity": 1, "company.tech_debt": -2 },
            tags: ["strategic", "investment"],
            summary: "You invested in additional expertise, accelerating technical improvements at a financial cost."
          }
        }
      }
    },
    {
      id: "bigco-1",
      scenario: {
        phase: "late",
        tags: ["process_heavy", "stakeholder_pressure"],
        title: "Compliance Audit",
        text: "A compliance audit has revealed several security vulnerabilities. The audit team wants immediate fixes, but your roadmap is already packed with stakeholder requests.",
        options: {
          option1: {
            hint: "Stop everything",
            description: "Pause all feature work to address security issues immediately.",
            immediate: { "company.stakeholder": -2, "company.velocity": -2, "leader.trust": 2 },
            tags: ["crisis_response", "quality_focused"],
            summary: "You prioritized security over all else, demonstrating strong risk management but disappointing stakeholders."
          },
          option2: {
            hint: "Parallel tracks",
            description: "Create separate teams for security fixes and feature development.",
            immediate: { "company.financials": -1, "company.morale": -1, "company.velocity": 1 },
            tags: ["execution_focused", "resource_heavy"],
            summary: "You allocated resources to handle both priorities, maintaining progress while addressing security concerns."
          },
          option3: {
            hint: "Negotiate timeline",
            description: "Work with audit team to create a phased approach to security fixes.",
            immediate: { "leader.trust": 1, "company.stakeholder": 1, "company.tech_debt": 1 },
            tags: ["collaborative", "strategic"],
            summary: "You negotiated a phased approach, balancing security needs with business requirements."
          }
        }
      }
    }
  ];

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

  async function asyncRequest(context) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
      
      if (context.requestType === 'batch') {
        // Return multiple scenarios for batch requests
        const scenarios = [];
        for (let i = 0; i < 3; i++) {
          scenarios.push(generateDynamicScenario(context));
        }
        return { scenarios: scenarios };
      } else {
        // Return single scenario
        return generateDynamicScenario(context);
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
