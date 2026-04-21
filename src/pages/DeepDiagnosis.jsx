import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

const STEPS = { GENRE: 'genre', QUESTION: 'question' };

export default function DeepDiagnosis() {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.GENRE);
    const [user, setUser] = useState(null);
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [nodes, setNodes] = useState([]);       // order順の質問リスト
    const [optionMap, setOptionMap] = useState({}); // node_id -> options[]
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [typeScores, setTypeScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => {});
        loadGenres();
    }, []);

    const loadGenres = async () => {
        const gs = await base44.entities.Genre.filter({ is_active: true }, 'order', 100);
        setGenres(gs);
    };

    const handleGenreSelect = async (genreName) => {
        setSelectedGenre(genreName);
        setLoading(true);
        const [genreNodes, allOptions] = await Promise.all([
            base44.entities.DiagnosisNode.filter({ genre: genreName, is_active: true }, 'order', 200),
            base44.entities.DiagnosisOption.list('order', 1000),
        ]);

        const map = {};
        allOptions.forEach(opt => {
            if (!map[opt.node_id]) map[opt.node_id] = [];
            map[opt.node_id].push(opt);
        });

        setNodes(genreNodes);
        setOptionMap(map);
        setCurrentIndex(0);
        setAnswers([]);
        setTypeScores({});
        setLoading(false);
        setStep(STEPS.QUESTION);
    };

    const currentNode = nodes[currentIndex] || null;
    const currentOptions = currentNode
        ? (optionMap[currentNode.id] || []).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    const handleOptionSelect = async (option) => {
        const nodeWeight = currentNode?.weight ?? 1;

        // スコア加算
        const newScores = { ...typeScores };
        (option.type_scores || []).forEach(({ type_key, score }) => {
            if (type_key) newScores[type_key] = (newScores[type_key] || 0) + ((score || 1) * nodeWeight);
        });
        setTypeScores(newScores);

        const newAnswers = [
            ...answers,
            {
                node_id: currentNode.id,
                option_key: option.option_key,
                option_text: option.option_text,
            }
        ];
        setAnswers(newAnswers);

        const nextIndex = currentIndex + 1;

        if (nextIndex >= nodes.length) {
            // 全質問終了
            await saveSession(newAnswers, newScores);
        } else {
            setCurrentIndex(nextIndex);
        }
    };

    const saveSession = async (answersData, scores) => {
        setSaving(true);
        const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
        const mainType = sortedScores[0]?.[0] || null;
        const subType = sortedScores[1]?.[0] || null;
        const typeScoresArray = sortedScores.map(([type_key, score]) => ({ type_key, score }));

        if (user) {
            const prevSessions = await base44.entities.DiagnosisSession.filter({ user_id: user.id, is_latest: true });
            await Promise.all(prevSessions.map(s =>
                base44.entities.DiagnosisSession.update(s.id, { is_latest: false })
            ));
            const session = await base44.entities.DiagnosisSession.create({
                user_id: user.id,
                genre: selectedGenre,
                answers: answersData,
                type_scores: typeScoresArray,
                main_type: mainType,
                sub_type: subType,
                is_latest: true,
            });
            navigate(createPageUrl('DiagnosisResult') + `?sessionId=${session.id}`);
        } else {
            const params = mainType
                ? `?main_type=${encodeURIComponent(mainType)}${subType ? `&sub_type=${encodeURIComponent(subType)}` : ''}`
                : '';
            navigate(createPageUrl('DiagnosisResult') + params);
        }
        setSaving(false);
    };

    const totalQuestions = nodes.length;
    const progress = totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-10">
                    <button
                        onClick={() => {
                            if (step === STEPS.GENRE) navigate(createPageUrl('home'));
                            else setStep(STEPS.GENRE);
                        }}
                        className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">深掘り診断</h1>
                        <p className="text-xs text-gray-400 mt-0.5">あなたにぴったりの本を見つけます</p>
                    </div>
                </div>

                {/* ジャンル選択 */}
                {step === STEPS.GENRE && (
                    <div>
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-snug">今、どんなことで<br />悩んでいますか？</h2>
                            <p className="text-sm text-gray-400">最も近いテーマを選んでください</p>
                        </div>
                        {genres.length === 0 ? (
                            <p className="text-center text-gray-400 py-12">ジャンルがまだ登録されていません</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {genres.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => handleGenreSelect(g.name)}
                                        className="group relative p-5 bg-white rounded-2xl border border-gray-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left"
                                    >
                                        <div className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors leading-tight">
                                            {g.name}
                                        </div>
                                        <div className="mt-2 w-5 h-0.5 bg-gray-200 group-hover:bg-indigo-400 group-hover:w-8 transition-all duration-300 rounded-full" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 質問ステップ */}
                {step === STEPS.QUESTION && (
                    <div>
                        {/* Progress */}
                        <div className="mb-10">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-indigo-600 text-sm">{selectedGenre}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                                    {currentIndex + 1} / {totalQuestions}問
                                </span>
                            </div>
                            <div className="flex gap-1.5">
                                {nodes.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                                            i < currentIndex
                                                ? 'bg-indigo-500'
                                                : i === currentIndex
                                                ? 'bg-gradient-to-r from-indigo-500 to-violet-400'
                                                : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {loading || saving ? (
                            <div className="flex flex-col items-center py-24 text-gray-400 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                <p className="text-sm">{saving ? '結果を集計しています...' : '読み込み中...'}</p>
                            </div>
                        ) : currentNode ? (
                            <div>
                                {(currentNode.question_style === 'scenario' || currentNode.question_style === 'projection') && (
                                    <div className="mb-3 inline-flex items-center gap-1.5 bg-violet-50 text-violet-600 text-xs font-medium px-3 py-1.5 rounded-full border border-violet-200">
                                        💭 想像してみてください
                                    </div>
                                )}
                                <h2 className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">
                                    {currentNode.prompt}
                                </h2>
                                <div className="space-y-3">
                                    {currentOptions.length === 0 ? (
                                        <p className="text-center py-8 text-gray-400">選択肢が登録されていません</p>
                                    ) : (
                                        currentOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleOptionSelect(opt)}
                                                className="group w-full bg-white hover:bg-indigo-600 rounded-2xl border border-gray-200 hover:border-indigo-600 hover:shadow-lg p-4 text-left flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5"
                                            >
                                                <span className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-white/20 text-gray-600 group-hover:text-white font-bold flex items-center justify-center text-sm flex-shrink-0 transition-colors">
                                                    {opt.option_key}
                                                </span>
                                                <span className="text-sm leading-relaxed text-gray-700 group-hover:text-white transition-colors">{opt.option_text}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-400">
                                <p className="mb-4">このジャンルの質問がまだ登録されていません</p>
                                <Button variant="outline" onClick={() => setStep(STEPS.GENRE)}>
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