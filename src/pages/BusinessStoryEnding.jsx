import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { STAT_KEYS, STAT_LABELS, STAT_ICONS as STAT_ICONS_EXPORTED, ENDING_CONFIG, determineEndingType } from '@/lib/gameEngine';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Share2, RotateCcw, ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

// タイプライターコンポーネント
function Typewriter({ text, speed = 25 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    idx.current = 0;
    const tick = () => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) { setDone(true); return; }
      timerRef.current = setTimeout(tick, speed);
    };
    timerRef.current = setTimeout(tick, speed);
    return () => clearTimeout(timerRef.current);
  }, [text]);

  const skip = () => { clearTimeout(timerRef.current); setDisplayed(text); setDone(true); };

  return (
    <div onClick={!done ? skip : undefined} className="cursor-pointer">
      <p className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap">
        {displayed}
        {!done && <span className="animate-pulse">▌</span>}
      </p>
    </div>
  );
}

const STAT_ICONS_MAP = STAT_ICONS_EXPORTED || { revenue: '💰', brand: '🎯', trust: '🤝', resource: '⏳' };

export default function BusinessStoryEnding() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get('episode_id');
  const endingType = urlParams.get('ending_type');
  const statsRaw = urlParams.get('stats');
  const choicesRaw = urlParams.get('choices');

  const [episode, setEpisode] = useState(null);
  const [endingScene, setEndingScene] = useState(null);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tendency, setTendency] = useState('');

  const stats = statsRaw ? JSON.parse(decodeURIComponent(statsRaw)) : {};
  const choices = choicesRaw ? JSON.parse(decodeURIComponent(choicesRaw)) : [];
  const endingConf = ENDING_CONFIG[endingType] || ENDING_CONFIG.survival;

  useEffect(() => {
    loadData();
    analyzeTendency();
  }, []);

  const loadData = async () => {
    try {
      const [ep, scenes] = await Promise.all([
        base44.entities.GameEpisode.get(episodeId),
        base44.entities.GameScene.filter({ episode_id: episodeId }, 'scene_number', 50)
      ]);
      setEpisode(ep);
      const ending = scenes.find(s => s.scene_type === 'ending' && s.ending_type === endingType);
      setEndingScene(ending);

      // 推薦本
      if (ep.linked_book_ids?.length > 0) {
        const books = await Promise.all(
          ep.linked_book_ids.slice(0, 4).map(id => base44.entities.Book.get(id).catch(() => null))
        );
        setRecommendedBooks(books.filter(Boolean));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTendency = () => {
    // 各ステータスへの平均効果を計算
    const totals = { revenue: 0, brand: 0, trust: 0, resource: 0 };
    for (const c of choices) {
      for (const k of STAT_KEYS) {
        totals[k] += (c.stat_effects?.[k] ?? 0);
      }
    }
    const maxKey = STAT_KEYS.reduce((a, b) => totals[a] >= totals[b] ? a : b);
    const minKey = STAT_KEYS.reduce((a, b) => totals[a] <= totals[b] ? a : b);

    const tendencyMap = {
      revenue: 'あなたは売上・成果を重視し、スピードある判断を好む傾向があります',
      brand: 'あなたはブランド力・長期価値を重視し、短期より未来への投資を選ぶ傾向があります',
      trust: 'あなたは信頼関係・人とのつながりを大切にする判断を好む傾向があります',
      resource: 'あなたはリソース管理・持続性を重視し、堅実な経営判断を好む傾向があります',
    };
    setTendency(tendencyMap[maxKey] || '');
  };

  const handleShare = () => {
    const epTitle = episode?.title || 'ビジネスストーリー';
    const endingLabel = endingConf.label;
    const text = `booknudgeの『${epTitle}』をプレイしました${endingConf.emoji}\n結末:【${endingLabel}】\n売上力${stats.revenue || 0} / ブランド力${stats.brand || 0} / 信頼度${stats.trust || 0} / リソース${stats.resource || 0}\n\nあなたならどう判断する？\nhttps://booknudge.base44.app\n\n#booknudge #ビジネスストーリー`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => alert('シェアテキストをコピーしました！'));
    }
  };

  // レーダーチャートデータ
  const radarData = STAT_KEYS.map(k => ({
    subject: STAT_LABELS[k],
    value: stats[k] ?? 0,
    fullMark: 100
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* エンディングヘッダー */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 bg-gradient-to-br ${endingConf.color} text-center`}
        >
          <div className="text-5xl mb-3">{endingConf.emoji}</div>
          <h1 className="text-2xl font-bold text-white mb-1">{endingConf.label}</h1>
          <p className="text-white/80 text-sm">{episode?.title}</p>
        </motion.div>

        {/* エンディング地の文 */}
        {endingScene && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 rounded-2xl p-6"
          >
            <Typewriter text={endingScene.narrative} speed={20} />
            {endingScene.ending_message && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-indigo-300 text-sm italic leading-relaxed">{endingScene.ending_message}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* レーダーチャート */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-bold mb-4 text-center">最終ステータス</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Radar name="stats" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {STAT_KEYS.map(k => (
              <div key={k} className="flex items-center justify-between bg-slate-700 rounded-xl px-3 py-2">
                <span className="text-slate-300 text-sm">{STAT_ICONS_MAP[k]} {STAT_LABELS[k]}</span>
                <span className="font-bold text-white">{stats[k] ?? 0}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 傾向分析 */}
        {tendency && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-indigo-900/40 border border-indigo-500/40 rounded-2xl p-5"
          >
            <h2 className="text-indigo-300 font-bold text-sm mb-2">🧭 あなたの判断の傾向</h2>
            <p className="text-white text-sm leading-relaxed">{tendency}</p>
          </motion.div>
        )}

        {/* 推薦本 */}
        {recommendedBooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-slate-800 rounded-2xl p-5"
          >
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              この判断力を鍛える本
            </h2>
            <div className="space-y-3">
              {recommendedBooks.slice(0, 3).map(book => (
                <Link
                  key={book.id}
                  to={`/BookDetail?id=${book.id}`}
                  className="flex items-center gap-3 p-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"
                >
                  {book.cover_url && (
                    <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm line-clamp-2">{book.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{(book.authors || []).join(', ')}</p>
                    {book.one_liner && (
                      <p className="text-indigo-300 text-xs mt-1 italic line-clamp-1">{book.one_liner}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* アクションボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="space-y-3 pb-8"
        >
          <button
            onClick={handleShare}
            className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            結果をシェアする
          </button>
          <Link
            to={`/business-story/play?episode_id=${episodeId}&replay=true`}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            別の結末を見る（もう1回）
          </Link>
          <Link
            to="/business-story"
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            他のエピソードを見る
          </Link>
        </motion.div>
      </div>
    </div>
  );
}