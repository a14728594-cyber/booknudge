import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import DomainBadge from '@/components/common/DomainBadge';
import Card from '@/components/common/Card';
import { Loader2, Sparkles, User } from 'lucide-react';

const domains = [
    { id: 'sales', label: 'セールス' },
    { id: 'marketing', label: 'マーケティング' },
    { id: 'relationships', label: '人間関係' },
    { id: 'mindset', label: 'マインドセット' },
    { id: 'habits', label: '習慣' }
];

export default function Quiz() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('today');
    
    // Today's Question
    const [step, setStep] = useState('select');
    const [selectedDomain, setSelectedDomain] = useState('');
    const [question, setQuestion] = useState(null);
    const [sliderValue, setSliderValue] = useState([50]);
    const [reasonText, setReasonText] = useState('');
    const [shareEnabled, setShareEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    // Timeline
    const [sharedAnswers, setSharedAnswers] = useState([]);
    const [domainFilter, setDomainFilter] = useState('all');
    const [questionFilter, setQuestionFilter] = useState('all');
    const [questions, setQuestions] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'timeline') {
            loadTimeline();
        }
    }, [activeTab, domainFilter, questionFilter]);

    const loadTimeline = async () => {
        setTimelineLoading(true);
        try {
            let filter = {};
            if (domainFilter !== 'all') {
                filter.domain = domainFilter;
            }
            if (questionFilter !== 'all') {
                filter.question_id = questionFilter;
            }

            const answers = await base44.entities.SharedAnswer.filter(filter, '-created_date', 100);
            setSharedAnswers(answers);

            // 問題ID一覧を取得（フィルタ用）
            if (domainFilter !== 'all') {
                const uniqueQuestions = [...new Set(answers.map(a => a.question_id))];
                setQuestions(uniqueQuestions);
            }
        } catch (error) {
            console.error('Error loading timeline:', error);
        } finally {
            setTimelineLoading(false);
        }
    };

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

            // 共有が有効な場合、SharedAnswerも作成
            if (shareEnabled) {
                await base44.entities.SharedAnswer.create({
                    user_id: user.id,
                    domain: question.domain,
                    question_id: question.question_id,
                    question_text: question.question_text,
                    shared_slider_value: sliderValue[0],
                    visibility: user.default_share_level || 'anonymous'
                });
            }

            // イベント記録
            await base44.functions.invoke('trackEvent', {
                event_name: 'quiz_answer',
                event_value: {
                    domain: question.domain,
                    question_id: question.question_id,
                    slider_value: sliderValue[0],
                    shared: shareEnabled
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

    if (loading && step !== 'question') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">問題を生成中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="today">今日の1問</TabsTrigger>
                        <TabsTrigger value="timeline">みんなの回答</TabsTrigger>
                    </TabsList>

                    {/* Today's Question Tab */}
                    <TabsContent value="today">
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

                                <div className="mb-6">
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

                                <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="share-toggle" className="font-medium text-gray-900 cursor-pointer">
                                                スライダー値をみんなに共有する
                                            </Label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                共有されるのはスライダー値のみです（理由は非公開）
                                            </p>
                                        </div>
                                        <Switch
                                            id="share-toggle"
                                            checked={shareEnabled}
                                            onCheckedChange={setShareEnabled}
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={!reasonText.trim() || loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg rounded-xl"
                                >
                                    {loading ? '送信中...' : '回答を送信'}
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline">
                        <div className="space-y-6">
                            <Card>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Select value={domainFilter} onValueChange={setDomainFilter}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="ジャンルで絞り込み" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全てのジャンル</SelectItem>
                                            {domains.map(d => (
                                                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {domainFilter !== 'all' && questions.length > 0 && (
                                        <Select value={questionFilter} onValueChange={setQuestionFilter}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder="問題で絞り込み" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">全ての問題</SelectItem>
                                                {questions.map(qid => (
                                                    <SelectItem key={qid} value={qid}>
                                                        {qid.substring(0, 20)}...
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </Card>

                            {timelineLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                </div>
                            ) : sharedAnswers.length > 0 ? (
                                <div className="space-y-4">
                                    {sharedAnswers.map(answer => (
                                        <Card key={answer.id}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {answer.visibility === 'nickname' ? '表示名' : '匿名'}
                                                        </span>
                                                        <DomainBadge domain={answer.domain} />
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(answer.created_date).toLocaleDateString('ja-JP')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 mb-3 line-clamp-2">
                                                        {answer.question_text}
                                                    </p>
                                                    <div className="bg-indigo-50 rounded-xl p-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                スライダー値
                                                            </span>
                                                            <span className="text-2xl font-bold text-indigo-600">
                                                                {answer.shared_slider_value}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-600">
                                    共有された回答がまだありません
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}