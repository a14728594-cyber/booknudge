import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';

// 雲コンポーネント
function Cloud({ x, y, scale, duration, delay }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%`, scale }}
      animate={{ x: [0, 30, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="relative">
        <div className="absolute w-16 h-8 bg-white/80 rounded-full" style={{ top: 8, left: 8 }} />
        <div className="absolute w-10 h-10 bg-white/80 rounded-full" style={{ top: 0, left: 16 }} />
        <div className="absolute w-12 h-8 bg-white/80 rounded-full" style={{ top: 6, left: 24 }} />
        <div className="w-36 h-10 bg-white/70 rounded-full mt-4" />
      </div>
    </motion.div>
  );
}

// アイソメトリック建物
function Building({ stage, selected, locked, onClick }) {
  const configs = {
    cafe: {
      wallColor: '#D97706',
      roofColor: '#B45309',
      windowColor: '#FEF3C7',
      doorColor: '#92400E',
      roofTrim: '#F59E0B',
      label: 'カフェ',
      emoji: '☕',
      accentColor: '#FBBF24',
    },
    apparel: {
      wallColor: '#6366F1',
      roofColor: '#4F46E5',
      windowColor: '#EDE9FE',
      doorColor: '#3730A3',
      roofTrim: '#818CF8',
      label: 'アパレル',
      emoji: '👗',
      accentColor: '#A5B4FC',
    },
    cosme: {
      wallColor: '#EC4899',
      roofColor: '#DB2777',
      windowColor: '#FCE7F3',
      doorColor: '#9D174D',
      roofTrim: '#F472B6',
      label: 'コスメ',
      emoji: '💄',
      accentColor: '#F9A8D4',
    },
  };

  const c = configs[stage.id] || configs.cafe;

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer"
      onClick={onClick}
      whileHover={!locked ? { y: -6 } : {}}
      animate={selected ? { y: -14 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* 建物本体 */}
      <div className="relative" style={{ width: 90, height: 100 }}>

        {/* 屋根（等辺台形） */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '45px solid transparent',
            borderRight: '45px solid transparent',
            borderBottom: `36px solid ${locked ? '#6B7280' : c.roofColor}`,
          }}
        />
        {/* 屋根前面 */}
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 90,
            height: 10,
            background: locked ? '#9CA3AF' : c.roofTrim,
            borderRadius: 2,
          }}
        />

        {/* 壁 */}
        <div
          style={{
            position: 'absolute',
            top: 34,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 60,
            background: locked ? '#9CA3AF' : c.wallColor,
            borderRadius: '4px 4px 0 0',
          }}
        >
          {/* 窓2つ */}
          {!locked && (
            <>
              <div style={{ position: 'absolute', top: 10, left: 8, width: 18, height: 18, background: c.windowColor, borderRadius: 2, border: `2px solid ${c.roofColor}` }} />
              <div style={{ position: 'absolute', top: 10, right: 8, width: 18, height: 18, background: c.windowColor, borderRadius: 2, border: `2px solid ${c.roofColor}` }} />
              {/* ドア */}
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 28, background: c.doorColor, borderRadius: '3px 3px 0 0' }} />
            </>
          )}
          {/* 鍵アイコン */}
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
          )}
        </div>

        {/* アイソメ影（右側面） */}
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: -12,
            width: 14,
            height: 60,
            background: locked ? '#6B7280' : c.roofColor,
            transform: 'skewY(45deg)',
            transformOrigin: 'top left',
            opacity: 0.8,
            borderRadius: '0 2px 2px 0',
          }}
        />

        {/* 選択中のグロー */}
        {selected && !locked && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ background: c.accentColor, opacity: 0.25, filter: 'blur(8px)', transform: 'scale(1.2)' }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* 地面シャドウ */}
      <div style={{
        width: 70,
        height: 12,
        background: locked ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)',
        borderRadius: '50%',
        filter: 'blur(4px)',
        marginTop: -4,
      }} />

      {/* ラベル */}
      <div className="mt-2 text-center">
        <span className="text-sm">{stage.emoji}</span>
        <p className={`text-xs font-bold mt-0.5 ${locked ? 'text-gray-500' : selected ? 'text-white' : 'text-gray-300'}`}>
          {stage.label}
        </p>
        {locked && <p className="text-[10px] text-gray-600">準備中</p>}
        {selected && !locked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 mx-auto"
          />
        )}
      </div>
    </motion.div>
  );
}

const STAGES = [
  { id: 'cafe',    emoji: '☕', label: 'カフェ編',   world: '住宅街の小さなカフェ',     desc: '新メニューを企画し、地域の客を呼び込む', available: true },
  { id: 'apparel', emoji: '👗', label: 'アパレル編', world: '商店街のセレクトショップ',  desc: '自分たちのブランドで差別化を図る',       available: false },
  { id: 'cosme',   emoji: '💄', label: 'コスメ編',   world: 'ECで勝負するD2Cブランド', desc: '価値を言語化し、ファンを作る',           available: false },
];

const GENRES = [
  { id: 'marketing',       icon: '🎯', label: 'マーケティング', question: '誰に・どう売るか？',  desc: 'ターゲットと伝え方を設計する', available: true },
  { id: 'branding',        icon: '✨', label: 'ブランディング', question: 'どう記憶されるか？',  desc: '世界観と価値を言語化する',     available: false },
  { id: 'differentiation', icon: '⚡', label: '差別化',         question: '他と何が違うか？',   desc: '競合との違いを明確にする',     available: false },
];

export default function GameEntry() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState('cafe');
  const [selectedGenre, setSelectedGenre] = useState('marketing');
  const [step, setStep] = useState(1);

  const activeStage = STAGES.find(s => s.id === selectedStage);

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
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 40%, #86EFAC 70%, #4ADE80 100%)' }}
    >
      {/* 雲 */}
      <Cloud x={-5} y={5}  scale={0.9} duration={18} delay={0} />
      <Cloud x={55} y={3}  scale={0.7} duration={22} delay={4} />
      <Cloud x={70} y={12} scale={1.1} duration={26} delay={8} />
      <Cloud x={20} y={8}  scale={0.6} duration={20} delay={2} />

      {/* 太陽 */}
      <div className="absolute top-6 right-8 w-14 h-14 rounded-full bg-yellow-300 shadow-lg shadow-yellow-200/60"
        style={{ boxShadow: '0 0 30px 10px rgba(253,224,71,0.5)' }}
      />

      <div className="max-w-md w-full relative z-10">
        {/* ハンバーガーメニュー */}
        <div className="flex justify-end mb-2">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-white hover:bg-white/30 transition"
            >
              <div className="space-y-1">
                <div className="w-5 h-0.5 bg-white rounded-full" />
                <div className="w-5 h-0.5 bg-white rounded-full" />
                <div className="w-5 h-0.5 bg-white rounded-full" />
              </div>
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-[160px] z-50"
              >
                <Link to={createPageUrl('home')} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition">
                  🏠 ホームへ戻る
                </Link>
                <Link to={createPageUrl('CaseStudies')} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition">
                  🏗️ 事例一覧
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* タイトル */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-block bg-white/30 backdrop-blur-sm border border-white/50 rounded-full px-4 py-1 mb-3">
            <p className="text-xs font-bold text-sky-800 tracking-widest uppercase">Business Simulation</p>
          </div>
          <h1 className="text-2xl font-black text-white drop-shadow-lg">ビジネス企画シミュレーター</h1>
          <p className="text-sm text-white/80 mt-1 drop-shadow">あなたの企画を市場に出してみよう</p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* STEP 1: 舞台選択 */}
          {step === 1 && (
            <motion.div
              key="stage"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              {/* ステップ表示 */}
              <div className="text-center mb-4">
                <span className="inline-block bg-white/40 backdrop-blur-sm text-sky-900 text-xs font-bold px-3 py-1 rounded-full">
                  STEP 1 — どのステージに入る？
                </span>
              </div>

              {/* 地面＋建物マップ */}
              <div className="relative bg-green-400/40 backdrop-blur-sm rounded-3xl border-2 border-white/40 p-6 mb-5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(134,239,172,0.6) 0%, rgba(74,222,128,0.5) 100%)' }}
              >
                {/* 地面タイル風グリッド */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, #166534 0, #166534 1px, transparent 0, transparent 50%), repeating-linear-gradient(90deg, #166534 0, #166534 1px, transparent 0, transparent 50%)',
                  backgroundSize: '40px 40px',
                }} />

                {/* 道路 */}
                <div className="absolute bottom-16 left-0 right-0 h-6 bg-gray-600/30" />
                <div className="absolute bottom-16 left-0 right-0 h-0.5 bg-yellow-400/50" style={{ top: '65%' }} />

                {/* 建物グリッド */}
                <div className="relative z-10 flex items-end justify-around px-2 pt-4 pb-2">
                  {STAGES.map((s) => (
                    <Building
                      key={s.id}
                      stage={s}
                      selected={selectedStage === s.id}
                      locked={!s.available}
                      onClick={() => s.available && setSelectedStage(s.id)}
                    />
                  ))}
                </div>

                {/* 選択中の舞台情報 */}
                <AnimatePresence mode="wait">
                  {activeStage && (
                    <motion.div
                      key={selectedStage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="relative z-10 mt-3 bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/60"
                    >
                      <p className="text-xs font-bold text-green-900">{activeStage.world}</p>
                      <p className="text-[11px] text-green-700 mt-0.5">{activeStage.desc}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 2: ジャンル選択 */}
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
                className="text-xs text-white/70 hover:text-white mb-3 flex items-center gap-1 transition"
              >
                ← ステージを変える
              </button>

              {/* 選んだ舞台バッジ */}
              <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                <span className="text-2xl">{activeStage?.emoji}</span>
                <div>
                  <p className="text-[10px] text-sky-900 font-bold uppercase tracking-widest">選択中のステージ</p>
                  <p className="text-sm font-bold text-sky-950">{activeStage?.label} — {activeStage?.world}</p>
                </div>
              </div>

              <div className="text-center mb-4">
                <span className="inline-block bg-white/40 backdrop-blur-sm text-sky-900 text-xs font-bold px-3 py-1 rounded-full">
                  STEP 2 — 何を試す？
                </span>
              </div>

              <div className="space-y-2 mb-5">
                {GENRES.map((g) => (
                  <motion.button
                    key={g.id}
                    whileTap={g.available ? { scale: 0.97 } : {}}
                    onClick={() => g.available && setSelectedGenre(g.id)}
                    disabled={!g.available}
                    className={`w-full text-left rounded-2xl border-2 transition-all px-4 py-3 backdrop-blur-sm ${
                      !g.available
                        ? 'border-white/20 bg-white/10 opacity-50 cursor-not-allowed'
                        : selectedGenre === g.id
                        ? 'border-yellow-400 bg-white/60 shadow-lg'
                        : 'border-white/40 bg-white/30 hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-sm ${!g.available ? 'text-gray-500' : 'text-gray-900'}`}>{g.label}</p>
                          {!g.available && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">準備中</span>}
                        </div>
                        <p className={`text-xs ${selectedGenre === g.id ? 'text-amber-700 font-semibold' : 'text-gray-600'}`}>{g.question}</p>
                      </div>
                      {selectedGenre === g.id && g.available && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0"
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </motion.div>
                      )}
                      {!g.available && <span className="text-lg">🔒</span>}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ゲームっぽい黄色ボタン */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ y: 2 }}
          onClick={handleNext}
          className="w-full py-4 rounded-2xl text-base font-black text-gray-900 tracking-wide transition relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)',
            boxShadow: '0 6px 0 #A16207, 0 8px 16px rgba(0,0,0,0.25)',
          }}
        >
          <span className="relative z-10 drop-shadow-sm">
            {step === 1 ? 'このステージに入る →' : '企画を考える →'}
          </span>
        </motion.button>

        <p className="text-xs text-white/60 text-center mt-3">ログイン不要で体験できます</p>

        {/* プログレスドット */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`rounded-full transition-all ${step >= i ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/30'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}