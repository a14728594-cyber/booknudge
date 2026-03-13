import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, BookOpen, RotateCcw } from 'lucide-react';

const STEPS = { GENRE: 'genre', QUESTION: 'question', RESULT: 'result' };

const ROLE_CONFIG = {
    priority: { emoji: '⭐', label: 'まずこれを読む', bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
    perspective: { emoji: '🔭', label: '視点を広げる', bgClass: 'bg-blue-50', textClass: 'text-blue-700' },
    action: { emoji: '⚡', label: '行動に落とす', bgClass: 'bg-green-50', textClass: 'text-green-700' },
};

export default function DiagnosisFlow({ onClose, hideClose }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.GENRE);
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [optionMap, setOptionMap] = useState({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [typeScores, setTypeScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mainTypeInfo, setMainTypeInfo] = useState(null);
    const [subTypeInfo, setSubTypeInfo] = useState(null);
    const [books, setBooks] = useState([]);

    useEffect(() => {
        base44.entities.Genre.filter({ is_active: true }, 'order', 100).then(setGenres).catch(() => {});
    }, []);

    const handleGenreSelect = async (genreName) => {
        setSelectedGenre(genreName);
        setLoading(true);
        const genreNodes = await base44.entities.DiagnosisNode.filter({ genre: genreName, is_active: true }, 'order', 200);
        const nodeIds = genreNodes.map(n => n.id);
        const map = {};
        if (nodeIds.length > 0) {
            const allOptions = await Promise.all(
                nodeIds.map(nid => base44.entities.DiagnosisOption.filter({ node_id: nid }, 'order', 50))
            );
            nodeIds.forEach((nid, i) => { map[nid] = allOptions[i]; });
        }
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
        const newScores = { ...typeScores };
        (option.type_scores || []).forEach(({ type_key, score }) => {
            if (type_key) newScores[type_key] = (newScores[type_key] || 0) + ((score || 1) * nodeWeight);
        });
        setTypeScores(newScores);
        const newAnswers = [...answers, { node_id: currentNode.id, option_key: option.option_key, option_text: option.option_text }];
        setAnswers(newAnswers);
        if (currentIndex + 1 >= nodes.length) {
            await finishDiagnosis(newAnswers, newScores);
        } else {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const finishDiagnosis = async (answersData, scores) => {
        setSaving(true);
        const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
        const mainType = sortedScores[0]?.[0] || null;
        const subType = sortedScores[1]?.[0] || null;

        try {
            const user = await base44.auth.me();
            if (user) {
                const prevSessions = await base44.entities.DiagnosisSession.filter({ user_id: user.id, is_latest: true });
                await Promise.all(prevSessions.map(s => base44.entities.DiagnosisSession.update(s.id, { is_latest: false })));
                await base44.entities.DiagnosisSession.create({
                    user_id: user.id,
                    genre: selectedGenre,
                    answers: answersData,
                    type_scores: sortedScores.map(([type_key, score]) => ({ type_key, score })),
                    main_type: mainType,
                    sub_type: subType,
                    is_latest: true,
                });
            }
        } catch (e) { /* 未ログイン */ }

        const [mainInfo, subInfo] = await Promise.all([
            mainType ? fetchTypeInfo(mainType) : Promise.resolve(null),
            subType ? fetchTypeInfo(subType) : Promise.resolve(null),
        ]);
        setMainTypeInfo(mainInfo);
        setSubTypeInfo(subInfo);

        if (mainType) {
            const [mainMappings, subMappings, allBooks] = await Promise.all([
                base44.entities.BookDiagnosisMapping.filter({ diagnosis_type_key: mainType }, 'priority_order', 20),
                subType ? base44.entities.BookDiagnosisMapping.filter({ diagnosis_type_key: subType }, 'priority_order', 10) : Promise.resolve([]),
                base44.entities.Book.list('-created_date', 300),
            ]);
            const bookMap = {};
            allBooks.forEach(b => { bookMap[b.id] = b; });
            const mainBooks = mainMappings
                .filter(m => bookMap[m.book_id])
                .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0))
                .slice(0, 2)
                .map(m => ({ ...bookMap[m.book_id], _mapping: m }));
            const mainBookIds = new Set(mainBooks.map(b => b.id));
            const subBooks = subMappings
                .filter(m => bookMap[m.book_id] && !mainBookIds.has(m.book_id))
                .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0))
                .slice(0, 1)
                .map(m => ({ ...bookMap[m.book_id], _mapping: m, _isSubType: true }));
            setBooks([...mainBooks, ...subBooks].slice(0, 3));
        }

        setSaving(false);
        setStep(STEPS.RESULT);
    };

    const fetchTypeInfo = async (typeKey) => {
        try {
            const types = await base44.entities.DiagnosisResultType.filter({ key: typeKey }, 'order', 1);
            return types[0] || null;
        } catch { return null; }
    };

    const reset = () => {
        setStep(STEPS.GENRE);
        setSelectedGenre(null);
        setNodes([]);
        setOptionMap({});
        setCurrentIndex(0);
        setAnswers([]);
        setTypeScores({});
        setMainTypeInfo(null);
        setSubTypeInfo(null);
        setBooks([]);
    };

    const handleGoHome = async () => {
        try {
            await base44.auth.me();
            window.location.href = createPageUrl('home');
        } catch {
            base44.auth.redirectToLogin(createPageUrl('home'));
        }
    };

    const totalQuestions = nodes.length;
    const progress = totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;
    const priorityBook = books.find(b => b._mapping?.role === 'priority') || books[0];
    const otherBooks = books.filter(b => b.id !== priorityBook?.id);

    return (
        <div className="min-h-screen bg-gray-50 overflow-y-auto">
            <div className="max-w-xl mx-auto px-4 py-10 pb-20">
                {/* Header */}
                <div className="flex items-center gap-3 mb-10">
                    <button
                        onClick={() => {
                            if (step === STEPS.GENRE) { if (!hideClose && onClose) onClose(); }
                            else if (step === STEPS.QUESTION) setStep(STEPS.GENRE);
                            else reset();
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
                                        <div className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors leading-tight">{g.name}</div>
                                        <div className="mt-2 w-5 h-0.5 bg-gray-200 group-hover:bg-indigo-400 group-hover:w-8 transition-all duration-300 rounded-full" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 質問 */}
                {step === STEPS.QUESTION && (
                    <div>
                        <div className="mb-10">
                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                <span className="font-semibold text-indigo-600 text-sm">{selectedGenre}</span>
                                <span>{currentIndex + 1} / {totalQuestions}</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {loading || saving ? (
                            <div className="flex flex-col items-center py-24 text-gray-400 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                <p className="text-sm">{saving ? '結果を集計しています...' : '読み込み中...'}</p>
                            </div>
                        ) : currentNode ? (
                            <div>
                                {currentNode.weight > 1 && (
                                    <div className="mb-4 inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
                                        ⭐ 重要な質問
                                    </div>
                                )}
                                <h2 className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">{currentNode.prompt}</h2>
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
                                <Button variant="outline" onClick={() => setStep(STEPS.GENRE)}>ジャンル選択に戻る</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 結果 */}
                {step === STEPS.RESULT && (
                    <div>
                        {mainTypeInfo ? (
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white mb-6">
                                <div className="text-4xl mb-3">{mainTypeInfo.emoji || '🎯'}</div>
                                <p className="text-indigo-200 text-sm mb-2">あなたは今...</p>
                                <h2 className="text-3xl font-bold mb-4">{mainTypeInfo.label}</h2>
                                <p className="text-indigo-100 text-base leading-relaxed mb-4">{mainTypeInfo.description}</p>
                                {mainTypeInfo.direction && (
                                    <div className="bg-white/20 rounded-2xl p-4 mb-4">
                                        <p className="text-white font-semibold text-sm">💡 今必要なこと</p>
                                        <p className="text-indigo-100 text-sm mt-1">{mainTypeInfo.direction}</p>
                                    </div>
                                )}
                                <div className="flex gap-3 mt-2">
                                    <Button onClick={reset} variant="outline" className="flex-1 gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                                        <RotateCcw className="w-4 h-4" />
                                        もう一度
                                    </Button>
                                    <Button onClick={handleGoHome} className="flex-1 bg-white text-indigo-700 hover:bg-indigo-50 gap-2 font-bold">
                                        ホームへ
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-3xl p-8 text-white mb-6">
                                <div className="text-4xl mb-3">📊</div>
                                <h2 className="text-2xl font-bold mb-4">診断が完了しました</h2>
                                <p className="text-gray-200 text-sm mb-4">管理者が診断タイプを設定すると、ここに詳細が表示されます。</p>
                                <div className="flex gap-3">
                                    <Button onClick={reset} variant="outline" className="flex-1 gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                                        <RotateCcw className="w-4 h-4" />
                                        もう一度
                                    </Button>
                                    <Button onClick={handleGoHome} className="flex-1 bg-white text-gray-700 hover:bg-gray-50 gap-2 font-bold">
                                        ホームへ
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {subTypeInfo && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                                <span className="text-2xl">{subTypeInfo.emoji || '📌'}</span>
                                <div>
                                    <p className="text-xs text-gray-500">サブタイプ</p>
                                    <p className="font-semibold text-gray-800">{subTypeInfo.label}</p>
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-5">あなたへのおすすめ本</h3>
                            {books.length > 0 ? (
                                <div className="space-y-4">
                                    {priorityBook && (
                                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-amber-500 text-lg">⭐</span>
                                                <span className="text-amber-700 font-bold text-sm">迷ったらまずこれ</span>
                                            </div>
                                            <BookCard book={priorityBook} onNavigate={(id) => navigate(createPageUrl('Book') + `?id=${id}`)} />
                                        </div>
                                    )}
                                    {otherBooks.map(book => (
                                        <div key={book.id} className={`bg-white border rounded-2xl p-5 ${book._isSubType ? 'border-purple-200' : 'border-gray-100'}`}>
                                            {book._isSubType && subTypeInfo && (
                                                <div className="flex items-center gap-1 mb-3">
                                                    <span className="text-purple-500 text-sm">📌</span>
                                                    <span className="text-purple-700 text-xs font-medium">{subTypeInfo.label}にも対応</span>
                                                </div>
                                            )}
                                            <BookCard book={book} onNavigate={(id) => navigate(createPageUrl('Book') + `?id=${id}`)} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 font-medium mb-1">このタイプの本はまだ登録されていません</p>
                                    <p className="text-gray-400 text-sm">管理者が本を追加するまでお待ちください</p>
                                </div>
                            )}
                        </div>

                        
                    </div>
                )}
            </div>
        </div>
    );
}

function BookCard({ book, onNavigate }) {
    const roleInfo = book._mapping?.role ? ROLE_CONFIG[book._mapping.role] : null;
    const recText = book._mapping?.recommendation_text;

    return (
        <div>
            <button
                onClick={() => onNavigate(book.id)}
                className="w-full text-left flex gap-4 hover:opacity-80 transition-opacity"
            >
                {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-sm" />
                ) : (
                    <div className="w-16 h-24 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    {roleInfo && (
                        <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full mb-2 ${roleInfo.bgClass} ${roleInfo.textClass}`}>
                            <span>{roleInfo.emoji}</span>
                            <span>{roleInfo.label}</span>
                        </div>
                    )}
                    <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{book.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{(book.authors || []).join(', ')}</p>
                    {recText && <p className="text-xs text-gray-600 leading-relaxed">{recText}</p>}
                </div>
            </button>
            {book.amazon_url && (
                <a
                    href={book.amazon_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold text-sm py-2.5 px-4 rounded-xl transition-colors"
                >
                    Amazonで見る
                </a>
            )}
        </div>
    );
}