import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, ShoppingBag, Sparkles } from 'lucide-react';

const STAGES = [
  { id: 'cafe', label: 'カフェ編', icon: Coffee, color: 'bg-amber-50 border-amber-200 text-amber-700', available: true },
  { id: 'apparel', label: 'アパレル編', icon: ShoppingBag, color: 'bg-blue-50 border-blue-200 text-blue-400', available: false },
  { id: 'cosme', label: 'コスメ編', icon: Sparkles, color: 'bg-pink-50 border-pink-200 text-pink-400', available: false },
];

const GENRES = [
  { id: 'marketing', label: 'マーケティング', desc: '誰に・どう売るか', available: true },
  { id: 'branding', label: 'ブランディング', desc: '世界観・価値の伝え方', available: false },
  { id: 'idea', label: 'アイデア', desc: '新商品・企画の発想', available: false },
];

export default function GameEntry() {
  const navigate = useNavigate();

  const handleStart = () => {
    // カフェ×マーケティングで固定（PoC）
    localStorage.setItem('game_stage', 'cafe');
    localStorage.setItem('game_genre', 'marketing');
    navigate('/plan-input');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full text-center"
      >
        {/* タイトル */}
        <div className="mb-8">
          <div className="text-5xl mb-4">🏪</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ビジネス企画シミュレーター</h1>
          <p className="text-gray-500 text-sm">あなたの企画を入力すると、AI客が本気で反応します</p>
        </div>

        {/* 舞台選択 */}
        <div className="mb-6 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">STEP 1 — 舞台を選ぶ</p>
          <div className="grid grid-cols-3 gap-3">
            {STAGES.map((s) => (
              <div
                key={s.id}
                className={`border-2 rounded-xl p-4 text-center transition-all ${s.available
                  ? `${s.color} cursor-pointer ring-2 ring-amber-400`
                  : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                <s.icon className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm font-semibold">{s.label}</p>
                {!s.available && <p className="text-xs mt-1">準備中</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ジャンル選択 */}
        <div className="mb-8 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">STEP 2 — ジャンルを選ぶ</p>
          <div className="space-y-2">
            {GENRES.map((g) => (
              <div
                key={g.id}
                className={`border-2 rounded-xl px-4 py-3 flex items-center justify-between transition-all ${g.available
                  ? 'bg-white border-indigo-300 ring-2 ring-indigo-400 cursor-pointer'
                  : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                <div>
                  <p className={`font-semibold text-sm ${g.available ? 'text-gray-900' : 'text-gray-300'}`}>{g.label}</p>
                  <p className={`text-xs ${g.available ? 'text-gray-400' : 'text-gray-200'}`}>{g.desc}</p>
                </div>
                {g.available && <span className="text-indigo-500 text-xs font-bold">選択中 ✓</span>}
                {!g.available && <span className="text-xs text-gray-300">準備中</span>}
              </div>
            ))}
          </div>
        </div>

        {/* スタートボタン */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          className="w-full py-4 bg-gray-900 text-white text-lg font-bold rounded-2xl shadow-lg hover:bg-gray-800 transition"
        >
          企画を考える →
        </motion.button>
        <p className="text-xs text-gray-400 mt-3">ログイン不要で体験できます</p>
      </motion.div>
    </div>
  );
}