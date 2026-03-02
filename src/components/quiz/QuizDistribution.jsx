import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function QuizDistribution({ quizId, userValue, isPro }) {
    const [distribution, setDistribution] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isPro && quizId) {
            loadDistribution();
        } else {
            setLoading(false);
        }
    }, [quizId, isPro]);

    const loadDistribution = async () => {
        try {
            setLoading(true);
            // 該当クイズの全回答を取得
            const allAnswers = await base44.entities.QuizAnswer.filter({
                quiz_id: quizId
            });

            // 0-100をbins（10の幅）に分ける
            const bins = Array(10).fill(0);
            allAnswers.forEach(answer => {
                const binIndex = Math.floor(answer.value / 10);
                bins[Math.min(binIndex, 9)]++;
            });

            // グラフ用データ
            const data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    range: `${i * 10}-${i * 10 + 9}`,
                    count: bins[i]
                });
            }

            setDistribution(data);
        } catch (error) {
            console.error('Failed to load distribution:', error);
        }
        setLoading(false);
    };

    if (!isPro) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">分布を読み込み中...</span>
            </div>
        );
    }

    if (!distribution) {
        return null;
    }

    const userBin = Math.floor(userValue / 10);

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">他ユーザーの回答分布</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#6366f1" 
                            radius={[4, 4, 0, 0]}
                            onClick={(data) => {}}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                    <span className="font-semibold">あなたの回答:</span>{' '}
                    <span className="text-indigo-600 font-semibold">{userValue}点</span>
                    {' '}
                    <span className="text-gray-600">
                        （{distribution[userBin]?.range || '0-9'} グループ）
                    </span>
                </p>
            </div>
        </div>
    );
}