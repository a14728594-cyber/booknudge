import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const STAGE_META = {
  cafe:    { emoji: '☕', label: 'カフェ編', world: '住宅街の小さなカフェ', bg: 'from-amber-900 to-amber-700', accent: 'border-amber-500', badge: 'bg-amber-900/60 text-amber-300 border-amber-700' },
  apparel: { emoji: '👗', label: 'アパレル編', world: '商店街のセレクトショップ', bg: 'from-slate-800 to-slate-600', accent: 'border-slate-400', badge: 'bg-slate-800 text-slate-300 border-slate-600' },
  cosme:   { emoji: '💄', label: 'コスメ編', world: 'ECで勝負するD2Cブランド', bg: 'from-rose-900 to-pink-700', accent: 'border-rose-400', badge: 'bg-rose-900/60 text-rose-300 border-rose-700' },
};

const GENRE_META = {
  marketing:       { label: 'マーケティング', question: '誰に・どう売るか？', icon: '🎯' },
  branding:        { label: 'ブランディング', question: 'どう記憶されるか？', icon: '✨' },
  differentiation: { label: '差別化', question: '他と何が違うか？', icon: '⚡' },
};

const FIELDS = [
  {
    key: 'target',
    tag: 'TARGET',
    label: '誰に売るか',
    sublabel: 'ターゲット顧客',
    placeholder: '例：子育て中の30代女性、平日昼に近くで働く会社員 …',
    tip: '具体的な人物像を想像してください',
  },
  {
    key: 'product',
    tag: 'PRODUCT',
    label: '何を売るか',
    sublabel: '商品・メニュー',
    placeholder: '例：無添加素材のヘルシードーナツ、季節限定の抹茶ラテ …',
    tip: '何が提供されるかを具体的に',
  },
  {
    key: 'price',
    tag: 'PRICE',
    label: 'いくらで',
    sublabel: '価格設定',
    placeholder: '例：単品280円、ドリンクセット580円 …',
    tip: 'ターゲットが納得できる価格か？',
  },
  {
    key: 'promotion',
    tag: 'REACH',
    label: 'どう知ってもらうか',
    sublabel: '告知・プロモーション',
    placeholder: '例：インスタ投稿、地域チラシ、近隣店舗との連携 …',
    tip: '実際に届く手段を考えてください',
  },
  {
    key: 'unique_value',
    tag: 'VALUE',
    label: 'なぜここでなければならないか',
    sublabel: '独自の価値',
    placeholder: '例：地元農家と直接契約、オーナーが毎朝手焼き …',
    tip: 'これが最も辛口に評価されます',
  },
];

const LOADING_MESSAGES = [
  '想定顧客が街を歩いています…',
  '市場反応を分析中…',
  'プロの審査員が採点中…',
  'もうすぐ結果が出ます…',
];

export default function PlanInput() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({ target: '', product: '', price: '', promotion: '', unique_value: '' });
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [activeField, setActiveField] = useState(null);

  const stage = localStorage.getItem('game_stage') || 'cafe';
  const genre = localStorage.getItem('game_genre') || 'marketing';
  const stageMeta = STAGE_META[stage] || STAGE_META.cafe;
  const genreMeta = GENRE_META[genre] || GENRE_META.marketing;

  const filledCount = Object.values(answers).filter(v => v.trim().length > 0).length;
  const isAllFilled = filledCount === FIELDS.length;

  const handleSubmit = async () => {
    if (!isAllFilled) return;
    setLoading(true);
    localStorage.setItem('game_plan', JSON.stringify(answers));

    // ローディングメッセージをローテーション
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(msgIdx);
    }, 2000);

    try {
      const res = await base44.functions.invoke('analyzePlan', { stage, genre, plan: answers });
      const aiResult = res.data?.result;
      localStorage.setItem('game_ai_result', JSON.stringify(aiResult));
      navigate('/plan-result');
    } catch (e) {
      console.error(e);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ローディングオーバーレイ */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/95 z-50 flex flex-col items-center justify-center"
          >
            <div className="text-5xl mb-6 animate-bounce">🏪</div>
            <div className="flex gap-2 mb-4">
              {['👩','👨','🧑','👵','🧔'].map((e, i) => (
                <motion.span
                  key={i}
                  className="text-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
                >
                  {e}
                </motion.span>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMsg}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-sm text-gray-400"
              >
                {LOADING_MESSAGES[loadingMsg]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* 舞台バナー */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${stageMeta.bg} rounded-2xl p-4 mb-6 border ${stageMeta.accent}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{stageMeta.emoji}</span>
              <div>
                <p className="text-xs text-white/50 tracking-widest uppercase">Stage</p>
                <p className="font-bold">{stageMeta.label} — {stageMeta.world}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 ${stageMeta.badge}`}>
              <span className="text-sm">{genreMeta.icon}</span>
              <span className="text-xs font-semibold">{genreMeta.question}</span>
            </div>
          </div>
        </motion.div>

        {/* ミッション */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <p className="text-xs text-gray-500 tracking-widest uppercase mb-1">Mission</p>
          <h1 className="text-xl font-bold text-white leading-snug">あなたの企画を市場に出してください</h1>
          <p className="text-sm text-gray-400 mt-1">5つの項目を埋めると、想定顧客の反応と辛口な評価が返ってきます</p>
        </motion.div>

        {/* 企画シート */}
        <div className="space-y-3 mb-6">
          {FIELDS.map((f, i) => {
            const filled = answers[f.key].trim().length > 0;
            const isActive = activeField === f.key;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className={`rounded-2xl border transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-950/60'
                    : filled
                    ? 'border-green-800 bg-gray-900'
                    : 'border-gray-700 bg-gray-900'
                }`}
              >
                <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${
                      isActive ? 'bg-indigo-600 text-white' : filled ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500'
                    }`}>{f.tag}</span>
                    <p className={`text-sm font-semibold ${filled || isActive ? 'text-white' : 'text-gray-400'}`}>{f.label}</p>
                  </div>
                  {filled && !isActive && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-400 text-sm">✓</motion.span>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <textarea
                    className="w-full bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none resize-none mt-1"
                    rows={isActive ? 3 : 2}
                    placeholder={f.placeholder}
                    value={answers[f.key]}
                    onFocus={() => setActiveField(f.key)}
                    onBlur={() => setActiveField(null)}
                    onChange={e => setAnswers(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-indigo-400 mt-1"
                    >
                      💡 {f.tip}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 進捗バー */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{filledCount} / {FIELDS.length} 項目入力済み</p>
            {isAllFilled && <p className="text-xs text-green-400 font-semibold">準備完了</p>}
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              animate={{ width: `${(filledCount / FIELDS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* 送信ボタン */}
        <motion.button
          whileHover={isAllFilled ? { scale: 1.02 } : {}}
          whileTap={isAllFilled ? { scale: 0.97 } : {}}
          onClick={handleSubmit}
          disabled={!isAllFilled || loading}
          className={`w-full py-4 rounded-2xl text-base font-bold transition ${
            isAllFilled
              ? 'bg-white text-gray-900 shadow-xl hover:bg-gray-100'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isAllFilled ? '市場に出す →' : '全項目を入力してください'}
        </motion.button>

        <button
          onClick={() => navigate('/game')}
          className="w-full text-center text-xs text-gray-600 hover:text-gray-400 mt-4 transition"
        >
          ← 舞台選択に戻る
        </button>
      </div>
    </div>
  );
}