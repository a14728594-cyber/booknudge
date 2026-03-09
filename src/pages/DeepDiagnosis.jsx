import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
// diagnosisTypes は DiagnosisResult ページで使用

const GENRES = [
    { key: 'マーケティング', label: '📣 マーケ・ブランディング' },
    { key: '営業', label: '💼 営業・セールス' },
    { key: 'アイデア', label: '💡 アイデア・差別化' },
    { key: '人間関係', label: '🤝 人間関係・コミュニケーション' },
    { key: '習慣', label: '⏰ 習慣・仕事術' },
    { key: 'マインドセット', label: '🧠 マインドセット' },
];

const STEPS = { GENRE: 'genre', QUESTION: 'question' };

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
    const [resultType, setResultType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [visitedNodeIds, setVisitedNodeIds] = useState(new Set());

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
    }, []);

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
            const rootNodes = genreNodes
                .filter(n => !referencedIds.has(n.id))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            const firstNode = rootNodes[0] || genreNodes[0] || null;

            if (!firstNode) {
                setLoading(false);
                setStep(STEPS.QUESTION);
                return;
            }

            setCurrentNode(firstNode);
            setAnswers([]);
            setTagScores({});
            setResultType(null);
            setVisitedNodeIds(new Set([firstNode.id]));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
        setStep(STEPS.QUESTION);
    };

    const handleOptionSelect = async (option) => {
        // タグスコア更新
        const newScores = { ...tagScores };
        (option.tag_effects || []).forEach(({ tag, delta }) => {
            newScores[tag] = (newScores[tag] || 0) + (delta || 1);
        });
        setTagScores(newScores);

        // 結果タイプを追跡（設定されていれば上書き）
        const newResultType = option.result_type || resultType;
        setResultType(newResultType);

        const newAnswers = [
            ...answers,
            { node_id: currentNode.id, option_key: option.option_key, option_text: option.option_text }
        ];
        setAnswers(newAnswers);

        const nextNodeId = option.next_node_id;

        // 終点判定
        if (!nextNodeId || newAnswers.length >= 10) {
            await saveSession(newAnswers, newScores, newResultType);
            return;
        }
        if (visitedNodeIds.has(nextNodeId)) {
            await saveSession(newAnswers, newScores, newResultType);
            return;
        }

        const nextNode = nodes.find(n => n.id === nextNodeId) || null;
        if (!nextNode || nextNode.node_type === 'end') {
            await saveSession(newAnswers, newScores, newResultType);
            return;
        }

        setVisitedNodeIds(prev => new Set([...prev, nextNodeId]));
        setCurrentNode(nextNode);
    };

    const saveSession = async (answersData, scores, typeKey) => {
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

                const session = await base44.entities.DiagnosisSession.create({
                    user_id: user.id,
                    genre: selectedGenre,
                    answers: answersData,
                    result_tags,
                    result_type: typeKey || null,
                    is_latest: true,
                });

                navigate(createPageUrl('DiagnosisResult') + `?sessionId=${session.id}`);
            } else {
                // 未ログインの場合はタイプパラメータで遷移
                const params = typeKey ? `?type=${encodeURIComponent(typeKey)}` : '';
                navigate(createPageUrl('DiagnosisResult') + params);
            }
        } catch (e) {
            console.error(e);
            navigate(createPageUrl('DiagnosisResult'));
        } finally {
            setSaving(false);
        }
    };

    const currentOptions = currentNode
        ? (options[currentNode.id] || []).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    // プログレス: 最大5問想定（浅い分岐）
    const progress = Math.min((answers.length / 5) * 100, 95);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-2xl mx-auto">

                {/* ヘッダー */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => {
                            if (step === STEPS.GENRE) navigate(createPageUrl('home'));
                            else setStep(STEPS.GENRE);
                        }}
                        className="p-2 rounded-xl hover:bg-white text-gray-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">深掘り診断</h1>
                        <p className="text-sm text-gray-500">あなたにぴったりの本を見つけます</p>
                    </div>
                </div>

                {/* ジャンル選択 */}
                {step === STEPS.GENRE && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">今、どんなことで悩んでいますか？</h2>
                        <p className="text-sm text-gray-500 mb-6">最も近いジャンルを選んでください</p>
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
                        <div className="mb-8">
                            <div className="flex justify-between text-sm text-gray-500 mb-2">
                                <span className="font-medium text-indigo-600">{selectedGenre}</span>
                                <span>Q{answers.length + 1}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {loading || saving ? (
                            <div className="flex flex-col items-center py-16 text-gray-500 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                <p>{saving ? '結果を保存中...' : '読み込み中...'}</p>
                            </div>
                        ) : currentNode ? (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-8 leading-relaxed">
                                    {currentNode.prompt}
                                </h2>
                                <div className="space-y-3">
                                    {currentOptions.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            選択肢が登録されていません
                                        </div>
                                    ) : (
                                        currentOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleOptionSelect(opt)}
                                                className="w-full p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-center gap-4 group"
                                            >
                                                <span className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-sm flex-shrink-0 transition-colors">
                                                    {opt.option_key}
                                                </span>
                                                <span className="text-gray-800 text-sm leading-relaxed">{opt.option_text}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <p>このジャンルの質問がまだ登録されていません</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setStep(STEPS.GENRE)}
                                >
                                    ジャンル選択に戻る
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}