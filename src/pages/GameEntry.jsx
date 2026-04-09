import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  {
    id: 'cafe',
    emoji: '☕',
    label: 'カフェ編',
    world: '住宅街の小さなカフェ',
    desc: '新メニューを企画し、地域の客を呼び込む',
    bg: 'from-amber-900 to-amber-700',
    accent: 'border-amber-400',
    textAccent: 'text-amber-300',
    available: true,
  },
  {
    id: 'apparel',
    emoji: '👗',
    label: 'アパレル編',
    world: '商店街のセレクトショップ',
    desc: '自分たちのブランドで差別化を図る',
    bg: 'from-slate-800 to-slate-600',
    accent: 'border-slate-400',
    textAccent: 'text-slate-300',
    available: false,
  },
  {
    id: 'cosme',
    emoji: '💄',
    label: 'コスメ編',
    world: 'ECで勝負するD2Cブランド',
    desc: '価値を言語化し、ファンを作る',
    bg: 'from-rose-900 to-pink-700',
    accent: 'border-rose-400',
    textAccent: 'text-rose-300',
    available: false,
  },
];

const GENRES = [
  {
    id: 'marketing',
    label: 'マーケティング',
    question: '誰に・どう売るか？',
    desc: 'ターゲットと伝え方を設計する',
    icon: '🎯',
    available: true,
  },
  {
    id: 'branding',
    label: 'ブランディング',
    question: 'どう記憶されるか？',
    desc: '世界観と価値を言語化する',
    icon: '✨',
    available: false,
  },
  {
    id: 'differentiation',
    label: '差別化',
    question: '他と何が違うか？',
    desc: '競合との違いを明確にする',
    icon: '⚡',
    available: false,
  },
];

export default function GameEntry() {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState('cafe');
  const [selectedGenre, setSelectedGenre] = useState('marketing');
  const [step, setStep] = useState(1); // 1=stage, 2=genre

  const activeStage = STAGES.find(s => s.id === selectedStage);

  const handleStageSelect = (id) => {
    if (!STAGES.find(s => s.id === id)?.available) return;
    setSelectedStage(id);
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      localStorage.setItem('game_stage', selectedStage);
      localStorage.setItem('game_genre', selectedGenre);
      navigate('/plan-input');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* 背景グロー */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-xl w-full relative z-10">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Business Simulation</p>
          <h1 className="text-3xl font-bold text-white mb-2">ビジネス企画シミュレーター</h1>
          <p className="text-sm text-gray-400">あなたの企画を市場に出し、リアルな反応を確かめる</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="stage"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">
                STEP 1 — どの世界に入る？
              </p>
              <div className="space-y-3 mb-8">
                {STAGES.map((s) => (
                  <motion.button
                    key={s.id}
                    whileTap={s.available ? { scale: 0.98 } : {}}
                    onClick={() => handleStageSelect(s.id)}
                    disabled={!s.available}
                    className={`w-full text-left rounded-2xl border-2 transition-all overflow-hidden ${
                      !s.available
                        ? 'border-gray-800 opacity-40 cursor-not-allowed'
                        : selectedStage === s.id
                        ? `${s.accent} bg-gradient-to-r ${s.bg} shadow-lg shadow-black/40`
                        : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <div className="px-5 py-4 flex items-center gap-4">
                      <span className="text-3xl">{s.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{s.label}</p>
                          {!s.available && <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">準備中</span>}
                        </div>
                        <p className={`text-xs mt-0.5 ${selectedStage === s.id && s.available ? s.textAccent : 'text-gray-400'}`}>{s.world}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      </div>
                      {selectedStage === s.id && s.available && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="genre"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => setStep(1)}
                className="text-xs text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1 transition"
              >
                ← 舞台を変える
              </button>

              {/* 選んだ舞台の確認 */}
              <div className={`bg-gradient-to-r ${activeStage?.bg} rounded-xl px-4 py-3 mb-6 flex items-center gap-3 border ${activeStage?.accent}`}>
                <span className="text-2xl">{activeStage?.emoji}</span>
                <div>
                  <p className="text-xs text-white/60">選択中の舞台</p>
                  <p className="font-bold text-sm">{activeStage?.label} — {activeStage?.world}</p>
                </div>
              </div>

              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">
                STEP 2 — 何を試す？
              </p>
              <div className="space-y-3 mb-8">
                {GENRES.map((g) => (
                  <motion.button
                    key={g.id}
                    whileTap={g.available ? { scale: 0.98 } : {}}
                    onClick={() => g.available && setSelectedGenre(g.id)}
                    disabled={!g.available}
                    className={`w-full text-left rounded-2xl border-2 transition-all px-5 py-4 ${
                      !g.available
                        ? 'border-gray-800 opacity-40 cursor-not-allowed bg-gray-900'
                        : selectedGenre === g.id
                        ? 'border-indigo-500 bg-indigo-950 shadow-lg shadow-indigo-900/30'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{g.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{g.label}</p>
                          {!g.available && <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">準備中</span>}
                        </div>
                        <p className={`text-xs font-medium mt-0.5 ${selectedGenre === g.id && g.available ? 'text-indigo-400' : 'text-gray-400'}`}>{g.question}</p>
                        <p className="text-xs text-gray-500">{g.desc}</p>
                      </div>
                      {selectedGenre === g.id && g.available && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0"
                        >
                          <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 進むボタン */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="w-full py-4 bg-white text-gray-900 text-base font-bold rounded-2xl shadow-xl hover:bg-gray-100 transition"
        >
          {step === 1 ? 'このステージで企画する →' : '企画を考える →'}
        </motion.button>

        <p className="text-xs text-gray-600 text-center mt-3">ログイン不要で体験できます</p>

        {/* プログレス */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className={`h-1 w-8 rounded-full transition-all ${step >= 1 ? 'bg-white' : 'bg-gray-700'}`} />
          <div className={`h-1 w-8 rounded-full transition-all ${step >= 2 ? 'bg-white' : 'bg-gray-700'}`} />
          <div className="h-1 w-8 rounded-full bg-gray-700" />
        </div>
      </div>
    </div>
  );
}