import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

const GENRES = [
    { key: 'マーケ', label: '📣 マーケ・ブランディング' },
    { key: '営業', label: '💼 営業・セールス' },
    { key: 'アイデア', label: '💡 アイデア・差別化' },
    { key: '人間関係', label: '🤝 人間関係・コミュニケーション' },
    { key: '習慣', label: '⏰ 習慣・仕事術' },
    { key: 'マインドセット', label: '🧠 マインドセット' },
];

const STEPS = { GENRE: 'genre', QUESTION: 'question', RESULT: 'result' };

export default function DeepDiagnosis() {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.GENRE);
    const [user, setUser] = useState(null);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [options, setOptions] = useState({});
    const [currentNode, setCurrentNode] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [tagScores, setTagScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [visitedNodeIds, setVisitedNodeIds] = useState(new Set());

    useEffect(() => {
        base44.auth.me().then(setUser);
    }, []);

    // ジャンル選択後、即1問目へ
    const handleGenreSelect = async (genre) => {
        setSelectedGenre(genre);
        setLoading(true);
        try {
            const [genreNodes, allOptions] = await Promise.all([
                base44.entities.DiagnosisNode.filter({ genre, is_active: true }, 'order', 200),
                base44.entities.DiagnosisOption.list('order', 1000),
            ]);

            const optionMap = {};
            allOptions.forEach(opt => {
                if (!optionMap[opt.node_id]) optionMap[opt.node_id] = [];
                optionMap[opt.node_id].push(opt);
            });
            setOptions(optionMap);
            setNodes(genreNodes);

            // ルートノード = どの選択肢からも参照されていないノード
            const referencedIds = new Set(allOptions.map(o => o.next_node_id).filter(Boolean));
            const rootNodes = genreNodes.filter(n => !referencedIds.has(n.id)).sort((a, b) => (a.order || 0) - (b.order || 0));
            const firstNode = rootNodes[0] || genreNodes[0] || null;

            if (!firstNode) {
                setLoading(false);
                setStep(STEPS.QUESTION);
                return;
            }

            setCurrentNode(firstNode);
            setAnswers([]);
            setTagScores({});
            setVisitedNodeIds(new Set([firstNode.id]));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
        setStep(STEPS.QUESTION);
    };

    // 選択肢を選んだ時（分岐式）
    const handleOptionSelect = async (option) => {
        const newScores = { ...tagScores };
        (option.tag_effects || []).forEach(({ tag, delta }) => {
            newScores[tag] = (newScores[tag] || 0) + (delta || 1);
        });
        setTagScores(newScores);

        const newAnswers = [
            ...answers,
            { node_id: currentNode.id, option_key: option.option_key, option_text: option.option_text }
        ];
        setAnswers(newAnswers);

        const nextNodeId = option.next_node_id;

        // 終点 or 上限超過
        if (!nextNodeId || newAnswers.length >= 10) {
            await saveSession(newAnswers, newScores);
            return;
        }

        // ループ防止
        if (visitedNodeIds.has(nextNodeId)) {
            await saveSession(newAnswers, newScores);
            return;
        }

        const nextNode = nodes.find(n => n.id === nextNodeId) || null;
        if (!nextNode || nextNode.node_type === 'end') {
            await saveSession(newAnswers, newScores);
            return;
        }

        setVisitedNodeIds(prev => new Set([...prev, nextNodeId]));
        setCurrentNode(nextNode);
    };

    const saveSession = async (answersData, scores) => {
        setSaving(true);
        try {
            const result_tags = Object.entries(scores).map(([tag, score]) => ({ tag, score }));

            if (user) {
                // 既存の is_latest を false に
                const prevSessions = await base44.entities.DiagnosisSession.filter(
                    { user_id: user.id, is_latest: true }
                );
                for (const s of prevSessions) {
                    await base44.entities.DiagnosisSession.update(s.id, { is_latest: false });
                }

                // セッションを保存
                const session = await base44.entities.DiagnosisSession.create({
                    user_id: user.id,
                    genre: selectedGenre,
                    answers: answersData,
                    result_tags,
                    is_latest: true,
                });

                // AIおすすめを生成してセッションに保存
                const recResult = await base44.functions.invoke('generateRecommendations', {});
                if (recResult?.data?.recommendations) {
                    await base44.entities.DiagnosisSession.update(session.id, {
                        recommended_books: recResult.data.recommendations
                    });
                }
            }
            setStep(STEPS.RESULT);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const currentOptions = currentNode ? (options[currentNode.id] || []).sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    const progress = Math.min((answers.length / 10) * 100, 95);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-2xl mx-auto">

                {/* ヘッダー */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => {
                            if (step === STEPS.GENRE) navigate(createPageUrl('home'));
                            else if (step === STEPS.QUESTION) setStep(STEPS.GENRE);
                        }}
                        className="p-2 rounded-xl hover:bg-white text-gray-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">おすすめ精度を上げる診断</h1>
                        <p className="text-sm text-gray-500">診断するたびにおすすめが最適化されます</p>
                    </div>
                </div>

                {/* ジャンル選択 */}
                {step === STEPS.GENRE && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-6">どのジャンルで悩んでいますか？</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {GENRES.map(g => (
                                <button
                                    key={g.key}
                                    onClick={() => handleGenreSelect(g.key)}
                                    className="p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:shadow-md transition-all text-left font-medium text-gray-700"
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 質問ステップ */}
                {step === STEPS.QUESTION && (
                    <div>
                        {/* プログレスバー */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-500 mb-2">
                                <span>{selectedGenre}</span>
                                <span>Q{answers.length + 1}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                                <div
                                    className="h-2 bg-indigo-500 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {loading || saving ? (
                            <div className="text-center py-12 text-gray-500">処理中...</div>
                        ) : currentNode ? (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-8 leading-relaxed">
                                    {currentNode.prompt}
                                </h2>
                                <div className="space-y-3">
                                    {currentOptions.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">選択肢が登録されていません</div>
                                    ) : (
                                        currentOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleOptionSelect(opt)}
                                                className="w-full p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-center gap-4"
                                            >
                                                <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                                                    {opt.option_key}
                                                </span>
                                                <span className="text-gray-800">{opt.option_text}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* 完了 */}
                {step === STEPS.RESULT && (
                    <div className="text-center py-8">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">診断完了！</h2>
                        <p className="text-gray-600 mb-8">
                            診断結果を元に、おすすめの本が更新されました。<br />
                            ホームに戻って確認してみましょう。
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={() => navigate(createPageUrl('home'))}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                ホームへ <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setStep(STEPS.GENRE);
                                    setSelectedGenre(null);
                                    setSelectedProblem(null);
                                    setAnswers([]);
                                    setTagScores({});
                                    setCurrentNode(null);
                                }}
                            >
                                もう一度診断する
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}