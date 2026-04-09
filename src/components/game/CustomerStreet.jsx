import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PERSONAS = [
  { id: 'a', emoji: '👩', name: 'ゆき', tag: '30代・主婦' },
  { id: 'b', emoji: '👨', name: 'たろう', tag: '40代・会社員' },
  { id: 'c', emoji: '🧑', name: 'はな', tag: '20代・学生' },
  { id: 'd', emoji: '👵', name: 'みか', tag: '60代・近隣住民' },
  { id: 'e', emoji: '🧔', name: 'けい', tag: '35歳・フリーランス' },
];

function getActions(customerReaction) {
  const { enter = 3, stop = 3, pass = 4 } = customerReaction || {};
  const actions = [];
  for (let i = 0; i < Math.min(enter, 5); i++) actions.push('enter');
  while (actions.length < Math.min(enter + stop, 5)) actions.push('stop');
  while (actions.length < 5) actions.push('pass');
  return actions;
}

const ACTION_CONFIG = {
  enter: { label: '入店', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40', icon: '🚪' },
  stop:  { label: '気になる', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', icon: '👀' },
  pass:  { label: 'スルー', color: 'text-gray-500', bg: 'bg-gray-700/30 border-gray-600/30', icon: '→' },
};

export default function CustomerStreet({ customerReaction, isTeaser = false }) {
  const [revealed, setRevealed] = useState([]);
  const actions = getActions(customerReaction);

  useEffect(() => {
    PERSONAS.forEach((_, i) => {
      setTimeout(() => {
        setRevealed(prev => [...prev, i]);
      }, 600 + i * 700);
    });
  }, []);

  const showCount = isTeaser ? 2 : 5;

  return (
    <div className="relative">
      {/* カウントサマリー */}
      <div className="flex gap-3 mb-4">
        {[
          { key: 'enter', count: customerReaction?.enter ?? 3, label: '入店' },
          { key: 'stop',  count: customerReaction?.stop  ?? 3, label: '気になる' },
          { key: 'pass',  count: customerReaction?.pass  ?? 4, label: 'スルー' },
        ].map(item => {
          const config = ACTION_CONFIG[item.key];
          const blur = isTeaser && item.key !== 'enter';
          return (
            <div key={item.key} className={`flex-1 rounded-xl border px-3 py-2 text-center transition ${config.bg} ${blur ? 'blur-sm select-none' : ''}`}>
              <p className={`text-2xl font-bold ${config.color}`}>{item.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* 人物反応リスト */}
      <div className="space-y-2">
        {PERSONAS.slice(0, showCount).map((p, i) => {
          const action = actions[i];
          const config = ACTION_CONFIG[action];
          const show = revealed.includes(i);
          const blurRow = isTeaser && i >= 1;

          return (
            <div key={p.id} className={`relative ${blurRow ? 'blur-sm pointer-events-none select-none' : ''}`}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${config.bg}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.tag}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{config.icon}</span>
                  <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* ティーザー：続きのロック */}
        {isTeaser && (
          <div className="relative mt-1">
            {/* ぼかしプレビュー */}
            {PERSONAS.slice(showCount).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-700/50 px-4 py-2.5 mb-2 blur-sm opacity-40">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.tag}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">？？？</span>
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950/90 flex items-end justify-center pb-2">
              <p className="text-xs text-gray-500">ログインすると全員の反応がわかります</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}