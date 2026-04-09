import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AI_CUSTOMERS = [
  { id: 'yuki', emoji: '👩', name: 'ゆき', age: 32, style: '子育て中' },
  { id: 'taro', emoji: '👨', name: 'たろう', age: 45, style: 'サラリーマン' },
  { id: 'hana', emoji: '🧑', name: 'はな', age: 22, style: '大学生' },
  { id: 'mika', emoji: '👵', name: 'みか', age: 60, style: '主婦' },
  { id: 'kei',  emoji: '🧔', name: 'けい', age: 35, style: 'フリーランス' },
];

// スコアに基づいて客の反応を決定
function getCustomerAction(idx, customerReaction) {
  const { enter = 3, stop = 3, pass = 4 } = customerReaction || {};
  const total = enter + stop + pass;
  const enterRatio = enter / total;
  const stopRatio = stop / total;

  const r = (idx + 1) / AI_CUSTOMERS.length;
  if (r <= enterRatio) return 'enter';
  if (r <= enterRatio + stopRatio) return 'stop';
  return 'pass';
}

const ACTION_CONFIG = {
  enter: { label: '入店', color: 'text-green-500', icon: '🚪', endX: 280 },
  stop:  { label: '立ち止まり', color: 'text-amber-500', icon: '👀', endX: 160 },
  pass:  { label: 'スルー', color: 'text-gray-400', icon: '→', endX: 340 },
};

export default function CustomerStreet({ customerReaction, isTeaser = false }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 400);
    return () => clearTimeout(t);
  }, []);

  const customers = AI_CUSTOMERS.map((c, i) => ({
    ...c,
    action: getCustomerAction(i, customerReaction),
    delay: i * 0.6,
  }));

  return (
    <div className="relative bg-gradient-to-b from-sky-50 to-amber-50 rounded-2xl overflow-hidden border border-amber-100" style={{ height: 180 }}>
      {/* 店 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-center">
        <div className="text-4xl">🏪</div>
        <p className="text-xs text-gray-400 mt-1">カフェ</p>
      </div>

      {/* 道路ライン */}
      <div className="absolute bottom-8 left-16 right-4 h-px bg-gray-200 border-dashed border-t border-gray-300" />

      {/* 客アニメーション */}
      {active && customers.map((c) => {
        const config = ACTION_CONFIG[c.action];
        return (
          <motion.div
            key={c.id}
            initial={{ x: 320, opacity: 0 }}
            animate={{
              x: config.endX,
              opacity: c.action === 'pass' ? [0, 1, 1, 0] : 1,
            }}
            transition={{ duration: 2.5, delay: c.delay, ease: 'easeOut' }}
            className="absolute"
            style={{ bottom: 28, right: 0 }}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl">{c.emoji}</span>
              {!isTeaser && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: c.delay + 1.5 }}
                  className={`text-[10px] font-bold ${config.color}`}
                >
                  {config.label}
                </motion.span>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* ティーザー時のぼかし */}
      {isTeaser && (
        <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent flex items-end justify-center pb-3">
          <p className="text-xs text-gray-400 font-medium">ログインすると全員の反応がわかります</p>
        </div>
      )}
    </div>
  );
}