import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

const STEPS = [
    {
        id: 'position',
        title: 'いま何をしてる人？',
        description: '現在の立場や職種を教えてください'
    },
    {
        id: 'future_goal',
        title: '将来どんなことをしたい？',
        description: '理想の姿や3年後に達成したい状態を教えてください'
    },
    {
        id: 'current_actions',
        title: 'そのために今なにやってる？',
        description: '目標達成のために取り組んでいることを選んでください'
    },
    {
        id: 'challenges',
        title: 'いまの悩み',
        description: '具体的にどこで詰まっているか教えてください'
    },
    {
        id: 'strengths',
        title: '好き・得意',
        description: '得意なことや好きなことを教えてください（任意）'
    },
    {
        id: 'weaknesses',
        title: '嫌い・苦手',
        description: '苦手なことや避けたいことを教えてください（任意）'
    },
    {
        id: 'yearly_goal',
        title: '今年の目標',
        description: '今年達成したいことを教えてください（任意）'
    }
];

const POSITION_OPTIONS = [
    '会社員（営業）',
    '会社員（マーケティング）',
    '会社員（エンジニア）',
    '会社員（管理職）',
    '経営者',
    '個人事業主',
    '学生',
    'その他'
];

const CURRENT_ACTIONS_OPTIONS = [
    '読書',
    'オンライン講座',
    'セミナー参加',
    '実践・実務',
    'メンター相談',
    'SNS発信',
    'コミュニティ活動',
    'その他'
];

const FUTURE_GOAL_OPTIONS = [
    '起業・独立する',
    '年収を大幅に上げる',
    'スキルをアップさせる',
    'キャリアチェンジする',
    'リーダーシップを身につける',
    'その他'
];

const CHALLENGES_OPTIONS = [
    '売上・成約率が上がらない',
    'マーケティング戦略が分からない',
    '対人関係が上手くいかない',
    'メンタルが不安定',
    '時間管理ができていない',
    'その他'
];

const STRENGTHS_OPTIONS = [
    '人間関係構築力',
    'データ分析力',
    'クリエイティブ思考',
    'リーダーシップ',
    'コミュニケーション力',
    '特にない'
];

const WEAKNESSES_OPTIONS = [
    '細かい作業',
    '長時間のデスクワーク',
    '対人関係',
    '数字・データ分析',
    'クリエイティブ作業',
    '特にない'
];

const YEARLY_GOAL_OPTIONS = [
    '売上150%達成',
    '新しいスキル習得',
    'チームマネジメント経験',
    'キャリアアップ',
    'メンタルヘルス改善',
    'その他'
];

export default function Onboarding() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        base44.auth.isAuthenticated().then(isAuth => {
            if (!isAuth) navigate(createPageUrl('landing'));
        });
    }, []);
    const [formData, setFormData] = useState({
        position: '',
        position_other: '',
        future_goal: '',
        current_actions: [],
        current_actions_other: '',
        challenges: '',
        strengths: '',
        weaknesses: '',
        yearly_goal: ''
    });

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            await handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // プロフィール保存
            await base44.auth.updateMe({
                profile_json: formData,
                onboarding_completed: true
            });

            navigate(createPageUrl('home'));
        } catch (error) {
            console.error('Onboarding failed:', error);
            alert('エラーが発生しました。もう一度お試しください。');
        }
        setLoading(false);
    };

    const isStepValid = () => {
        const step = STEPS[currentStep];
        switch (step.id) {
            case 'position':
                return formData.position && (formData.position !== 'その他' || formData.position_other);
            case 'future_goal':
                return formData.future_goal.trim().length > 0;
            case 'current_actions':
                return formData.current_actions.length > 0 || formData.current_actions_other.trim().length > 0;
            case 'challenges':
                return formData.challenges.trim().length > 0;
            default:
                return true; // 任意項目
        }
    };

    const renderStepContent = () => {
        const step = STEPS[currentStep];

        switch (step.id) {
            case 'position':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>立場/職種</Label>
                            <Select
                                value={formData.position}
                                onValueChange={(value) => setFormData({ ...formData, position: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {POSITION_OPTIONS.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.position === 'その他' && (
                            <div>
                                <Label>詳しく教えてください</Label>
                                <Input
                                    value={formData.position_other}
                                    onChange={(e) => setFormData({ ...formData, position_other: e.target.value })}
                                    placeholder="例：フリーランスデザイナー"
                                />
                            </div>
                        )}
                    </div>
                );

            case 'future_goal':
                return (
                    <div className="space-y-3">
                        {FUTURE_GOAL_OPTIONS.map(option => (
                            <button
                                key={option}
                                onClick={() => setFormData({ ...formData, future_goal: option })}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    formData.future_goal === option
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );

            case 'current_actions':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {CURRENT_ACTIONS_OPTIONS.map(option => (
                                <div key={option} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.current_actions.includes(option)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setFormData({
                                                    ...formData,
                                                    current_actions: [...formData.current_actions, option]
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    current_actions: formData.current_actions.filter(a => a !== option)
                                                });
                                            }
                                        }}
                                    />
                                    <Label className="cursor-pointer">{option}</Label>
                                </div>
                            ))}
                        </div>
                        <div>
                            <Label>その他（自由記述）</Label>
                            <Input
                                value={formData.current_actions_other}
                                onChange={(e) => setFormData({ ...formData, current_actions_other: e.target.value })}
                                placeholder="例：毎朝のジョギング"
                            />
                        </div>
                    </div>
                );

            case 'challenges':
                return (
                    <div className="space-y-3">
                        {CHALLENGES_OPTIONS.map(option => (
                            <button
                                key={option}
                                onClick={() => setFormData({ ...formData, challenges: option })}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    formData.challenges === option
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );

            case 'strengths':
                return (
                    <div className="space-y-3">
                        {STRENGTHS_OPTIONS.map(option => (
                            <button
                                key={option}
                                onClick={() => setFormData({ ...formData, strengths: option })}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    formData.strengths === option
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );

            case 'weaknesses':
                return (
                    <div className="space-y-3">
                        {WEAKNESSES_OPTIONS.map(option => (
                            <button
                                key={option}
                                onClick={() => setFormData({ ...formData, weaknesses: option })}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    formData.weaknesses === option
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );

            case 'yearly_goal':
                return (
                    <div className="space-y-3">
                        {YEARLY_GOAL_OPTIONS.map(option => (
                            <button
                                key={option}
                                onClick={() => setFormData({ ...formData, yearly_goal: option })}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    formData.yearly_goal === option
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Progress */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">
                                質問 {currentStep + 1} / {STEPS.length}
                            </span>
                            <span className="text-sm text-gray-500">
                                {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {STEPS[currentStep].title}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {STEPS[currentStep].description}
                        </p>
                        {renderStepContent()}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === 0 || loading}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            戻る
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={!isStepValid() || loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    生成中...
                                </>
                            ) : currentStep === STEPS.length - 1 ? (
                                <>
                                    完了してクイズへ
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            ) : (
                                <>
                                    次へ
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}