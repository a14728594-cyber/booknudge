/**
 * ビジネスストーリー ゲームエンジン
 * ステータス計算・シーン遷移・エンディング判定を担当
 */

export const STAT_KEYS = ['revenue', 'brand', 'trust', 'resource'];

export const STAT_LABELS = {
  revenue: '売上力',
  brand: 'ブランド力',
  trust: '信頼度',
  resource: 'リソース',
};

export const STAT_ICONS = {
  revenue: '💰',
  brand: '🎯',
  trust: '🤝',
  resource: '⏳',
};

export const STAT_COLORS = {
  revenue: 'text-emerald-600',
  brand: 'text-violet-600',
  trust: 'text-amber-600',
  resource: 'text-sky-600',
};

export const STAT_BG_COLORS = {
  revenue: 'bg-emerald-500',
  brand: 'bg-violet-500',
  trust: 'bg-amber-500',
  resource: 'bg-sky-500',
};

export const ENDING_CONFIG = {
  great_success: { label: '大成功', emoji: '🏆', color: 'from-yellow-400 to-amber-500' },
  success:       { label: '成功',   emoji: '🌟', color: 'from-green-400 to-emerald-500' },
  survival:      { label: '生存',   emoji: '🌱', color: 'from-blue-400 to-cyan-500' },
  struggle:      { label: '苦戦中', emoji: '😤', color: 'from-orange-400 to-red-400' },
  failure:       { label: '倒産',   emoji: '💸', color: 'from-gray-500 to-gray-700' },
};

/**
 * ステータスに選択肢の効果を適用する
 * @param {object} currentStats - 現在のステータス
 * @param {object} statEffects - 適用する効果 {revenue: +15, brand: -10, ...}
 * @returns {{ newStats: object, isBankrupt: boolean }}
 */
export function applyStatEffects(currentStats, statEffects) {
  const newStats = { ...currentStats };
  for (const key of STAT_KEYS) {
    const delta = statEffects?.[key] ?? 0;
    newStats[key] = Math.min(100, Math.max(0, (newStats[key] ?? 50) + delta));
  }
  const isBankrupt = STAT_KEYS.some(k => newStats[k] <= 0);
  return { newStats, isBankrupt };
}

/**
 * 最終ステータスからエンディングタイプを判定する
 * @param {object} finalStats
 * @returns {string} ending_type
 */
export function determineEndingType(finalStats) {
  if (STAT_KEYS.some(k => finalStats[k] <= 0)) return 'failure';
  const total = STAT_KEYS.reduce((sum, k) => sum + (finalStats[k] ?? 0), 0);
  if (total >= 280) return 'great_success';
  if (total >= 220) return 'success';
  if (total >= 160) return 'survival';
  if (total >= 100) return 'struggle';
  return 'failure';
}

/**
 * condition_json でシーンを表示すべきか判定する
 * condition_json例: { "revenue": { "$lt": 30 }, "brand": { "$gte": 60 } }
 * @param {object|null} conditionJson
 * @param {object} currentStats
 * @returns {boolean}
 */
export function checkSceneCondition(conditionJson, currentStats) {
  if (!conditionJson || Object.keys(conditionJson).length === 0) return true;
  for (const [statKey, condition] of Object.entries(conditionJson)) {
    const val = currentStats[statKey] ?? 50;
    if (condition.$lt  !== undefined && !(val <  condition.$lt))  return false;
    if (condition.$lte !== undefined && !(val <= condition.$lte)) return false;
    if (condition.$gt  !== undefined && !(val >  condition.$gt))  return false;
    if (condition.$gte !== undefined && !(val >= condition.$gte)) return false;
    if (condition.$eq  !== undefined && !(val === condition.$eq)) return false;
  }
  return true;
}

/**
 * シーン一覧から次に表示するシーンを決定する
 * @param {object[]} allScenes - 全シーン（scene_number昇順でソート済み）
 * @param {number} currentSceneNumber - 現在のシーン番号
 * @param {object} currentStats - 現在のステータス
 * @param {number|null} nextSceneOverride - 選択肢で指定されたジャンプ先
 * @param {boolean} isBankrupt - バッドエンド強制フラグ
 * @returns {object|null} 次のシーン
 */
export function getNextScene(allScenes, currentSceneNumber, currentStats, nextSceneOverride, isBankrupt) {
  // バッドエンド強制
  if (isBankrupt) {
    const failureEnding = allScenes.find(s => s.scene_type === 'ending' && s.ending_type === 'failure');
    return failureEnding || null;
  }

  // ジャンプ先が指定されている場合
  if (nextSceneOverride) {
    const target = allScenes.find(s => s.scene_number === nextSceneOverride);
    if (target) return target;
  }

  // 通常進行: 次のシーン番号以降で条件を満たす最初のシーン
  const candidates = allScenes.filter(s =>
    s.scene_number > currentSceneNumber &&
    s.scene_type !== 'ending'
  );

  for (const scene of candidates) {
    if (scene.scene_type === 'event') {
      if (checkSceneCondition(scene.condition_json, currentStats)) return scene;
      continue; // 条件未達のeventはスキップ
    }
    return scene;
  }

  return null; // 通常シーンがなければエンディングへ
}

/**
 * エンディングシーンを取得する
 * @param {object[]} allScenes
 * @param {string} endingType
 * @returns {object|null}
 */
export function getEndingScene(allScenes, endingType) {
  return allScenes.find(s => s.scene_type === 'ending' && s.ending_type === endingType) || null;
}

/**
 * ステータスの合計値を計算する
 */
export function calcTotalStats(stats) {
  return STAT_KEYS.reduce((sum, k) => sum + (stats[k] ?? 0), 0);
}