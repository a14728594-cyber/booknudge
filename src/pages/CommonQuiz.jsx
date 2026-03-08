import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Card from '@/components/common/Card';
import QuizDistribution from '@/components/quiz/QuizDistribution';
import QuizPaywall from '@/components/quiz/QuizPaywall';
import { Slider } from '@/components/ui/slider';

// 共通クイズ（無料）
export default function CommonQuiz() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quizzes, setQuizzes] = useState([]);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [sliderValue, setSliderValue] = useState(50);
    const [answeredQuizIds, setAnsweredQuizIds] = useState(new Set());
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const userData = await base44.auth.me();
        setUser(userData);
        setIsPro(userData?.subscription_status === 'active');

        const activeQuizzes = await base44.entities.Quiz.filter({ is_active: true });
        setQuizzes(activeQuizzes);

        if (userData) {
            const answers = await base44.entities.QuizAnswer.filter({ user_id: userData.id });
            setAnsweredQuizIds(new Set(answers.map(a => a.quiz_id)));
        }
        setLoading(false);
    };

    const handleSubmitAnswer = async () => {
        if (!user || quizzes.length === 0) return;
        const currentQuiz = quizzes[currentQuizIndex];

        await base44.entities.QuizAnswer.create({
            user_id: user.id,
            quiz_id: currentQuiz.id,
            value: sliderValue
        });

        await base44.functions.invoke('trackEvent', {
            event_name: 'quiz_answer',
            event_value: { quiz_id: currentQuiz.id, genre: currentQuiz.genre },
            update_last_active: true
        });

        const newAnswered = new Set(answeredQuizIds);
        newAnswered.add(currentQuiz.id);
        setAnsweredQuizIds(newAnswered);
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
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(createPageUrl('quiz'))} className="text-sm text-gray-500 hover:text-gray-700">← クイズトップ</button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">事例クイズ</h1>

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
                                onClick={() => { if (currentQuizIndex > 0) { setCurrentQuizIndex(currentQuizIndex - 1); setSliderValue(50); } }}
                                disabled={currentQuizIndex === 0}
                            >
                                前へ
                            </Button>
                            <Button onClick={handleSubmitAnswer} className="flex-1">
                                {answeredQuizIds.has(quizzes[currentQuizIndex].id) ? '回答を更新' : '回答する'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => { if (currentQuizIndex < quizzes.length - 1) { setCurrentQuizIndex(currentQuizIndex + 1); setSliderValue(50); } }}
                                disabled={currentQuizIndex === quizzes.length - 1}
                            >
                                次へ
                            </Button>
                        </div>

                        {answeredQuizIds.has(quizzes[currentQuizIndex].id) && (
                            <div className="mt-6 space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-green-900">✓ 回答済み</p>
                                </div>

                                {isPro ? (
                                    <QuizDistribution
                                        quizId={quizzes[currentQuizIndex].id}
                                        userValue={sliderValue}
                                        isPro={true}
                                    />
                                ) : (
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
        </div>
    );
}