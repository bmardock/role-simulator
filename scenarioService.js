// Lightweight Scenario Service client
// Exposes: window.ScenarioService.asyncRequest(context) and buildContextFromState(state)

(function () {
  function buildContextFromState(state) {
    const dice = state.currentDice || (typeof currentDice !== 'undefined' ? currentDice : null);
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
      // NEW: Rich context for dynamic scenario generation
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

  async function asyncRequest(context) {
    try {
      // Shorter timeout for single requests, longer for batch
      const isBatch = context.requestType === 'batch';
      const timeout = isBatch ? 8000 : 6000; // give single calls more headroom to avoid spurious errors
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), timeout)
      );
      
      const fetchPromise = fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ context }),
      });
      
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (error) {
      console.warn('[ScenarioService] API failed:', error.message);
      return null;
    }
  }

  window.ScenarioService = { buildContextFromState, asyncRequest };
})();


