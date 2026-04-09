// 100人の客が歩いてカフェに入るシミュレーション演出
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PERSONAS = ['👩','👨','🧑','👵','🧔','👱','🧕','🧓','👩‍💼','👨‍💼'];

// 1人の客オブジェクトを生成
function makeCustomer(id, enterCount, total) {
  const fromLeft = id % 2 === 0;
  const willEnter = id < enterCount;
  // 入店タイミングを分散（早い客と遅い客）
  const delay = (id / total) * 5 + Math.random() * 0.5;
  const persona = PERSONAS[id % PERSONAS.length];
  return { id, fromLeft, willEnter, delay, persona };
}

export default function StreetSimulation({ score, onComplete }) {
  const enterCount = Math.round((score / 100) * 100);
  const [customers] = useState(() =>
    Array.from({ length: 100 }, (_, i) => makeCustomer(i, enterCount, 100))
  );
  const [doorOpen, setDoorOpen] = useState(false);
  const [enteredCount, setEnteredCount] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState('intro'); // intro → walking → fadeout
  const enteredRef = useRef(0);
  const passedRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // 少し間を置いてからウォーキング開始
    const startTimer = setTimeout(() => setPhase('walking'), 800);

    // 客の入店/通過タイミングに応じてカウンター更新
    customers.forEach(c => {
      timerRef.current = setTimeout(() => {
        if (c.willEnter) {
          setDoorOpen(true);
          enteredRef.current += 1;
          setEnteredCount(enteredRef.current);
          setTimeout(() => setDoorOpen(false), 400);
        } else {
          passedRef.current += 1;
          setPassedCount(passedRef.current);
        }
      }, (c.delay + 1) * 1000);
    });

    // 全員通り過ぎた後にフェードアウト → 完了通知
    const finishTimer = setTimeout(() => {
      setDone(true);
      setPhase('fadeout');
      setTimeout(() => onComplete(), 1200);
    }, 8000);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  // 表示する客（一度に10人まで画面上に出す）
  const visibleCustomers = customers.filter(c => c.delay < 5);
  const visibleCustomers2 = customers.filter(c => c.delay >= 5);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      animate={{ opacity: phase === 'fadeout' ? 0 : 1 }}
      transition={{ duration: 1.2 }}
    >
      {/* 空背景 */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 55%, #FDE68A 85%, #E5E7EB 100%)' }} />

      {/* 太陽 */}
      <div className="absolute" style={{ top: 24, right: 60, width: 52, height: 52, borderRadius: '50%', background: '#FDE047', boxShadow: '0 0 0 10px rgba(253,224,71,0.3)' }} />

      {/* 雲 */}
      <Cloud x={10} y={8} />
      <Cloud x={60} y={5} scale={0.7} />

      {/* 背景の建物 */}
      <div className="absolute" style={{ bottom: 96, left: 0, right: 0 }}>
        {/* 遠景ビル */}
        <div style={{ position: 'absolute', bottom: 0, left: 20, width: 60, height: 80, background: '#A78BFA', borderRadius: '4px 4px 0 0' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 40, width: 50, height: 70, background: '#6EE7B7', borderRadius: '4px 4px 0 0' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 110, width: 45, height: 60, background: '#FCA5A5', borderRadius: '4px 4px 0 0' }} />
      </div>

      {/* カフェ建物 */}
      <CafeBuilding doorOpen={doorOpen} />

      {/* 地面 */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 96, background: '#E5E7EB' }}>
        {/* タイル */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 9}%`, width: 2, height: '100%', background: '#D1D5DB' }} />
        ))}
        {/* 道路 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: '#374151' }} />
        {/* 白線 */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', bottom: 16, left: `${i * 18 + 3}%`, width: 48, height: 6, background: '#FDE047', borderRadius: 3 }} />
        ))}
      </div>

      {/* 歩く客たち（wave 1: 早い） */}
      {phase === 'walking' && visibleCustomers.map(c => (
        <WalkingCustomer key={c.id} customer={c} />
      ))}
      {phase === 'walking' && visibleCustomers2.map(c => (
        <WalkingCustomer key={c.id} customer={c} />
      ))}

      {/* カウンター表示 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 text-center shadow-lg border border-green-200">
          <p className="text-xs text-green-700 font-bold">入店</p>
          <p className="text-2xl font-black text-green-600">{enteredCount}</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 text-center shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-bold">通過</p>
          <p className="text-2xl font-black text-gray-500">{passedCount}</p>
        </div>
      </div>

      {/* スキップボタン */}
      <button
        onClick={() => { setPhase('fadeout'); setTimeout(() => onComplete(), 1200); }}
        className="absolute bottom-6 right-6 text-xs text-gray-500 bg-white/70 px-3 py-1.5 rounded-full border border-gray-200 z-20"
      >
        スキップ →
      </button>

      {/* 完了メッセージ */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20"
          >
            <div className="bg-white/95 rounded-3xl px-8 py-6 text-center shadow-2xl">
              <p className="text-4xl font-black text-amber-600 mb-1">{enterCount}人</p>
              <p className="text-sm text-gray-600">が入店しました</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WalkingCustomer({ customer }) {
  const { fromLeft, willEnter, delay, persona } = customer;
  // 入店する客はカフェ前で止まる、素通りはそのまま通過
  const cafeX = 42; // カフェのX位置（%）
  const startX = fromLeft ? -6 : 106;
  const endX = willEnter ? cafeX : (fromLeft ? 110 : -10);

  return (
    <motion.div
      className="absolute text-2xl"
      style={{ bottom: 96 + 8, zIndex: 10 }}
      initial={{ left: `${startX}%`, opacity: 0 }}
      animate={{
        left: willEnter ? [`${startX}%`, `${cafeX}%`] : [`${startX}%`, `${endX}%`],
        opacity: willEnter ? [0, 1, 1, 0] : [0, 1, 0],
      }}
      transition={{
        duration: willEnter ? 2.5 : 3,
        delay,
        ease: 'linear',
        times: willEnter ? [0, 0.4, 0.9, 1] : [0, 0.1, 1],
      }}
    >
      <span style={{ display: 'inline-block', transform: fromLeft ? 'scaleX(1)' : 'scaleX(-1)' }}>
        {persona}
      </span>
    </motion.div>
  );
}

function CafeBuilding({ doorOpen }) {
  return (
    <div className="absolute" style={{ bottom: 96, left: '38%', width: 160, height: 200 }}>
      {/* 屋根 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 36, background: '#B45309', borderRadius: '6px 6px 0 0' }} />
      <div style={{ position: 'absolute', top: 32, left: 0, right: 0, height: 8, background: '#D97706' }} />
      {/* 壁 */}
      <div style={{ position: 'absolute', top: 38, left: 0, right: 0, bottom: 0, background: '#FEF3C7' }} />
      {/* 窓 */}
      <div style={{ position: 'absolute', top: 50, left: 12, width: 56, height: 64, background: '#BAE6FD', border: '4px solid #B45309', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: '#B45309' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, background: '#B45309' }} />
      </div>
      <div style={{ position: 'absolute', top: 50, right: 12, width: 36, height: 36, background: '#BAE6FD', border: '3px solid #B45309', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#B45309' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#B45309' }} />
      </div>
      {/* 看板 */}
      <div style={{ position: 'absolute', top: 124, left: 8, right: 8, background: '#B45309', borderRadius: 4, padding: '4px 8px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#FDE047', letterSpacing: 2 }}>CAFÉ ☕</span>
      </div>
      {/* 日よけ */}
      <div style={{ position: 'absolute', top: 148, left: 0, right: 0, height: 18, background: '#F59E0B', borderRadius: '0 0 4px 4px' }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'inline-block', width: '20%', height: '100%', borderRight: i < 4 ? '2px solid #D97706' : 'none' }} />
        ))}
      </div>
      {/* ドア */}
      <motion.div
        style={{ position: 'absolute', bottom: 0, left: 62, width: 36, height: 58, background: '#B45309', borderRadius: '4px 4px 0 0', originX: 0, overflow: 'hidden' }}
        animate={{ scaleX: doorOpen ? 0.15 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div style={{ position: 'absolute', top: 20, right: 6, width: 5, height: 5, borderRadius: '50%', background: '#FDE047' }} />
        <div style={{ position: 'absolute', top: 6, left: 4, right: 4, height: 26, background: '#BAE6FD', borderRadius: 2, border: '1.5px solid #92400E' }} />
      </motion.div>
    </div>
  );
}

function Cloud({ x, y, scale = 1 }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${scale})`, transformOrigin: 'left top' }}>
      <div style={{ position: 'relative', width: 80, height: 36 }}>
        <div style={{ position: 'absolute', top: 14, left: 0, width: 80, height: 20, background: 'white', borderRadius: 10, opacity: 0.9 }} />
        <div style={{ position: 'absolute', top: 4, left: 16, width: 28, height: 28, background: 'white', borderRadius: '50%', opacity: 0.9 }} />
        <div style={{ position: 'absolute', top: 8, left: 36, width: 22, height: 22, background: 'white', borderRadius: '50%', opacity: 0.9 }} />
      </div>
    </div>
  );
}