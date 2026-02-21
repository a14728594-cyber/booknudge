import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Lock, Sparkles, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function QuizResult() {
    const { attempt_id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [stats, setStats] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [user, setUser] = useState(null);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    useEffect(() => {
        loadData();
    }, [attempt_id]);

    const loadData = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            const attemptData = await base44.entities.QuizAttempt.get(attempt_id);
            setAttempt(attemptData);

            const quizData = await base44.entities.Quiz.get(attemptData.quiz_id);
            setQuiz(quizData);

            // cohort取得
            const cohorts = await base44.entities.SimilarCohort.filter({ user_id: userData.id });
            if (cohorts.length > 0) {
                const statsData = await base44.entities.CohortAnswerStats.filter({
                    cohort_id: cohorts[0].id,
                    quiz_id: quizData.id
                });
                if (statsData.length > 0) {
                    setStats(statsData[0]);
                }
            }

            // フィードバック取得（有料のみ）
            if (userData.subscription_status === 'active') {
                const feedbackData = await base44.entities.QuizFeedback.filter({ attempt_id });
                if (feedbackData.length > 0) {
                    setFeedback(feedbackData[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load result:', error);
            toast.error('結果の読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFeedback = async () => {
        setLoadingFeedback(true);
        try {
            const result = await base44.functions.invoke('generateQuizFeedback', { attempt_id });
            setFeedback(result.data.feedback);
            toast.success('フィードバックを生成しました');
        } catch (error) {
            console.error('Failed to generate feedback:', error);
            toast.error('フィードバックの生成に失敗しました');
        } finally {
            setLoadingFeedback(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const isPremium = user?.subscription_status === 'active';

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <Card className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz?.title}</h1>
                <p className="text-sm text-gray-500 mb-6">結果</p>

                {/* 1. あなたの回答 */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        あなたの回答
                    </h2>
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-indigo-600">
                            {attempt?.answer_value}
                        </div>
                    </div>
                </div>

                {/* 2. 似てる人の回答分布 */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        似てる人の回答分布
                    </h2>
                    {stats ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-600">
                                    目標×興味が近い人: <strong>{stats.sample_size}人</strong>
                                </span>
                                {stats.sample_size < 30 && (
                                    <span className="text-xs text-amber-600">※人数が少ないため参考値です</span>
                                )}
                            </div>
                            {quiz?.answer_type === 'choice' && (
                                <div className="space-y-2">
                                    {Object.entries(stats.distribution_json).map(([choice, ratio]) => (
                                        <div key={choice} className="flex items-center gap-3">
                                            <div className="w-24 text-sm text-gray-700">{choice}</div>
                                            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                                <div
                                                    className="bg-indigo-500 h-full flex items-center justify-end pr-2"
                                                    style={{ width: `${ratio * 100}%` }}
                                                >
                                                    <span className="text-xs text-white font-medium">
                                                        {Math.round(ratio * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {quiz?.answer_type === 'slider' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>平均: <strong>{Math.round(stats.distribution_json.mean)}</strong></span>
                                        <span>中央値: <strong>{Math.round(stats.distribution_json.median)}</strong></span>
                                    </div>
                                    <div className="h-2 bg-gradient-to-r from-blue-200 via-indigo-400 to-purple-200 rounded-full"></div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">まだ十分なデータがありません</p>
                    )}
                </div>

                {/* 3. フィードバック（有料のみ） */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        AIフィードバック
                        {!isPremium && <Lock className="w-4 h-4 text-gray-400" />}
                    </h2>

                    {!isPremium ? (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6 text-center">
                            <Lock className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                            <p className="text-gray-700 mb-4">
                                プレミアムプランで、あなたの強み・盲点・次の一手を確認できます
                            </p>
                            <Button
                                onClick={() => navigate(createPageUrl('paywall') + '?next=/quizResult/' + attempt_id)}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                プレミアムプランを開始
                            </Button>
                        </div>
                    ) : feedback ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-blue-900 mb-1">強み</h3>
                                        <p className="text-sm text-blue-800">{feedback.strength_text}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-amber-900 mb-1">盲点</h3>
                                        <p className="text-sm text-amber-800">{feedback.blindspot_text}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <ArrowRight className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-green-900 mb-1">次の一手</h3>
                                        <p className="text-sm text-green-800">{feedback.next_action_text}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleGenerateFeedback}
                            disabled={loadingFeedback}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                            {loadingFeedback ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    フィードバックを生成
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </Card>

            <Button
                onClick={() => navigate(createPageUrl('home'))}
                variant="outline"
                className="w-full"
            >
                ホームに戻る
            </Button>
        </div>
    );
}