import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import StreetSimulation from '@/components/game/StreetSimulation';
import CustomerPieChart from '@/components/game/CustomerPieChart';

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

function scoreColor(val, max = 20) {
  const pct = val / max;
  if (pct >= 0.75) return { bar: '#22C55E', text: 'text-green-600' };
  if (pct >= 0.5)  return { bar: '#F59E0B', text: 'text-amber-500' };
  return { bar: '#EF4444', text: 'text-red-500' };
}

function ScoreRing({ score }) {
  const size = 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#F3F4F6" strokeWidth={10} />
        <motion.circle
          cx={50} cy={50} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.p
          className="text-2xl font-black leading-none"
          style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >
          {score}
        </motion.p>
        <p className="text-[10px] text-gray-400 leading-none mt-0.5">/ 100</p>
      </div>
    </div>
  );
}

export default function PlanResult() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [dbBooks, setDbBooks] = useState([]);
  const [dbCases, setDbCases] = useState([]);
  const [showSimulation, setShowSimulation] = useState(true);

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
        const parsed = JSON.parse(stored);
        await loadBooks(parsed);
        await loadCases(parsed);
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
    const allBooks = await base44.entities.Book.filter({ book_category: 'business' });
    const matched = tags.length > 0
      ? allBooks.filter(b => b.tags?.some(t => tags.includes(t)) || b.diagnosis_types?.some(t => tags.includes(t)))
      : [];
    setDbBooks((matched.length > 0 ? matched : allBooks).slice(0, 4));
  };

  const loadCases = async (result) => {
    const tags = result?.weakness_tags || [];
    const allCases = await base44.entities.CaseStudy.filter({ status: 'published' });
    const matched = tags.length > 0
      ? allCases.filter(c => c.learning_tags?.some(t => tags.includes(t)) || c.industry_tags?.some(t => tags.includes(t)))
      : [];
    setDbCases((matched.length > 0 ? matched : allCases).slice(0, 3));
  };

  const handleLogin = () => base44.auth.redirectToLogin(window.location.href);

  if (!aiResult) return null;

  const totalScore = aiResult.scores
    ? Object.values(aiResult.scores).reduce((a, b) => a + b, 0)
    : 0;

  const enterCount = Math.round((totalScore / 100) * 100);

  return (
    <>
      {/* ===== 街歩きシミュレーション ===== */}
      <AnimatePresence>
        {showSimulation && (
          <StreetSimulation
            score={totalScore}
            onComplete={() => setShowSimulation(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== 結果画面 ===== */}
      <AnimatePresence>
        {!showSimulation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="min-h-screen"
            style={{ background: 'linear-gradient(180deg, #FEF3C7 0%, #FFF 40%)' }}
          >
            <div className="max-w-lg mx-auto px-4 py-8 pb-16">

              {/* ─── ヘッダー ─── */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
              >
                <div className="inline-block bg-amber-100 rounded-full px-4 py-1 mb-3">
                  <p className="text-xs font-bold text-amber-800 tracking-widest uppercase">Result</p>
                </div>
                <h1 className="text-2xl font-black text-gray-900">市場に出してみました</h1>
                <p className="text-sm text-gray-500 mt-1">100人の想定顧客が反応しました</p>
              </motion.div>

              {/* ─── スコア＋一言 ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl border border-amber-100 shadow-md px-5 py-5 mb-4"
              >
                <div className="flex items-center gap-5">
                  <ScoreRing score={totalScore} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">☕</span>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">総合スコア</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiResult.one_line_comment || aiResult.strength_hint}</p>
                  </div>
                </div>
              </motion.div>

              {/* ─── 入店率バー ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-600">🚶 入店率（100人中）</p>
                  <p className="text-base font-black text-amber-600">{enterCount}人入店</p>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #22C55E, #86EFAC)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${enterCount}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="h-full"
                    style={{ background: '#F3F4F6' }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${100 - enterCount}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-green-600 font-semibold">入店 {enterCount}%</span>
                  <span className="text-[10px] text-gray-400">素通り {100 - enterCount}%</span>
                </div>
              </motion.div>

              {/* ─── 属性円グラフ ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <CustomerPieChart score={totalScore} customerReaction={aiResult.customer_reaction} />
              </motion.div>

              {/* ─── 強み ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 mb-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">✅</span>
                  <p className="text-xs font-bold text-green-700">強みが見つかりました</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{aiResult.strength_hint}</p>
              </motion.div>

              {/* ─── 弱点ヒント ─── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 mb-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs font-bold text-amber-700">気になるポイント</p>
                </div>
                {isLoggedIn ? (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {WEAKNESS_LABELS[aiResult.hidden_weakness_tag] || aiResult.hidden_weakness_tag}
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-5 bg-amber-200 rounded blur-sm" />
                    <p className="text-xs text-amber-600 flex-shrink-0">ログインで確認</p>
                  </div>
                )}
              </motion.div>

              {/* ─── ログイン後：詳細スコア + 総評 + 改善点 + 本 ─── */}
              {isLoggedIn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-4 mb-6"
                >
                  {/* 5軸スコア */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                    <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">5軸スコア詳細</p>
                    <div className="space-y-3">
                      {aiResult.scores && Object.entries(aiResult.scores).map(([key, val]) => {
                        const sc = scoreColor(val);
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600">{SCORE_LABELS[key]}</span>
                              <span className={`font-bold ${sc.text}`}>{val} / 20</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(val / 20) * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: sc.bar }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 総評 */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                    <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">プロの総評</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiResult.summary}</p>
                  </div>

                  {/* 改善ポイント */}
                  {aiResult.weakness_tags?.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                      <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">改善ポイント</p>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.weakness_tags.map(tag => (
                          <span key={tag} className="bg-red-50 text-red-500 border border-red-200 text-xs px-3 py-1 rounded-full">
                            {WEAKNESS_LABELS[tag] || tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DB本 */}
                  {dbBooks.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                      <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">弱点を補う本</p>
                      <div className="space-y-3">
                        {books.map(book => (
                          <div key={book.id} className="flex items-center gap-3">
                            {book.cover_url && (
                              <img src={book.cover_url} className="w-10 h-14 object-cover rounded-lg flex-shrink-0 shadow" />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{book.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{book.authors?.[0]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DB事例 */}
                  {dbCases.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                      <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-3">🏪 参考になる事例</p>
                      <div className="space-y-3">
                        {dbCases.map((c) => (
                          <Link key={c.id} to={`/CaseStudyDetail?id=${c.id}`} className="block rounded-xl p-3 border bg-green-50 border-green-200 hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">✅</span>
                              <p className="text-xs font-bold text-gray-800">{c.company_name}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">{c.title}</p>
                            {c.short_description && <p className="text-xs text-gray-500 line-clamp-2">{c.short_description}</p>}
                          </Link>
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
                  transition={{ delay: 0.8 }}
                  className="mb-6"
                >
                  <div className="rounded-2xl overflow-hidden border border-amber-200 bg-white shadow-md">
                    {/* ぼかしプレビュー */}
                    <div className="bg-gray-50 px-4 py-4 opacity-50 blur-sm pointer-events-none select-none">
                      <p className="text-xs text-gray-500 mb-2">5軸スコア詳細</p>
                      {['ターゲットの解像度','価値の訴求力','差別化の実質'].map(l => (
                        <div key={l} className="mb-2">
                          <div className="h-2 bg-gray-200 rounded-full mb-1" />
                          <div className="h-2 bg-gray-200 rounded-full w-3/4" />
                        </div>
                      ))}
                    </div>
                    {/* CTA */}
                    <div className="border-t border-amber-100 px-4 py-5 text-center">
                      <p className="text-sm font-bold text-gray-900 mb-1">続きを見るにはログインが必要です</p>
                      <p className="text-xs text-gray-500 mb-4">5軸スコア・プロの総評・改善ポイント・おすすめ本が全部わかります</p>
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ y: 1 }}
                        onClick={handleLogin}
                        className="w-full py-3 rounded-xl text-sm font-black text-gray-900 transition"
                        style={{
                          background: 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)',
                          boxShadow: '0 4px 0 #A16207',
                        }}
                      >
                        無料ログインして全部見る →
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* もう一度 */}
              <div className="text-center">
                <button
                  onClick={() => navigate('/plan-input')}
                  className="text-xs text-gray-400 hover:text-amber-600 underline transition"
                >
                  企画を変えてもう一度試す
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}