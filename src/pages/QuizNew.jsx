import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuizNew() {
    const { quiz_id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [answerValue, setAnswerValue] = useState('');
    const [sliderValue, setSliderValue] = useState([50]);

    useEffect(() => {
        loadQuiz();
    }, [quiz_id]);

    const loadQuiz = async () => {
        try {
            const quizData = await base44.entities.Quiz.get(quiz_id);
            setQuiz(quizData);
        } catch (error) {
            console.error('Failed to load quiz:', error);
            toast.error('クイズの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const user = await base44.auth.me();
            
            const finalAnswer = quiz.answer_type === 'slider' 
                ? sliderValue[0].toString() 
                : answerValue;

            if (!finalAnswer) {
                toast.error('回答を選択してください');
                setSubmitting(false);
                return;
            }

            // 回答を保存
            const attempt = await base44.entities.QuizAttempt.create({
                user_id: user.id,
                quiz_id: quiz.id,
                answer_value: finalAnswer
            });

            // 結果画面へ
            navigate(createPageUrl('quizResult/' + attempt.id));
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('回答の送信に失敗しました');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <p className="text-center text-gray-500">クイズが見つかりません</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <Card className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
                <p className="text-gray-700 mb-6 whitespace-pre-wrap">{quiz.scenario_text}</p>

                {quiz.answer_type === 'choice' && (
                    <div className="space-y-3">
                        {quiz.choices.map((choice, idx) => (
                            <button
                                key={idx}
                                onClick={() => setAnswerValue(choice)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    answerValue === choice
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                )}

                {quiz.answer_type === 'slider' && (
                    <div className="space-y-4">
                        <div className="text-center text-4xl font-bold text-indigo-600">
                            {sliderValue[0]}
                        </div>
                        <Slider
                            value={sliderValue}
                            onValueChange={setSliderValue}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>0</span>
                            <span>50</span>
                            <span>100</span>
                        </div>
                    </div>
                )}
            </Card>

            <Button
                onClick={handleSubmit}
                disabled={submitting || (!answerValue && quiz.answer_type === 'choice')}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        送信中...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        回答を送信
                    </>
                )}
            </Button>
        </div>
    );
}