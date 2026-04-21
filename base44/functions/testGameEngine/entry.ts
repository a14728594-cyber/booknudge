import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const results = [];

  // --- Test 1: applyStatEffects ---
  {
    const stats = { revenue: 50, brand: 50, trust: 50, resource: 50 };
    const effects = { revenue: 15, brand: -10, trust: 0, resource: -20 };
    const newStats = {};
    const STAT_KEYS = ['revenue', 'brand', 'trust', 'resource'];
    for (const key of STAT_KEYS) {
      newStats[key] = Math.min(100, Math.max(0, stats[key] + (effects[key] ?? 0)));
    }
    const isBankrupt = STAT_KEYS.some(k => newStats[k] <= 0);
    results.push({
      test: 'applyStatEffects',
      input: { stats, effects },
      output: { newStats, isBankrupt },
      pass: newStats.revenue === 65 && newStats.brand === 40 && newStats.trust === 50 && newStats.resource === 30 && !isBankrupt
    });
  }

  // --- Test 2: isBankrupt when resource hits 0 ---
  {
    const stats = { revenue: 50, brand: 50, trust: 50, resource: 10 };
    const effects = { revenue: 0, brand: 0, trust: 0, resource: -15 };
    const STAT_KEYS = ['revenue', 'brand', 'trust', 'resource'];
    const newStats = {};
    for (const key of STAT_KEYS) {
      newStats[key] = Math.min(100, Math.max(0, stats[key] + (effects[key] ?? 0)));
    }
    const isBankrupt = STAT_KEYS.some(k => newStats[k] <= 0);
    results.push({
      test: 'isBankrupt_resource_zero',
      input: { stats, effects },
      output: { newStats, isBankrupt },
      pass: newStats.resource === 0 && isBankrupt === true
    });
  }

  // --- Test 3: determineEndingType ---
  const determineEndingType = (finalStats) => {
    const STAT_KEYS = ['revenue', 'brand', 'trust', 'resource'];
    if (STAT_KEYS.some(k => finalStats[k] <= 0)) return 'failure';
    const total = STAT_KEYS.reduce((sum, k) => sum + (finalStats[k] ?? 0), 0);
    if (total >= 280) return 'great_success';
    if (total >= 220) return 'success';
    if (total >= 160) return 'survival';
    if (total >= 100) return 'struggle';
    return 'failure';
  };

  const endingCases = [
    { stats: { revenue: 75, brand: 75, trust: 75, resource: 75 }, expected: 'great_success' },
    { stats: { revenue: 60, brand: 60, trust: 55, resource: 55 }, expected: 'success' },
    { stats: { revenue: 45, brand: 45, trust: 40, resource: 40 }, expected: 'survival' },
    { stats: { revenue: 30, brand: 30, trust: 25, resource: 25 }, expected: 'struggle' },
    { stats: { revenue: 20, brand: 20, trust: 10, resource: 10 }, expected: 'failure' },
    { stats: { revenue: 0, brand: 80, trust: 80, resource: 80 }, expected: 'failure' },
  ];

  for (const c of endingCases) {
    const result = determineEndingType(c.stats);
    results.push({
      test: `determineEndingType_${c.expected}`,
      input: c.stats,
      output: result,
      pass: result === c.expected
    });
  }

  // --- Test 4: checkSceneCondition ---
  const checkSceneCondition = (conditionJson, currentStats) => {
    if (!conditionJson || Object.keys(conditionJson).length === 0) return true;
    for (const [statKey, condition] of Object.entries(conditionJson)) {
      const val = currentStats[statKey] ?? 50;
      if (condition.$lt  !== undefined && !(val <  condition.$lt))  return false;
      if (condition.$lte !== undefined && !(val <= condition.$lte)) return false;
      if (condition.$gt  !== undefined && !(val >  condition.$gt))  return false;
      if (condition.$gte !== undefined && !(val >= condition.$gte)) return false;
    }
    return true;
  };

  results.push({
    test: 'checkSceneCondition_resource_lt30_match',
    input: { condition: { resource: { $lt: 30 } }, stats: { resource: 20 } },
    output: checkSceneCondition({ resource: { $lt: 30 } }, { resource: 20 }),
    pass: checkSceneCondition({ resource: { $lt: 30 } }, { resource: 20 }) === true
  });

  results.push({
    test: 'checkSceneCondition_resource_lt30_no_match',
    input: { condition: { resource: { $lt: 30 } }, stats: { resource: 50 } },
    output: checkSceneCondition({ resource: { $lt: 30 } }, { resource: 50 }),
    pass: checkSceneCondition({ resource: { $lt: 30 } }, { resource: 50 }) === false
  });

  // --- Test 5: DB からテストエピソードのシーン・選択肢を読む ---
  const episodes = await base44.asServiceRole.entities.GameEpisode.filter({ title: { $regex: 'テスト' } }, 'order', 1);
  const ep = episodes[0];
  let dbTest = { test: 'db_episode_exists', pass: false, output: null };
  if (ep) {
    const scenes = await base44.asServiceRole.entities.GameScene.filter({ episode_id: ep.id }, 'scene_number', 20);
    const decisionScenes = scenes.filter(s => s.scene_type === 'decision');
    const choices = decisionScenes.length > 0
      ? await base44.asServiceRole.entities.GameChoice.filter({ scene_id: decisionScenes[0].id }, 'order', 10)
      : [];
    dbTest = {
      test: 'db_episode_exists',
      pass: scenes.length > 0 && choices.length > 0,
      output: {
        episode: ep.title,
        total_scenes: scenes.length,
        decision_scenes: decisionScenes.length,
        choices_for_first_decision: choices.length
      }
    };
  }
  results.push(dbTest);

  const allPassed = results.every(r => r.pass);

  return Response.json({
    summary: allPassed ? '✅ 全テスト合格' : '❌ 一部テスト失敗',
    passed: results.filter(r => r.pass).length,
    total: results.length,
    results
  });
});