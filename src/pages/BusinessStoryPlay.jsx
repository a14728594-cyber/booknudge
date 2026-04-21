import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  STAT_KEYS, STAT_LABELS, STAT_BG_COLORS, STAT_COLORS, STAT_ICONS,
  applyStatEffects, determineEndingType, checkSceneCondition,
  getNextScene, getEndingScene
} from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

// タイプライターフック
function useTypewriter(text, speed = 30, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    if (!active || !text) { setDisplayed(text || ''); setDone(true); return; }

    const tick = () => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) { setDone(true); return; }
      timerRef.current = setTimeout(tick, speed);
    };
    timerRef.current = setTimeout(tick, speed);
    return () => clearTimeout(timerRef.current);
  }, [text, speed, active]);

  const skipToEnd = useCallback(() => {
    clearTimeout(timerRef.current);
    setDisplayed(text || '');
    setDone(true);
  }, [text]);

  return { displayed, done, skipToEnd };
}

export default function BusinessStoryPlay() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get('episode_id');

  const [episode, setEpisode] = useState(null);
  const [allScenes, setAllScenes] = useState([]);
  const [allChoices, setAllChoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentScene, setCurrentScene] = useState(null);
  const [stats, setStats] = useState({});
  const [phase, setPhase] = useState('narrative'); // narrative | choices | feedback | ending
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [statDeltas, setStatDeltas] = useState({});
  const [flashStats, setFlashStats] = useState({});
  const [hoveredChoice, setHoveredChoice] = useState(null);
  const [choiceHistory, setChoiceHistory] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const [user, setUser] = useState(null);
  const [longPressChoice, setLongPressChoice] = useState(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (!episodeId) { navigate('/business-story'); return; }
    loadGameData();
  }, [episodeId]);

  const loadGameData = async () => {
    try {
      const [ep, scenes, userData] = await Promise.all([
        base44.entities.GameEpisode.get(episodeId),
        base44.entities.GameScene.filter({ episode_id: episodeId, is_active: true }, 'scene_number', 50),
        base44.auth.me().catch(() => null)
      ]);
      setEpisode(ep);
      setUser(userData);

      // 全選択肢を一括取得
      const decisionAndEventScenes = scenes.filter(s => ['decision', 'event'].includes(s.scene_type));
      const choiceResults = await Promise.all(
        decisionAndEventScenes.map(s =>
          base44.entities.GameChoice.filter({ scene_id: s.id }, 'order', 10)
        )
      );
      const choiceMap = {};
      decisionAndEventScenes.forEach((s, i) => { choiceMap[s.id] = choiceResults[i]; });

      setAllScenes(scenes);
      setAllChoices(choiceMap);
      setStats({ ...ep.initial_stats });

      // opening or first scene
      const opening = scenes.find(s => s.scene_type === 'opening') || scenes[0];
      setCurrentScene(opening);
      setPhase('narrative');
    } catch (e) {
      console.error(e);
      navigate('/business-story');
    } finally {
      setLoading(false);
    }
  };

  const { displayed: narrativeText, done: narrativeDone, skipToEnd } = useTypewriter(
    currentScene?.narrative || '',
    30,
    phase === 'narrative'
  );

  const handleNarrativeTap = () => {
    if (!narrativeDone) { skipToEnd(); return; }
    if (currentScene?.scene_type === 'ending') return;
    if (currentScene?.scene_type === 'opening') {
      // openingから次のシーンへ
      const next = getNextScene(allScenes, currentScene.scene_number, stats, null, false);
      if (next) { setCurrentScene(next); setPhase('narrative'); }
      return;
    }
    setPhase('choices');
  };

  const handleChoiceSelect = (choice) => {
    const { newStats, isBankrupt } = applyStatEffects(stats, choice.stat_effects || {});

    // フラッシュエフェクト
    const deltas = {};
    const flashes = {};
    for (const key of STAT_KEYS) {
      const delta = (choice.stat_effects?.[key] ?? 0);
      if (delta !== 0) {
        deltas[key] = delta;
        flashes[key] = delta > 0 ? 'up' : 'down';
      }
    }
    setStatDeltas(deltas);
    setFlashStats(flashes);
    setTimeout(() => setFlashStats({}), 1000);

    setStats(newStats);
    setSelectedChoice(choice);
    setChoiceHistory(prev => [...prev, { scene_id: currentScene.id, choice_id: choice.id, stat_effects: choice.stat_effects }]);
    setPhase('feedback');

    // バッドエンド強制
    if (isBankrupt) {
      setTimeout(() => {
        const failScene = getEndingScene(allScenes, 'failure');
        if (failScene) { setCurrentScene(failScene); setPhase('ending'); }
      }, 2500);
    }
  };

  const handleNext = () => {
    const isBankrupt = STAT_KEYS.some(k => stats[k] <= 0);
    const override = selectedChoice?.next_scene_override || null;
    const next = getNextScene(allScenes, currentScene.scene_number, stats, override, isBankrupt);

    if (!next) {
      // エンディングへ
      const endingType = determineEndingType(stats);
      const endingScene = getEndingScene(allScenes, endingType);
      if (endingScene) {
        setCurrentScene(endingScene);
        setPhase('ending');
        saveSession(endingType);
      }
    } else {
      setCurrentScene(next);
      setSelectedChoice(null);
      setStatDeltas({});
      setPhase('narrative');
    }
  };

  const saveSession = async (endingType) => {
    if (!user) return;
    try {
      const session = await base44.entities.GamePlaySession.create({
        user_id: user.id,
        episode_id: episodeId,
        final_stats: stats,
        ending_type: endingType,
        total_scenes: choiceHistory.length,
        play_duration_seconds: Math.floor((Date.now() - sessionStartTime) / 1000),
        started_at: new Date(sessionStartTime).toISOString(),
        completed_at: new Date().toISOString(),
        is_completed: true
      });
      // 選択履歴を保存
      await Promise.all(
        choiceHistory.map(c =>
          base44.entities.GamePlayChoice.create({
            session_id: session.id,
            scene_id: c.scene_id,
            choice_id: c.choice_id,
            stats_after: stats,
            chosen_at: new Date().toISOString()
          })
        )
      );
    } catch (e) {
      console.error('Session save error:', e);
    }
  };

  const handleLongPressStart = (choice) => {
    longPressTimer.current = setTimeout(() => setLongPressChoice(choice.id), 400);
  };
  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
    setLongPressChoice(null);
  };

  if (loading || !currentScene) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentChoices = allChoices[currentScene?.id] || [];
  const isEnding = currentScene?.scene_type === 'ending';

  if (isEnding && phase === 'ending') {
    navigate(`/business-story/ending?episode_id=${episodeId}&ending_type=${currentScene.ending_type}&stats=${encodeURIComponent(JSON.stringify(stats))}&choices=${encodeURIComponent(JSON.stringify(choiceHistory))}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col" onClick={phase === 'narrative' ? handleNarrativeTap : undefined}>
      {/* ステータスバー（固定） */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-2">
          {STAT_KEYS.map(key => {
            const val = stats[key] ?? 50;
            const isDanger = val <= 20;
            const flash = flashStats[key];
            const delta = statDeltas[key];
            const hoverDelta = hoveredChoice ? (hoveredChoice.stat_effects?.[key] ?? 0) : null;

            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-base w-5 text-center">{STAT_ICONS[key]}</span>
                <div className="flex-1 relative h-3 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`absolute left-0 top-0 h-full rounded-full ${STAT_BG_COLORS[key]} ${isDanger ? 'animate-pulse' : ''}`}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                  {/* ホバー予告 */}
                  {hoverDelta !== null && hoverDelta !== 0 && (
                    <motion.div
                      className={`absolute top-0 h-full rounded-full opacity-40 ${hoverDelta > 0 ? 'bg-green-400 left-auto' : 'bg-red-400'}`}
                      style={{
                        left: hoverDelta > 0 ? `${val}%` : `${Math.max(0, val + hoverDelta)}%`,
                        width: `${Math.abs(hoverDelta)}%`
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                    />
                  )}
                  {/* フラッシュ */}
                  {flash && (
                    <motion.div
                      className={`absolute inset-0 rounded-full ${flash === 'up' ? 'bg-green-400' : 'bg-red-400'}`}
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 w-12 justify-end">
                  <span className={`text-xs font-bold ${isDanger ? 'text-red-400' : 'text-slate-300'}`}>{val}</span>
                  {delta !== undefined && delta !== 0 && (
                    <motion.span
                      className={`text-xs font-bold ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: delta > 0 ? -12 : 12 }}
                      transition={{ duration: 1 }}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </motion.span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* シーンタイプバッジ */}
        {currentScene.scene_type === 'event' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3 py-1 rounded-full">
              ⚡ 緊急イベント
            </span>
          </div>
        )}

        {/* 地の文 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-6 cursor-pointer select-none"
          >
            <p className="text-slate-100 text-base leading-relaxed whitespace-pre-wrap min-h-[80px]">
              {narrativeText}
              {!narrativeDone && <span className="animate-pulse">▌</span>}
            </p>

            {/* 心の声 */}
            {narrativeDone && currentScene.emotional_text && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-4 border-t border-slate-600"
              >
                <p className="text-slate-400 italic text-sm">
                  💭 {currentScene.emotional_text}
                </p>
              </motion.div>
            )}

            {narrativeDone && phase === 'narrative' && currentScene.scene_type !== 'ending' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-500 text-xs mt-4 text-right"
              >
                タップして続ける →
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 選択肢 */}
        {phase === 'choices' && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-slate-400 text-xs text-center mb-2">どうする？（長押しで予告を確認）</p>
              {currentChoices.map((choice, idx) => {
                const isHovered = hoveredChoice?.id === choice.id;
                const isLongPressed = longPressChoice === choice.id;
                return (
                  <motion.button
                    key={choice.id}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isHovered || isLongPressed
                        ? 'bg-indigo-600/30 border-indigo-400 shadow-lg shadow-indigo-900/30'
                        : 'bg-slate-800 border-slate-600 hover:border-indigo-400 hover:bg-slate-700'
                    }`}
                    onMouseEnter={() => setHoveredChoice(choice)}
                    onMouseLeave={() => setHoveredChoice(null)}
                    onTouchStart={() => handleLongPressStart(choice)}
                    onTouchEnd={handleLongPressEnd}
                    onClick={() => handleChoiceSelect(choice)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-indigo-400 font-bold text-sm mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div className="flex-1">
                        <p className="text-slate-100 font-medium text-sm leading-relaxed">{choice.choice_text}</p>
                        {choice.subtext && (
                          <p className="text-slate-400 text-xs mt-1">{choice.subtext}</p>
                        )}
                        {/* ホバー/長押し時のstat予告 */}
                        {(isHovered || isLongPressed) && choice.stat_effects && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex flex-wrap gap-2 mt-2"
                          >
                            {STAT_KEYS.filter(k => choice.stat_effects[k] !== 0 && choice.stat_effects[k] !== undefined).map(k => (
                              <span
                                key={k}
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  choice.stat_effects[k] > 0
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {STAT_ICONS[k]}{choice.stat_effects[k] > 0 ? '+' : ''}{choice.stat_effects[k]}
                              </span>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {/* フィードバック */}
        {phase === 'feedback' && selectedChoice && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-slate-800 rounded-2xl p-5">
                <p className="text-slate-200 text-sm leading-relaxed">{selectedChoice.feedback_text}</p>
              </div>
              {selectedChoice.feedback_insight && (
                <div className="bg-indigo-900/40 border border-indigo-500/40 rounded-xl p-4">
                  <p className="text-xs text-indigo-400 font-semibold mb-1">💡 今日の学び</p>
                  <p className="text-indigo-200 text-sm font-medium italic">{selectedChoice.feedback_insight}</p>
                </div>
              )}
              <button
                onClick={handleNext}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
              >
                次へ →
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}