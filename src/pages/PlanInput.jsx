import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const QUESTIONS = [
  { key: 'target',       label: '誰向けに売りますか？',         placeholder: '例：子育て中の30代女性、近所に住む会社員など' },
  { key: 'product',      label: 'どんな商品・メニューですか？',  placeholder: '例：無添加素材のヘルシードーナツ、季節限定の抹茶ラテなど' },
  { key: 'price',        label: 'いくらで売りますか？',          placeholder: '例：280円、セット580円など' },
  { key: 'promotion',    label: 'どうやって知ってもらいますか？', placeholder: '例：インスタ投稿、近隣チラシ、口コミなど' },
  { key: 'unique_value', label: 'この店ならではの価値は何ですか？', placeholder: '例：地元農家と直接契約、オーナー自ら焼く、など' },
];

export default function PlanInput() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({ target: '', product: '', price: '', promotion: '', unique_value: '' });
  const [loading, setLoading] = useState(false);

  const stage = localStorage.getItem('game_stage') || 'cafe';
  const genre = localStorage.getItem('game_genre') || 'marketing';

  const isAllFilled = Object.values(answers).every(v => v.trim().length > 0);

  const handleSubmit = async () => {
    if (!isAllFilled) return;
    setLoading(true);

    // localStorageに企画内容を保存
    localStorage.setItem('game_plan', JSON.stringify(answers));

    try {
      const res = await base44.functions.invoke('analyzePlan', {
        stage,
        genre,
        plan: answers
      });

      const aiResult = res.data?.result;
      localStorage.setItem('game_ai_result', JSON.stringify(aiResult));
      navigate('/plan-result');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <span>🏪 カフェ編</span>
            <span>›</span>
            <span>マーケティング</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">あなたの企画を入力してください</h1>
          <p className="text-sm text-gray-500">住宅街の小さなカフェで売る新作ドーナツを考えて、誰にどう売るか決めてください</p>
        </motion.div>

        {/* 入力フォーム */}
        <div className="space-y-6 mb-8">
          {QUESTIONS.map((q, i) => (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <span className="text-indigo-500 mr-1">{i + 1}.</span>{q.label}
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                rows={2}
                placeholder={q.placeholder}
                value={answers[q.key]}
                onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
              />
            </motion.div>
          ))}
        </div>

        {/* 送信ボタン */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!isAllFilled || loading}
          className={`w-full py-4 rounded-2xl text-white font-bold text-lg transition ${
            isAllFilled && !loading
              ? 'bg-gray-900 hover:bg-gray-800 shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? 'AI客が集まっています…' : 'AI客に見てもらう →'}
        </motion.button>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
            <div className="text-4xl mb-2 animate-bounce">🚶🚶🚶</div>
            <p className="text-sm text-gray-400">企画を分析中…少しお待ちください</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}