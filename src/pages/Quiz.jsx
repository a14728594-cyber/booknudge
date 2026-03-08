import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, Zap, Sparkles, ChevronRight, Lock } from 'lucide-react';
import Card from '@/components/common/Card';
import QuizDistribution from '@/components/quiz/QuizDistribution';
import QuizPaywall from '@/components/quiz/QuizPaywall';

// クイズハブ：共通クイズ（無料）とパーソナライズクイズ（有料）の入口
export default function Quiz() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const isPremium = user?.subscription_status === 'active';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">クイズ</h1>
            <p className="text-gray-500 mb-10">学びを深める2種類のクイズをご用意しています</p>

            <div className="space-y-4">
                {/* 共通クイズ（無料） */}
                <button
                    onClick={() => navigate(createPageUrl('CommonQuiz'))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-6 flex items-center justify-between hover:border-indigo-400 hover:shadow-md transition-all group text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700">事例クイズ</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">無料</span>
                            </div>
                            <p className="text-sm text-gray-500">実際のビジネス事例を題材にした5択クイズ</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" />
                </button>

                {/* パーソナライズクイズ（有料） */}
                <button
                    onClick={() => {
                        if (isPremium) {
                            navigate(createPageUrl('PersonalizedQuiz'));
                        } else {
                            navigate(createPageUrl('paywall') + '?next=' + encodeURIComponent('/PersonalizedQuiz') + '&from=quiz');
                        }
                    }}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-6 flex items-center justify-between hover:border-purple-400 hover:shadow-md transition-all group text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">パーソナライズクイズ</span>
                                {isPremium ? (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">PRO</span>
                                ) : (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Lock className="w-3 h-3" />有料
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">あなた専用にカスタマイズされたクイズ</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                </button>
            </div>
        </div>
    );
}

function QuizPageContent() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [quizzes, setQuizzes] = useState([]);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [sliderValue, setSliderValue] = useState(50);
    const [answeredQuizIds, setAnsweredQuizIds] = useState(new Set());
    const [isPro, setIsPro] = useState(false);
    const [dailyLimit, setDailyLimit] = useState(null);
    const [limitError, setLimitError] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = await base44.auth.me();
            setUser(userData);
            setIsPro(userData.subscription_status === 'active');

            // アクティブなクイズを取得
            const activeQuizzes = await base44.entities.Quiz.filter({
                is_active: true
            });
            setQuizzes(activeQuizzes);

            // ユーザーの回答済みクイズを取得
            const answers = await base44.entities.QuizAnswer.filter({
                user_id: userData.id
            });
            setAnsweredQuizIds(new Set(answers.map(a => a.quiz_id)));

            // Free ユーザーは1日の上限チェック
            if (userData.subscription_status !== 'active') {
                const limitResult = await base44.functions.invoke('checkQuizDailyLimit', {});
                setDailyLimit(limitResult.data);
            }

        } catch (error) {
            console.error('Failed to load quiz:', error);
        }
        setLoading(false);
    };

    const handleSubmitAnswer = async () => {
        if (!user || quizzes.length === 0) return;

        // Free ユーザーの1日5問制限チェック
        if (!isPro && dailyLimit && !dailyLimit.canAnswer) {
            setLimitError(true);
            return;
        }

        const currentQuiz = quizzes[currentQuizIndex];
        
        try {
            await base44.entities.QuizAnswer.create({
                user_id: user.id,
                quiz_id: currentQuiz.id,
                value: sliderValue
            });

            // イベント記録
            await base44.functions.invoke('trackEvent', {
                event_name: 'quiz_answer',
                event_value: { quiz_id: currentQuiz.id, genre: currentQuiz.genre },
                update_last_active: true
            });

            const newAnswered = new Set(answeredQuizIds);
            newAnswered.add(currentQuiz.id);
            setAnsweredQuizIds(newAnswered);

            // Free ユーザーは上限をカウントアップ
            if (!isPro && dailyLimit) {
                setDailyLimit({
                    ...dailyLimit,
                    todayCount: dailyLimit.todayCount + 1,
                    remaining: Math.max(0, dailyLimit.remaining - 1)
                });
            }

            // 次のクイズへ
            if (currentQuizIndex < quizzes.length - 1) {
                setCurrentQuizIndex(currentQuizIndex + 1);
                setSliderValue(50);
            } else {
                alert('全てのクイズに回答しました！');
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            alert('回答の保存に失敗しました');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">クイズ</h1>

            {quizzes.length > 0 ? (
                <Card>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>クイズ {currentQuizIndex + 1} / {quizzes.length}</span>
                            <span>{answeredQuizIds.has(quizzes[currentQuizIndex].id) ? '（回答済み）' : '未回答'}</span>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {quizzes[currentQuizIndex].title}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {quizzes[currentQuizIndex].prompt}
                            </p>

                            <div className="space-y-4">
                                <Slider
                                    value={[sliderValue]}
                                    onValueChange={(value) => setSliderValue(value[0])}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>{quizzes[currentQuizIndex].min_label}</span>
                                    <span className="font-semibold text-indigo-600">{sliderValue}</span>
                                    <span>{quizzes[currentQuizIndex].max_label}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between gap-4 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (currentQuizIndex > 0) {
                                        setCurrentQuizIndex(currentQuizIndex - 1);
                                        setSliderValue(50);
                                    }
                                }}
                                disabled={currentQuizIndex === 0}
                            >
                                前へ
                            </Button>
                            <Button
                                onClick={handleSubmitAnswer}
                                className="flex-1"
                                disabled={!isPro && dailyLimit && !dailyLimit.canAnswer}
                            >
                                {answeredQuizIds.has(quizzes[currentQuizIndex].id) ? '回答を更新' : '回答する'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (currentQuizIndex < quizzes.length - 1) {
                                        setCurrentQuizIndex(currentQuizIndex + 1);
                                        setSliderValue(50);
                                    }
                                }}
                                disabled={currentQuizIndex === quizzes.length - 1}
                            >
                                次へ
                            </Button>
                        </div>

                        {/* Free ユーザー向け上限表示 */}
                        {!isPro && dailyLimit && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                                <p className="text-sm text-amber-900">
                                    本日の回答: <span className="font-semibold">{dailyLimit.todayCount}</span> / 5問
                                    {dailyLimit.remaining === 0 && '（本日は回答上限に達しました）'}
                                </p>
                            </div>
                        )}

                        {/* 回答結果とフィードバック表示 */}
                        {answeredQuizIds.has(quizzes[currentQuizIndex].id) && (
                            <div className="mt-6 space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-green-900">✓ 回答済み</p>
                                </div>

                                {/* Free 専用：分布エリアをぼかして Paywall 表示 */}
                                {!isPro ? (
                                    <div className="opacity-40 pointer-events-none">
                                        <QuizDistribution 
                                            quizId={quizzes[currentQuizIndex].id}
                                            userValue={sliderValue}
                                            isPro={false}
                                        />
                                        <div className="absolute inset-0 bg-white opacity-30 rounded-lg" />
                                    </div>
                                ) : null}

                                {/* Pro 用：分布表示 */}
                                {isPro && (
                                    <QuizDistribution 
                                        quizId={quizzes[currentQuizIndex].id}
                                        userValue={sliderValue}
                                        isPro={true}
                                    />
                                )}

                                {/* Free ユーザー向け Paywall */}
                                {!isPro && (
                                    <QuizPaywall type="distribution" />
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-600">現在利用可能なクイズがありません</p>
                    </div>
                </Card>
            )}

            {/* 上限到達時の Paywall */}
            {limitError && !isPro && (
                <div className="mt-6">
                    <QuizPaywall type="limit" />
                </div>
            )}
        </div>
    );
}