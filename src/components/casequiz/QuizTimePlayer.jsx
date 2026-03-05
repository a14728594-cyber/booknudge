import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

export default function QuizTimePlayer({ quizzes, user, genre, onFinish, onBack }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const quiz = quizzes[currentIdx];
    const isLast = currentIdx === quizzes.length - 1;

    useEffect(() => {
        loadOptions();
    }, [currentIdx]);

    const loadOptions = async () => {
        setLoading(true);
        setOptions([]);
        setSelectedOption(null);
        setSubmitted(false);
        const opts = await base44.entities.CaseQuizOption.filter({ quiz_id: quiz.id }, 'order', 20);
        setOptions(opts);
        setLoading(false);
    };

    const submit = async (optionId) => {
        if (submitted) return;
        setSelectedOption(optionId);
        setSubmitted(true);
        if (!user) return;
        setSaving(true);
        // 重複チェックなしでシンプルに記録
        await base44.entities.CaseQuizAnswer.create({
            user_id: user.id,
            quiz_id: quiz.id,
            option_id: optionId,
        });
        setSaving(false);
    };

    const handleNext = () => {
        if (isLast) {
            onFinish();
        } else {
            setCurrentIdx(i => i + 1);
        }
    };

    const progress = ((currentIdx + (submitted ? 1 : 0)) / quizzes.length) * 100;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* プログレスバー + ヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
                    <button onClick={onBack} className="text-gray-400 hover:text-gray-700 shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{genre?.name}</span>
                            <span>{currentIdx + 1} / {quizzes.length}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                    </div>
                ) : (
                    <>
                        {/* 事例 */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
                            {quiz.problem && (
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mb-3 inline-block">
                                    {quiz.problem}
                                </span>
                            )}
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {quiz.scenario}
                            </p>
                        </div>

                        {/* 質問 */}
                        <p className="text-base font-bold text-gray-900 mb-5">
                            Q. {quiz.question}
                        </p>

                        {/* 選択肢 */}
                        <div className="space-y-3 mb-6">
                            {options.map((opt, i) => {
                                const isSelected = selectedOption === opt.id;
                                const showFeedback = submitted && isSelected;
                                const label = String.fromCharCode(65 + i); // A, B, C...

                                return (
                                    <div key={opt.id}>
                                        <button
                                            onClick={() => submit(opt.id)}
                                            disabled={submitted}
                                            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                                                    : submitted
                                                    ? 'border-gray-100 bg-gray-50 text-gray-400'
                                                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {label}
                                                </span>
                                                <span className="leading-relaxed">{opt.option_text}</span>
                                                {isSelected && (
                                                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 ml-auto" />
                                                )}
                                            </div>
                                        </button>

                                        {/* 個別フィードバック */}
                                        {showFeedback && (opt.praise || opt.risk || opt.next_action) && (
                                            <div className="mt-2 ml-2 space-y-2">
                                                {opt.praise && (
                                                    <div className="flex gap-2 bg-emerald-50 rounded-xl px-4 py-2.5">
                                                        <span className="text-sm">✅</span>
                                                        <p className="text-sm text-emerald-800">{opt.praise}</p>
                                                    </div>
                                                )}
                                                {opt.risk && (
                                                    <div className="flex gap-2 bg-amber-50 rounded-xl px-4 py-2.5">
                                                        <span className="text-sm">⚠️</span>
                                                        <p className="text-sm text-amber-800">{opt.risk}</p>
                                                    </div>
                                                )}
                                                {opt.next_action && (
                                                    <div className="flex gap-2 bg-indigo-50 rounded-xl px-4 py-2.5">
                                                        <span className="text-sm">🚀</span>
                                                        <p className="text-sm text-indigo-800">{opt.next_action}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 共通フィードバック */}
                        {submitted && quiz.common_feedback && (
                            <div className="bg-gray-900 text-white rounded-xl p-4 mb-6">
                                <p className="text-xs text-gray-400 mb-1">この問いのポイント</p>
                                <p className="text-sm leading-relaxed">{quiz.common_feedback}</p>
                            </div>
                        )}

                        {/* 次へ / 結果へ */}
                        {submitted && (
                            <Button
                                onClick={handleNext}
                                className="w-full h-12 text-base gap-2"
                            >
                                {isLast ? '結果を見る' : '次の問題へ'}
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}