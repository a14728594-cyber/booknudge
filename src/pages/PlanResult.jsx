import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import CustomerStreet from '@/components/game/CustomerStreet';

const SCORE_LABELS = {
  target_clarity:      'ターゲットの明確さ',
  value_clarity:       '価値の伝わりやすさ',
  price_reasonability: '価格の納得感',
  differentiation:     '差別化',
  action_strength:     '行動したくなる強さ',
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

export default function PlanResult() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [books, setBooks] = useState([]);

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

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  if (!aiResult) return null;

  const totalScore = aiResult.scores
    ? Object.values(aiResult.scores).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* ヘッダー */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs text-gray-400 mb-1">🏪 カフェ編 › マーケティング</p>
          <h1 className="text-2xl font-bold text-gray-900">AI客の反応が出ました</h1>
        </motion.div>

        {/* 客アニメーション */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
          <CustomerStreet
            customerReaction={aiResult.customer_reaction}
            isTeaser={!isLoggedIn}
          />
        </motion.div>

        {/* 強みヒント（常に見せる） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4"
        >
          <p className="text-xs font-bold text-green-600 mb-1">✅ 強みが見つかりました</p>
          <p className="text-sm text-gray-800">{aiResult.strength_hint}</p>
        </motion.div>

        {/* 弱点ヒント（隠す） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6"
        >
          <p className="text-xs font-bold text-amber-600 mb-1">⚠️ 気になるポイントが1つあります</p>
          {isLoggedIn ? (
            <p className="text-sm text-gray-800">{WEAKNESS_LABELS[aiResult.hidden_weakness_tag] || aiResult.hidden_weakness_tag}</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-5 bg-amber-100 rounded blur-sm" />
              <p className="text-xs text-amber-500">ログインで確認</p>
            </div>
          )}
        </motion.div>

        {/* ログイン後のみ：詳細結果 */}
        {isLoggedIn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>

            {/* 総評 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-gray-500 mb-1">📝 一言総評</p>
              <p className="text-sm text-gray-800">{aiResult.summary}</p>
            </div>

            {/* スコア */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500">📊 5軸スコア</p>
                <p className="text-2xl font-bold text-gray-900">{totalScore}<span className="text-sm text-gray-400">/100</span></p>
              </div>
              <div className="space-y-2">
                {aiResult.scores && Object.entries(aiResult.scores).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                      <span>{SCORE_LABELS[key]}</span>
                      <span>{val}/20</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(val / 20) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full bg-indigo-400 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 弱点タグ */}
            {aiResult.weakness_tags?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 mb-2">🔍 弱点タグ</p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.weakness_tags.map(tag => (
                    <span key={tag} className="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full border border-red-200">
                      {WEAKNESS_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 合う本 */}
            {books.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 mb-2">📚 あなたの弱点に合う本</p>
                <div className="space-y-2">
                  {books.map(book => (
                    <div key={book.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      {book.cover_url && <img src={book.cover_url} className="w-10 h-14 object-cover rounded" />}
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{book.title}</p>
                        <p className="text-xs text-gray-400">{book.authors?.[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* ログイン前CTA */}
        {!isLoggedIn && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <div className="bg-gray-900 rounded-2xl p-6 text-center text-white">
              <p className="text-lg font-bold mb-1">続きを見る</p>
              <p className="text-sm text-gray-400 mb-4">5軸スコア・弱点の詳細・合う本が全部わかります</p>
              <button
                onClick={handleLogin}
                className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition"
              >
                ログインして全部見る →
              </button>
            </div>
          </motion.div>
        )}

        {/* もう一度やる */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/plan-input')}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            企画を変えてもう一度試す
          </button>
        </div>
      </div>
    </div>
  );
}