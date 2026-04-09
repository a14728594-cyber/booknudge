import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import CustomerStreet from '@/components/game/CustomerStreet';

const SCORE_LABELS = {
  target_clarity:      'ターゲットの解像度',
  value_clarity:       '価値の訴求力',
  price_reasonability: '価格の納得感',
  differentiation:     '差別化の実質',
  action_strength:     '行動喚起力',
};

const WEAKNESS_LABELS = {
  target_unclear:           'ターゲットが曖昧',
  target_too_broad:         'ターゲットが広すぎる',
  value_not_clear:          '価値が伝わりにくい',
  price_too_high:           '価格が高い',
  price_justification_weak: '価格の根拠が弱い',
  no_differentiation:       '差別化が不十分',
  weak_promotion:           '告知手段が弱い',
  unique_value_missing:     '独自性が見えない',
  action_trigger_weak:      '購買動機が弱い',
};

// スコアに応じた色
function scoreColor(val, max = 20) {
  const pct = val / max;
  if (pct >= 0.75) return 'bg-green-500';
  if (pct >= 0.5)  return 'bg-amber-400';
  return 'bg-red-400';
}

// フェーズ管理：1=市場反応 2=強み/弱点ティーザー 3=ログインCTA/詳細
export default function PlanResult() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [books, setBooks] = useState([]);
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem('game_ai_result');
    if (!stored) { navigate('/'); return; }
    setAiResult(JSON.parse(stored));

    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        setIsLoggedIn(true);
        await saveSession(me);
        await loadBooks(JSON.parse(stored));
        // ログイン済みは全フェーズを即開放
        setPhase(3);
      }
    });
  }, []);

  const saveSession = async (me) => {
    const plan = JSON.parse(localStorage.getItem('game_plan') || '{}');
    const aiRes = JSON.parse(localStorage.getItem('game_ai_result') || '{}');
    try {
      await base44.entities.PlanSession.create({
        user_id: me.id,
        stage: localStorage.getItem('game_stage') || 'cafe',
        genre: localStorage.getItem('game_genre') || 'marketing',
        plan_target:       plan.target,
        plan_product:      plan.product,
        plan_price:        plan.price,
        plan_promotion:    plan.promotion,
        plan_unique_value: plan.unique_value,
        ai_result: aiRes,
        status: 'analyzed',
      });
    } catch (e) { /* 保存失敗は無視 */ }
  };

  const loadBooks = async (result) => {
    const tags = result?.weakness_tags || [];
    if (tags.length === 0) return;
    const allBooks = await base44.entities.Book.list();
    const matched = allBooks.filter(b =>
      b.diagnosis_types?.some(t => tags.includes(t))
    );
    setBooks(matched.slice(0, 3));
  };

  const handleLogin = () => base44.auth.redirectToLogin(window.location.href);

  if (!aiResult) return null;

  const totalScore = aiResult.scores
    ? Object.values(aiResult.scores).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Result</p>
          <h1 className="text-2xl font-bold text-white">市場に出してみました</h1>
          <p className="text-sm text-gray-500 mt-1">想定顧客の反応と、企画への評価です</p>
        </motion.div>

        {/* ─── Phase 1: 市場反応 ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">市場反応（10人中）</p>
          </div>
          <CustomerStreet
            customerReaction={aiResult.customer_reaction}
            isTeaser={!isLoggedIn}
          />
        </motion.div>

        {/* ─── Phase 2: 強みと気になる弱点 ─── */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLoggedIn ? 0.3 : 1.5 }}
              className="space-y-3 mb-5"
            >
              {/* 強み */}
              <div className="bg-green-950/60 border border-green-800 rounded-2xl px-4 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-400 text-sm">✅</span>
                  <p className="text-xs font-bold text-green-400 tracking-wide">強みが見つかりました</p>
                </div>
                <p className="text-sm text-white leading-relaxed">{aiResult.strength_hint}</p>
              </div>

              {/* 気になる弱点 */}
              <div className="bg-amber-950/60 border border-amber-800 rounded-2xl px-4 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 text-sm">⚠️</span>
                  <p className="text-xs font-bold text-amber-400 tracking-wide">気になるポイントが1つあります</p>
                </div>
                {isLoggedIn ? (
                  <p className="text-sm text-white leading-relaxed">
                    {WEAKNESS_LABELS[aiResult.hidden_weakness_tag] || aiResult.hidden_weakness_tag}
                  </p>
                ) : (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-5 bg-amber-900/60 rounded blur-sm" />
                    <p className="text-xs text-amber-600 flex-shrink-0">ログインで確認</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── ログイン後：詳細 ─── */}
        {isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 mb-6"
          >
            {/* 総評 */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4">
              <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">プロの総評</p>
              <p className="text-sm text-gray-200 leading-relaxed">{aiResult.summary}</p>
            </div>

            {/* 総合スコア */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">総合スコア</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{totalScore}</span>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
              </div>
              <div className="space-y-3">
                {aiResult.scores && Object.entries(aiResult.scores).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{SCORE_LABELS[key]}</span>
                      <span className={`font-bold ${val >= 14 ? 'text-green-400' : val >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                        {val} / 20
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(val / 20) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${scoreColor(val)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 弱点タグ */}
            {aiResult.weakness_tags?.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4">
                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">改善ポイント</p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.weakness_tags.map(tag => (
                    <span key={tag} className="bg-red-950/60 text-red-400 border border-red-800 text-xs px-3 py-1 rounded-full">
                      {WEAKNESS_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 合う本 */}
            {books.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4">
                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">弱点を補う本</p>
                <div className="space-y-3">
                  {books.map(book => (
                    <div key={book.id} className="flex items-center gap-3">
                      {book.cover_url && (
                        <img src={book.cover_url} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{book.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{book.authors?.[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── ログイン前 CTA ─── */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
            className="mb-6"
          >
            <div className="rounded-2xl overflow-hidden border border-gray-700">
              {/* プレビュー（ぼかし） */}
              <div className="bg-gray-900 px-4 py-4 opacity-50 blur-sm pointer-events-none select-none">
                <p className="text-xs text-gray-500 mb-2">総合スコア</p>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold text-white">??</span>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
                <div className="space-y-2">
                  {['ターゲットの解像度','価値の訴求力','差別化の実質'].map(l => (
                    <div key={l} className="h-1.5 bg-gray-700 rounded-full" />
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gray-900 border-t border-gray-700 px-4 py-5 text-center">
                <p className="text-sm font-bold text-white mb-1">続きを見るにはログインが必要です</p>
                <p className="text-xs text-gray-500 mb-4">5軸スコア・総評・改善ポイント・おすすめの本が全部わかります</p>
                <button
                  onClick={handleLogin}
                  className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition text-sm"
                >
                  無料ログインして全部見る →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* もう一度 */}
        <div className="text-center">
          <button
            onClick={() => navigate('/plan-input')}
            className="text-xs text-gray-600 hover:text-gray-400 underline transition"
          >
            企画を変えてもう一度試す
          </button>
        </div>
      </div>
    </div>
  );
}