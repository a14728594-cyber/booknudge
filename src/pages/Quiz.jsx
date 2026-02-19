import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, RefreshCw, Clock } from 'lucide-react';
import Card from '@/components/common/Card';
import SubscriptionGuard from '@/components/common/SubscriptionGuard';

export default function Quiz() {
    return (
        <SubscriptionGuard pagePath="/quiz">
            <QuizPageContent />
        </SubscriptionGuard>
    );
}

function QuizPageContent() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    const [currentQuizSet, setCurrentQuizSet] = useState(null);
    const [currentQuestions, setCurrentQuestions] = useState([]);
    const [pastQuizSets, setPastQuizSets] = useState([]);
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [sliderValue, setSliderValue] = useState(50);
    const [requestText, setRequestText] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            // オンボーディング未完了ならリダイレクト
            const users = await base44.entities.User.filter({ id: userData.id });
            if (users.length > 0 && !users[0].onboarding_completed) {
                navigate(createPageUrl('onboarding'));
                return;
            }

            // アクティブなクイズセットを取得
            const activeQuizSets = await base44.entities.QuizSet.filter({
                user_id: userData.id,
                is_active: true
            });

            if (activeQuizSets.length > 0) {
                const quizSet = activeQuizSets[0];
                setCurrentQuizSet(quizSet);
                await loadQuestions(quizSet.id);
            }

            // 過去のクイズセット一覧を取得
            const allQuizSets = await base44.entities.QuizSet.filter({
                user_id: userData.id
            });
            setPastQuizSets(allQuizSets.sort((a, b) => 
                new Date(b.created_date) - new Date(a.created_date)
            ));

        } catch (error) {
            console.error('Failed to load quiz:', error);
        }
        setLoading(false);
    };

    const loadQuestions = async (quizSetId) => {
        const questions = await base44.entities.QuizQuestion.filter({
            quiz_set_id: quizSetId
        });
        setCurrentQuestions(questions.sort((a, b) => a.order_index - b.order_index));
        setCurrentQuestionIndex(0);
        setSliderValue(50);
    };

    const handleGenerateQuiz = async () => {
        setGenerating(true);
        try {
            await base44.functions.invoke('generateQuizSet', {
                request_text: requestText || null
            });
            setRequestText('');
            await loadData();
        } catch (error) {
            console.error('Failed to generate quiz:', error);
            alert('クイズの生成に失敗しました');
        }
        setGenerating(false);
    };

    const handleNext = () => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSliderValue(50);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            setSliderValue(50);
        }
    };

    const handleSelectPastQuiz = async (quizSet) => {
        setCurrentQuizSet(quizSet);
        await loadQuestions(quizSet.id);
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

            <Tabs defaultValue="current" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="current">今回のクイズ</TabsTrigger>
                    <TabsTrigger value="past">過去のクイズ</TabsTrigger>
                </TabsList>

                {/* 今回のクイズ */}
                <TabsContent value="current" className="space-y-6">
                    {currentQuizSet && currentQuestions.length > 0 ? (
                        <>
                            <Card>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                        <span>質問 {currentQuestionIndex + 1} / {currentQuestions.length}</span>
                                        <span>{currentQuizSet.title}</span>
                                    </div>

                                    {currentQuestions[currentQuestionIndex]?.question_json?.case_study && (
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                            <p className="text-sm text-blue-900">
                                                {currentQuestions[currentQuestionIndex].question_json.case_study}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            {currentQuestions[currentQuestionIndex]?.question_json?.question_text}
                                        </h3>

                                        <div className="space-y-4">
                                            <Slider
                                                value={[sliderValue]}
                                                onValueChange={(value) => setSliderValue(value[0])}
                                                min={0}
                                                max={100}
                                                step={1}
                                            />
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>{currentQuestions[currentQuestionIndex]?.question_json?.slider_label_left || '0'}</span>
                                                <span className="font-semibold text-indigo-600">{sliderValue}</span>
                                                <span>{currentQuestions[currentQuestionIndex]?.question_json?.slider_label_right || '100'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={handlePrevious}
                                            disabled={currentQuestionIndex === 0}
                                        >
                                            前へ
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={currentQuestionIndex === currentQuestions.length - 1}
                                        >
                                            次へ
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* リクエスト欄 */}
                            <Card>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900">
                                        クイズを再生成する
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        希望のクイズ形式やテーマがあれば入力してください（任意）
                                    </p>
                                    <Input
                                        value={requestText}
                                        onChange={(e) => setRequestText(e.target.value)}
                                        placeholder="例：マーケティング寄りの内容で、実践的なケースを多めに"
                                    />
                                    <Button
                                        onClick={handleGenerateQuiz}
                                        disabled={generating}
                                        className="w-full"
                                    >
                                        {generating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                生成中...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                新しいクイズを生成
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <div className="text-center py-12 space-y-4">
                                <p className="text-gray-600">まだクイズがありません</p>
                                <Button onClick={handleGenerateQuiz} disabled={generating}>
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            生成中...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            最初のクイズを生成
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}
                </TabsContent>

                {/* 過去のクイズ */}
                <TabsContent value="past">
                    <div className="space-y-4">
                        {pastQuizSets.length > 0 ? (
                            pastQuizSets.map(quizSet => (
                                <Card
                                    key={quizSet.id}
                                    className="cursor-pointer hover:border-indigo-300 transition-colors"
                                    onClick={() => handleSelectPastQuiz(quizSet)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {quizSet.title}
                                            </h3>
                                            {quizSet.request_text && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {quizSet.request_text}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            {new Date(quizSet.created_date).toLocaleDateString('ja-JP')}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <p className="text-center text-gray-600 py-8">
                                    過去のクイズはまだありません
                                </p>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}