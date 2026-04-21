import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const results = [];

  const ep1 = await base44.asServiceRole.entities.GameEpisode.filter({ title: '迷えるカフェオーナーの30日' }, 'order', 1);
  const ep2 = await base44.asServiceRole.entities.GameEpisode.filter({ title: '見えない価値を売るデザイナーの2ヶ月' }, 'order', 1);

  for (const [label, ep] of [['Ep1_カフェ', ep1[0]], ['Ep2_デザイナー', ep2[0]]]) {
    if (!ep) { results.push({ label, pass: false, error: 'episode not found' }); continue; }

    const scenes = await base44.asServiceRole.entities.GameScene.filter({ episode_id: ep.id }, 'scene_number', 30);
    const decisionScenes = scenes.filter(s => s.scene_type === 'decision');
    const eventScenes = scenes.filter(s => s.scene_type === 'event');
    const endingScenes = scenes.filter(s => s.scene_type === 'ending');
    const openingScenes = scenes.filter(s => s.scene_type === 'opening');

    // 各decisionシーンの選択肢を取得
    const choiceCounts = {};
    for (const s of [...decisionScenes, ...eventScenes]) {
      const choices = await base44.asServiceRole.entities.GameChoice.filter({ scene_id: s.id }, 'order', 10);
      choiceCounts[`scene_${s.scene_number}`] = choices.length;
    }

    // エンディングタイプのチェック
    const endingTypes = endingScenes.map(s => s.ending_type);
    const requiredEndings = ['great_success', 'success', 'survival', 'struggle', 'failure'];
    const hasAllEndings = requiredEndings.every(t => endingTypes.includes(t));

    // 全シーンの選択肢が2つ以上あるか
    const allChoicesOk = Object.values(choiceCounts).every(c => c >= 2);

    // 条件付きイベントシーンのcondition_jsonチェック
    const eventHasCondition = eventScenes.every(s => s.condition_json && Object.keys(s.condition_json).length > 0);

    results.push({
      label,
      episode_id: ep.id,
      pass: hasAllEndings && allChoicesOk && eventHasCondition && openingScenes.length === 1,
      stats: {
        total_scenes: scenes.length,
        opening: openingScenes.length,
        decision: decisionScenes.length,
        event: eventScenes.length,
        ending: endingScenes.length,
        has_all_5_endings: hasAllEndings,
        all_choices_ok: allChoicesOk,
        event_has_condition: eventHasCondition,
        choice_counts: choiceCounts,
        ending_types_found: endingTypes,
        initial_stats: ep.initial_stats,
        linked_books: ep.linked_book_ids?.length ?? 0,
      }
    });
  }

  // --- ステータス計算シミュレーション ---
  // エピソード1の「全B選択ルート」テスト
  const simResults = [];
  for (const [label, ep] of [['Ep1_全B', ep1[0]], ['Ep2_全A', ep2[0]]]) {
    if (!ep) continue;
    const stats = { ...ep.initial_stats };
    const scenes = await base44.asServiceRole.entities.GameScene.filter({ episode_id: ep.id }, 'scene_number', 30);
    const playableScenes = scenes.filter(s => ['decision', 'event'].includes(s.scene_type));

    for (const scene of playableScenes) {
      // 条件チェック
      if (scene.condition_json) {
        let show = true;
        for (const [k, cond] of Object.entries(scene.condition_json)) {
          const v = stats[k] ?? 50;
          if (cond.$lt !== undefined && !(v < cond.$lt)) show = false;
        }
        if (!show) continue;
      }
      const choices = await base44.asServiceRole.entities.GameChoice.filter({ scene_id: scene.id }, 'order', 10);
      const pick = label.includes('全B') ? (choices[1] || choices[0]) : choices[0];
      if (!pick?.stat_effects) continue;
      for (const [k, v] of Object.entries(pick.stat_effects)) {
        stats[k] = Math.min(100, Math.max(0, (stats[k] ?? 50) + v));
      }
    }

    const total = Object.values(stats).reduce((s, v) => s + v, 0);
    const isBankrupt = Object.values(stats).some(v => v <= 0);
    let ending = isBankrupt ? 'failure' : total >= 280 ? 'great_success' : total >= 220 ? 'success' : total >= 160 ? 'survival' : total >= 100 ? 'struggle' : 'failure';
    simResults.push({ label, final_stats: stats, total, ending, isBankrupt });
  }

  const allPassed = results.every(r => r.pass);
  return Response.json({
    summary: allPassed ? '✅ Phase2 全チェック合格' : '❌ 一部チェック失敗',
    episode_checks: results,
    simulation: simResults
  });
});