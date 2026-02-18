import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import DomainBadge from '@/components/common/DomainBadge';
import { Loader2, Sparkles } from 'lucide-react';

const domains = [
    { id: 'sales', label: 'セールス' },
    { id: 'marketing', label: 'マーケティング' },
    { id: 'relationships', label: '人間関係' },
    { id: 'mindset', label: 'マインドセット' },
    { id: 'habits', label: '習慣' }
];

export default function Daily() {
    const navigate = useNavigate();
    const [step, setStep] = useState('select'); // select, question, answer
    const [selectedDomain, setSelectedDomain] = useState('');
    const [question, setQuestion] = useState(null);
    const [sliderValue, setSliderValue] = useState([50]);
    const [reasonText, setReasonText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSelectDomain = async (domain) => {
        setSelectedDomain(domain);
        setLoading(true);
        try {
            const { data } = await base44.functions.invoke('generateQuestion', { domain });
            setQuestion(data);
            setStep('question');
        } catch (error) {
            console.error('Error generating question:', error);
            alert('問題の生成に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!reasonText.trim()) {
            alert('理由を入力してください');
            return;
        }

        setLoading(true);
        try {
            const user = await base44.auth.me();

            // 回答を保存
            const answer = await base44.entities.Answer.create({
                user_id: user.id,
                domain: question.domain,
                question_id: question.question_id,
                question_text: question.question_text,
                slider_value: sliderValue[0],
                reason_text: reasonText
            });

            // イベント記録
            await base44.functions.invoke('trackEvent', {
                event_name: 'quiz_answer',
                event_value: {
                    domain: question.domain,
                    question_id: question.question_id,
                    slider_value: sliderValue[0]
                },
                update_last_active: true
            });

            // 結果ページへ
            navigate(createPageUrl('result') + `?answer_id=${answer.id}`);
        } catch (error) {
            console.error('Error submitting answer:', error);
            alert('回答の送信に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">
                        {step === 'select' ? '問題を生成中...' : '回答を処理中...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-3xl mx-auto">
                {step === 'select' && (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                                <Sparkles className="w-4 h-4" />
                                <span>今日の1問</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-3">
                                ジャンルを選んでください
                            </h1>
                            <p className="text-gray-600">
                                あなた専用の問題を生成します
                            </p>
                        </div>

                        <div className="space-y-4">
                            {domains.map(domain => (
                                <button
                                    key={domain.id}
                                    onClick={() => handleSelectDomain(domain.id)}
                                    className="w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-medium text-gray-900">
                                            {domain.label}
                                        </span>
                                        <DomainBadge domain={domain.id} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'question' && question && (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
                        <div className="mb-8">
                            <DomainBadge domain={question.domain} className="mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
                                {question.question_text}
                            </h2>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between text-sm text-gray-600 mb-4">
                                <span>{question.label_left}</span>
                                <span>{question.label_right}</span>
                            </div>
                            <Slider
                                value={sliderValue}
                                onValueChange={setSliderValue}
                                max={100}
                                step={1}
                                className="mb-4"
                            />
                            <div className="text-center">
                                <span className="text-4xl font-bold text-indigo-600">
                                    {sliderValue[0]}
                                </span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                あなたの理由を教えてください
                            </label>
                            <Textarea
                                placeholder="なぜこの値を選んだのか、あなたの考えを入力してください..."
                                value={reasonText}
                                onChange={(e) => setReasonText(e.target.value)}
                                className="min-h-[120px] rounded-xl"
                            />
                        </div>

                        <Button
                            onClick={handleSubmitAnswer}
                            disabled={!reasonText.trim() || loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg rounded-xl"
                        >
                            回答を送信
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}