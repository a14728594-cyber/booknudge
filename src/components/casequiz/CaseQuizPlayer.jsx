import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function CaseQuizPlayer({ quiz, user, onBack }) {
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadOptions();
        checkPreviousAnswer();
    }, []);

    const loadOptions = async () => {
        const opts = await base44.entities.CaseQuizOption.filter({ quiz_id: quiz.id }, 'order', 20);
        setOptions(opts);
        setLoading(false);
    };

    const checkPreviousAnswer = async () => {
        if (!user) return;
        const prev = await base44.entities.CaseQuizAnswer.filter({ user_id: user.id, quiz_id: quiz.id }, '-created_date', 1);
        if (prev.length > 0) {
            setSelectedOption(prev[0].option_id);
            setSubmitted(true);
        }
    };

    const submit = async (optionId) => {
        setSelectedOption(optionId);
        setSubmitted(true);
        if (!user) return;
        setSaving(true);
        await base44.entities.CaseQuizAnswer.create({
            user_id: user.id,
            quiz_id: quiz.id,
            option_id: optionId,
        });
        setSaving(false);
    };

    const selectedOpt = options.find(o => o.id === selectedOption);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
                <ArrowLeft className="w-4 h-4" /> 一覧に戻る
            </button>

            {loading ? (
                <div className="text-center py-12 text-gray-400">読み込み中...</div>
            ) : (
                <>
                    {/* 事例 */}
                    <div className="bg-gray-50 rounded-xl p-5 mb-5">
                        {quiz.problem && (
                            <span className="text-xs bg-white border text-gray-500 px-2 py-0.5 rounded-full mb-3 inline-block">{quiz.problem}</span>
                        )}
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{quiz.scenario}</p>
                    </div>

                    {/* 質問 */}
                    <p className="text-base font-bold text-gray-900 mb-5">Q. {quiz.question}</p>

                    {/* 選択肢 */}
                    <div className="space-y-3 mb-6">
                        {options.map((opt) => {
                            const isSelected = selectedOption === opt.id;
                            const showFeedback = submitted && isSelected;
                            return (
                                <div key={opt.id}>
                                    <button
                                        onClick={() => !submitted && submit(opt.id)}
                                        disabled={submitted}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                                            isSelected
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                                                : submitted
                                                ? 'border-gray-100 bg-gray-50 text-gray-400'
                                                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />}
                                            <span>{opt.option_text}</span>
                                        </div>
                                    </button>

                                    {/* 選択肢フィードバック */}
                                    {showFeedback && (opt.praise || opt.risk || opt.next_action) && (
                                        <div className="mt-2 ml-2 space-y-2">
                                            {opt.praise && (
                                                <div className="flex gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                                                    <span className="text-emerald-600 text-sm">✅</span>
                                                    <p className="text-sm text-emerald-800">{opt.praise}</p>
                                                </div>
                                            )}
                                            {opt.risk && (
                                                <div className="flex gap-2 bg-amber-50 rounded-lg px-3 py-2">
                                                    <span className="text-amber-600 text-sm">⚠️</span>
                                                    <p className="text-sm text-amber-800">{opt.risk}</p>
                                                </div>
                                            )}
                                            {opt.next_action && (
                                                <div className="flex gap-2 bg-indigo-50 rounded-lg px-3 py-2">
                                                    <span className="text-indigo-600 text-sm">🚀</span>
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
                            <p className="text-sm">{quiz.common_feedback}</p>
                        </div>
                    )}

                    {submitted && (
                        <Button variant="outline" onClick={onBack} className="w-full">
                            一覧に戻る
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}