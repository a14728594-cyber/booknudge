import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import Card from '@/components/common/Card';
import { Loader2, TrendingUp, AlertTriangle, Target, Lightbulb, MessageSquare } from 'lucide-react';

export default function Result() {
    const [answer, setAnswer] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [distribution, setDistribution] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadResult();
    }, []);

    const loadResult = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const answerId = params.get('answer_id');

            if (!answerId) {
                throw new Error('Answer ID not found');
            }

            const answerData = await base44.entities.Answer.get(answerId);
            setAnswer(answerData);

            // フィードバック生成
            const { data } = await base44.functions.invoke('generateFeedback', {
                question_text: answerData.question_text,
                slider_value: answerData.slider_value,
                reason_text: answerData.reason_text,
                label_left: '0側',
                label_right: '100側'
            });
            setFeedback(data);

            // 分布取得（同じ問題の全回答）
            const allAnswers = await base44.entities.Answer.filter(
                { question_id: answerData.question_id }
            );
            setDistribution(allAnswers);
        } catch (error) {
            console.error('Error loading result:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">フィードバックを生成中...</p>
                </div>
            </div>
        );
    }

    if (!answer || !feedback) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">結果が見つかりませんでした</p>
                    <Link to={createPageUrl('daily')}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                            新しい問題へ
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Your Answer */}
                <Card>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        あなたの回答
                    </h2>
                    <div className="bg-indigo-50 rounded-xl p-6 mb-4">
                        <div className="text-5xl font-bold text-indigo-600 text-center mb-4">
                            {answer.slider_value}
                        </div>
                        <p className="text-gray-700 text-center">
                            {answer.reason_text}
                        </p>
                    </div>
                </Card>

                {/* Type */}
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            あなたの型
                        </h2>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-purple-900 mb-2">
                            {feedback.type_name}
                        </h3>
                        <p className="text-gray-700">
                            {feedback.type_explain}
                        </p>
                    </div>
                </Card>

                {/* Conditions */}
                <Card>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        判断条件
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-blue-900 mb-3">
                                0寄りが強い条件
                            </h3>
                            <ul className="space-y-2">
                                {feedback.conditions_left?.map((cond, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-1">•</span>
                                        <span className="text-gray-700">{cond}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-indigo-900 mb-3">
                                100寄りが強い条件
                            </h3>
                            <ul className="space-y-2">
                                {feedback.conditions_right?.map((cond, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-indigo-600 mt-1">•</span>
                                        <span className="text-gray-700">{cond}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>

                {/* Strength & Pitfall */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <Target className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                強み
                            </h3>
                        </div>
                        <p className="text-gray-700">
                            {feedback.strength}
                        </p>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                落とし穴
                            </h3>
                        </div>
                        <p className="text-gray-700">
                            {feedback.pitfall}
                        </p>
                    </Card>
                </div>

                {/* Next Action */}
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold">
                            次の一手
                        </h3>
                    </div>
                    <p className="text-lg text-white/90">
                        {feedback.next_action}
                    </p>
                    {feedback.micro_script && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm font-medium">その場の一言</span>
                            </div>
                            <p className="text-white/90">
                                {feedback.micro_script}
                            </p>
                        </div>
                    )}
                </Card>

                {/* Distribution */}
                {distribution.length > 1 && (
                    <Card>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            全体の分布
                        </h2>
                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-end justify-between h-32 gap-2">
                                {[0, 25, 50, 75, 100].map(bucket => {
                                    const count = distribution.filter(a => {
                                        const val = a.slider_value;
                                        if (bucket === 0) return val >= 0 && val < 25;
                                        if (bucket === 25) return val >= 25 && val < 50;
                                        if (bucket === 50) return val >= 50 && val < 75;
                                        if (bucket === 75) return val >= 75 && val < 100;
                                        return val === 100;
                                    }).length;
                                    const height = distribution.length > 0 
                                        ? (count / distribution.length) * 100 
                                        : 0;
                                    
                                    return (
                                        <div key={bucket} className="flex-1 flex flex-col items-center">
                                            <div className="w-full bg-indigo-200 rounded-t-lg" style={{ height: `${height}%` }}>
                                                <div className="w-full h-full bg-indigo-600 rounded-t-lg" />
                                            </div>
                                            <span className="text-xs text-gray-600 mt-2">{bucket}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-center text-sm text-gray-600 mt-4">
                                {distribution.length}人が回答
                            </p>
                        </div>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <Link to={createPageUrl('timeline')} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl py-6">
                            他の人の回答を見る
                        </Button>
                    </Link>
                    <Link to={createPageUrl('daily')} className="flex-1">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-6">
                            次の問題へ
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}