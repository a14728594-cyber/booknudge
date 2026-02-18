import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const domains = [
    { id: 'sales', label: 'セールス' },
    { id: 'marketing', label: 'マーケティング' },
    { id: 'relationships', label: '人間関係' },
    { id: 'mindset', label: 'マインドセット' },
    { id: 'habits', label: '習慣' }
];

const stages = ['初心者', '中級者', '上級者', 'エキスパート'];

export default function Onboarding() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        goals: '',
        constraints: '',
        focus_domains: [],
        stage: ''
    });

    const handleNext = () => {
        if (step < 4) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const toggleDomain = (domainId) => {
        setData(prev => ({
            ...prev,
            focus_domains: prev.focus_domains.includes(domainId)
                ? prev.focus_domains.filter(d => d !== domainId)
                : [...prev.focus_domains, domainId]
        }));
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            await base44.auth.updateMe({
                profile_json: data
            });

            await base44.functions.invoke('trackEvent', {
                event_name: 'onboarding_complete',
                event_value: data,
                update_last_active: true
            });

            navigate(createPageUrl('recommend'));
        } catch (error) {
            console.error('Error completing onboarding:', error);
            alert('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
                    {/* Progress */}
                    <div className="mb-8">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">
                                ステップ {step} / 4
                            </span>
                            <span className="text-sm font-medium text-indigo-600">
                                {Math.round((step / 4) * 100)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${(step / 4) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Step 1: Goals */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    あなたの目標は？
                                </h2>
                                <p className="text-gray-600">
                                    ビジネスで達成したいことを自由に書いてください
                                </p>
                            </div>
                            <Textarea
                                placeholder="例: 営業成績を上げたい、マーケティングスキルを身につけたい..."
                                value={data.goals}
                                onChange={(e) => setData({ ...data, goals: e.target.value })}
                                className="min-h-[150px] text-base rounded-xl"
                            />
                        </div>
                    )}

                    {/* Step 2: Constraints */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    制約はありますか？
                                </h2>
                                <p className="text-gray-600">
                                    時間、予算、環境など、考慮すべき制約があれば教えてください
                                </p>
                            </div>
                            <Textarea
                                placeholder="例: 週2時間しか学習時間が取れない、予算は限られている..."
                                value={data.constraints}
                                onChange={(e) => setData({ ...data, constraints: e.target.value })}
                                className="min-h-[150px] text-base rounded-xl"
                            />
                        </div>
                    )}

                    {/* Step 3: Focus Domains */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    フォーカスしたい領域は？
                                </h2>
                                <p className="text-gray-600">
                                    興味のある領域を選んでください（複数選択可）
                                </p>
                            </div>
                            <div className="space-y-4">
                                {domains.map(domain => (
                                    <div 
                                        key={domain.id}
                                        className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                            data.focus_domains.includes(domain.id)
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => toggleDomain(domain.id)}
                                    >
                                        <Checkbox 
                                            checked={data.focus_domains.includes(domain.id)}
                                            onCheckedChange={() => toggleDomain(domain.id)}
                                        />
                                        <Label className="text-lg cursor-pointer flex-1">
                                            {domain.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Stage */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    現在のレベルは？
                                </h2>
                                <p className="text-gray-600">
                                    ビジネス学習の経験レベルを教えてください
                                </p>
                            </div>
                            <div className="space-y-3">
                                {stages.map(stage => (
                                    <div
                                        key={stage}
                                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                            data.stage === stage
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => setData({ ...data, stage })}
                                    >
                                        <p className="text-lg font-medium">{stage}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-8 border-t border-gray-100">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={step === 1}
                            className="rounded-xl"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            戻る
                        </Button>
                        
                        {step < 4 ? (
                            <Button
                                onClick={handleNext}
                                className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                            >
                                次へ
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleComplete}
                                disabled={loading || !data.goals || data.focus_domains.length === 0 || !data.stage}
                                className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                            >
                                {loading ? '処理中...' : '診断完了'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}