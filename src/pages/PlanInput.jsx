import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import CafeStreetBg from '@/components/game/CafeStreetBg';

const STAGE_META = {
  cafe:    { emoji: '☕', label: 'カフェ編',   world: '住宅街の小さなカフェ' },
  apparel: { emoji: '👗', label: 'アパレル編', world: '商店街のセレクトショップ' },
  cosme:   { emoji: '💄', label: 'コスメ編',   world: 'ECで勝負するD2Cブランド' },
};

const GENRE_META = {
  marketing:       { label: 'マーケティング', question: '誰に・どう売るか？', icon: '🎯' },
  branding:        { label: 'ブランディング', question: 'どう記憶されるか？', icon: '✨' },
  differentiation: { label: '差別化',         question: '他と何が違うか？',   icon: '⚡' },
};

const FIELDS = [
  { key: 'target',       tag: 'TARGET',  label: '誰に売るか',            sublabel: 'ターゲット顧客',    placeholder: '例：子育て中の30代女性、平日昼に近くで働く会社員 …',  tip: '具体的な人物像を想像してください' },
  { key: 'product',      tag: 'PRODUCT', label: '何を売るか',            sublabel: '商品・メニュー',    placeholder: '例：無添加素材のヘルシードーナツ、季節限定の抹茶ラテ …', tip: '何が提供されるかを具体的に' },
  { key: 'price',        tag: 'PRICE',   label: 'いくらで',              sublabel: '価格設定',          placeholder: '例：単品280円、ドリンクセット580円 …',                  tip: 'ターゲットが納得できる価格か？' },
  { key: 'promotion',    tag: 'REACH',   label: 'どう知ってもらうか',    sublabel: '告知・プロモーション', placeholder: '例：インスタ投稿、地域チラシ、近隣店舗との連携 …',     tip: '実際に届く手段を考えてください' },
  { key: 'unique_value', tag: 'VALUE',   label: 'なぜここでなければならないか', sublabel: '独自の価値', placeholder: '例：地元農家と直接契約、オーナーが毎朝手焼き …',       tip: 'これが最も辛口に評価されます' },
];

const LOADING_MESSAGES = [
  '想定顧客が街を歩いています…',
  '市場反応を分析中…',
  'プロの審査員が採点中…',
  'もうすぐ結果が出ます…',
];

const TAG_COLORS = {
  TARGET:  { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
  PRODUCT: { bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4' },
  PRICE:   { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  REACH:   { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  VALUE:   { bg: '#EDE9FE', text: '#4C1D95', border: '#A78BFA' },
};

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
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 50%, #FEF3C7 100%)' }}>

      {/* 街並み背景 */}
      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
        <CafeStreetBg />
      </div>

      {/* ローディングオーバーレイ */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(255,243,210,0.95)', backdropFilter: 'blur(6px)' }}
          >
            <div className="text-5xl mb-4 animate-bounce">🏪</div>
            <div className="flex gap-3 mb-5">
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
            <div className="w-48 h-2 bg-amber-100 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-amber-400 rounded-full"
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 6, ease: 'linear' }}
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMsg}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-sm font-medium text-amber-800"
              >
                {LOADING_MESSAGES[loadingMsg]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* メインコンテンツ */}
      <div className="relative z-10 max-w-lg mx-auto px-4 pb-12" style={{ marginTop: -24 }}>

        {/* 企画シートカード（メインパネル） */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-100 overflow-hidden">

          {/* ヘッダー */}
          <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', borderBottom: '2px solid #FCD34D' }}>
            <div className="flex items-center justify-between mb-3">
              {/* ステージバッジ */}
              <div className="flex items-center gap-2 bg-white/70 rounded-full px-3 py-1.5 border border-amber-200">
                <span className="text-lg">{stageMeta.emoji}</span>
                <div>
                  <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-none">Stage</p>
                  <p className="text-xs font-bold text-amber-900 leading-tight">{stageMeta.label}</p>
                </div>
              </div>
              {/* ジャンルバッジ */}
              <div className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1.5 border border-amber-200">
                <span className="text-sm">{genreMeta.icon}</span>
                <span className="text-xs font-semibold text-amber-900">{genreMeta.question}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-amber-800 tracking-widest uppercase">Mission</span>
                <div className="flex-1 h-px bg-amber-300" />
              </div>
              <h1 className="text-base font-black text-amber-950">企画シートを完成させ、市場に出してください</h1>
              <p className="text-xs text-amber-700 mt-0.5">5つの項目を埋めると、想定顧客の反応と辛口な評価が返ってきます</p>
            </div>
          </div>

          {/* 進捗バー */}
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex gap-1">
                {FIELDS.map((f, i) => (
                  <div
                    key={f.key}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: answers[f.key].trim() ? 20 : 8,
                      height: 8,
                      background: answers[f.key].trim() ? '#F59E0B' : '#E5E7EB',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-amber-700">{filledCount}/{FIELDS.length} 完了</p>
            </div>
          </div>

          {/* フォーム本体 */}
          <div className="px-5 py-4 space-y-3">
            {FIELDS.map((f, i) => {
              const filled = answers[f.key].trim().length > 0;
              const isActive = activeField === f.key;
              const tagColor = TAG_COLORS[f.tag];
              return (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="rounded-2xl border-2 transition-all overflow-hidden"
                  style={{
                    borderColor: isActive ? '#F59E0B' : filled ? '#6EE7B7' : '#E5E7EB',
                    background: isActive ? '#FFFBEB' : filled ? '#F0FDF4' : '#FAFAFA',
                  }}
                >
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border"
                        style={{ background: tagColor.bg, color: tagColor.text, borderColor: tagColor.border }}
                      >
                        {f.tag}
                      </span>
                      <p className="text-sm font-bold text-gray-800">{f.label}</p>
                    </div>
                    {filled && !isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center"
                      >
                        <span className="text-white text-[10px] font-black">✓</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="px-4 pb-3">
                    <textarea
                      className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none mt-1 leading-relaxed"
                      rows={isActive ? 3 : 2}
                      placeholder={f.placeholder}
                      value={answers[f.key]}
                      onFocus={() => setActiveField(f.key)}
                      onBlur={() => setActiveField(null)}
                      onChange={e => setAnswers(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 mt-1"
                      >
                        <span className="text-xs">💡</span>
                        <p className="text-xs text-amber-600 font-medium">{f.tip}</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 送信ボタンエリア */}
          <div className="px-5 pb-5">
            <motion.button
              whileHover={isAllFilled ? { y: -2 } : {}}
              whileTap={isAllFilled ? { y: 2 } : {}}
              onClick={handleSubmit}
              disabled={!isAllFilled || loading}
              className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all relative overflow-hidden"
              style={isAllFilled ? {
                background: 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)',
                boxShadow: '0 6px 0 #A16207, 0 8px 20px rgba(0,0,0,0.2)',
                color: '#422006',
              } : {
                background: '#E5E7EB',
                color: '#9CA3AF',
                cursor: 'not-allowed',
                boxShadow: 'none',
              }}
            >
              {isAllFilled ? '🏪　市場に出す　→' : `あと ${FIELDS.length - filledCount} 項目を入力してください`}
            </motion.button>

            <button
              onClick={() => navigate('/game')}
              className="w-full text-center text-xs text-gray-400 hover:text-amber-600 mt-3 transition"
            >
              ← ステージ選択に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}