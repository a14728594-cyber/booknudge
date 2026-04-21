import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, BookOpen, RotateCcw, Share2, Copy, Check } from 'lucide-react';
import MagicLinkModal from '@/components/auth/MagicLinkModal';
import InlineRegistrationWall from '@/components/diagnosis/InlineRegistrationWall';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [matchedCases, setMatchedCases] = useState([]);
    const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
    const [sameTypeCount, setSameTypeCount] = useState(0);
    const [registeredJustNow, setRegisteredJustNow] = useState(false);

    useEffect(() => {
        base44.entities.Genre.filter({ is_active: true }, 'order', 100).then(setGenres).catch(() => {});
        base44.auth.me().then((user) => setIsLoggedIn(!!user)).catch(() => setIsLoggedIn(false));

        // 診断結果をsessionStorageから復元
        try {
            const saved = sessionStorage.getItem('diagnosisResult');
            if (saved) {
                const { mainTypeInfo, subTypeInfo, books, matchedCases, selectedGenre } = JSON.parse(saved);
                setMainTypeInfo(mainTypeInfo);
                setSubTypeInfo(subTypeInfo);
                setBooks(books);
                setMatchedCases(matchedCases);
                setSelectedGenre(selectedGenre);
                setStep(STEPS.RESULT);
            }
        } catch {}
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
                base44.entities.BookDiagnosisMapping.filter({ diagnosis_type_key: mainType }, 'priority_order', 30),
                subType ? base44.entities.BookDiagnosisMapping.filter({ diagnosis_type_key: subType }, 'priority_order', 15) : Promise.resolve([]),
                base44.entities.Book.list('-created_date', 500),
            ]);
            const bookMap = {};
            allBooks.forEach(b => { bookMap[b.id] = b; });

            // ビジネス書（direct）と小説・エッセイ（affinity）を分けて収集
            const allMappings = [...mainMappings, ...subMappings.map(m => ({ ...m, _isSubType: true }))];
            const seenIds = new Set();
            const businessBooks = [];
            const novelBooks = [];

            allMappings
                .filter(m => bookMap[m.book_id])
                .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
                .forEach(m => {
                    if (seenIds.has(m.book_id)) return;
                    const book = bookMap[m.book_id];
                    if (book.book_category === 'novel_essay') {
                        if (novelBooks.length < 2) { novelBooks.push({ ...book, _mapping: m, _isSubType: m._isSubType }); seenIds.add(m.book_id); }
                    } else {
                        if (businessBooks.length < 3) { businessBooks.push({ ...book, _mapping: m, _isSubType: m._isSubType }); seenIds.add(m.book_id); }
                    }
                });

            setBooks([...businessBooks, ...novelBooks]);

        // 診断タイプにマッチした事例を取得
        const allCases = await base44.entities.CaseStudy.filter({ is_published: true }, 'order', 100);
        const matched = allCases.filter(c =>
            (c.diagnosis_types || []).includes(mainType) ||
            (subType && (c.diagnosis_types || []).includes(subType))
        ).slice(0, 3);
        setMatchedCases(matched);
        }

        setSaving(false);
        setStep(STEPS.RESULT);

        // 同タイプの件数を取得（ソーシャルプルーフ用）
        if (mainType) {
            try {
                const sessions = await base44.entities.DiagnosisSession.filter({ main_type: mainType }, '-created_date', 500);
                setSameTypeCount(sessions.length);
            } catch {}
        }

        // localStorageに診断結果を保存（再訪時用）
        try {
            localStorage.setItem('lastDiagnosisResult', JSON.stringify({
                mainType, subType, savedAt: Date.now()
            }));
        } catch {}

        // イベント記録
        try {
            base44.functions.invoke('trackEvent', { event_name: 'diagnosis_complete', event_value: { main_type: mainType, genre: selectedGenre }, update_last_active: false }).catch(() => {});
            base44.functions.invoke('trackEvent', { event_name: 'registration_wall_view', event_value: { main_type: mainType }, update_last_active: false }).catch(() => {});
        } catch {}
    };

    const fetchTypeInfo = async (typeKey) => {
        try {
            const types = await base44.entities.DiagnosisResultType.filter({ key: typeKey }, 'order', 1);
            return types[0] || null;
        } catch { return null; }
    };

    const reset = () => {
        try { sessionStorage.removeItem('diagnosisResult'); } catch {}
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
        setMatchedCases([]);
    };

    // 結果が出たらsessionStorageに保存
    useEffect(() => {
        if (step === STEPS.RESULT && mainTypeInfo) {
            try {
                sessionStorage.setItem('diagnosisResult', JSON.stringify({
                    mainTypeInfo, subTypeInfo, books, matchedCases, selectedGenre
                }));
            } catch {}
        }
    }, [step, mainTypeInfo, subTypeInfo, books, matchedCases, selectedGenre]);

    const totalQuestions = nodes.length;
    const progress = totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;

    return (
        <>
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
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900 leading-none">深掘り診断</h1>
                        <p className="text-xs text-gray-400 mt-0.5">あなたにぴったりの本を見つけます</p>
                    </div>
                    {!isLoggedIn && (
                        <button
                            onClick={() => setShowMagicLinkModal(true)}
                            className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors px-4 py-2 rounded-lg hover:bg-indigo-50 border border-indigo-200"
                        >
                            ログイン
                        </button>
                    )}
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
                    <ResultSection
                        isLoggedIn={isLoggedIn}
                        registeredJustNow={registeredJustNow}
                        mainTypeInfo={mainTypeInfo}
                        subTypeInfo={subTypeInfo}
                        books={books}
                        matchedCases={matchedCases}
                        sameTypeCount={sameTypeCount}
                        selectedGenre={selectedGenre}
                        onReset={reset}
                        onNavigate={(path) => navigate(path)}
                        onRegistered={() => {
                            setIsLoggedIn(true);
                            setRegisteredJustNow(true);
                        }}
                    />
                )}
            </div>
        </div>
        {showMagicLinkModal && (
            <MagicLinkModal
                onClose={() => setShowMagicLinkModal(false)}
                onSuccess={() => {
                    setShowMagicLinkModal(false);
                    window.location.href = '/home';
                }}
            />
        )}
        </>
    );
}

function ResultSection({ isLoggedIn, registeredJustNow, mainTypeInfo, subTypeInfo, books, matchedCases, sameTypeCount, selectedGenre, onReset, onNavigate, onRegistered }) {
    const [copied, setCopied] = useState(false);

    // あるある項目（descriptionから最初の行、または仮テキスト）
    const painPoints = mainTypeInfo?.description
        ? mainTypeInfo.description.split('。').filter(s => s.trim().length > 3).slice(0, 3)
        : ['やるべきことは分かっているのに、なかなか動けない', '複数の施策に手を出しているが、どれも中途半端', '結果が出ない理由が自分でもわからない'];

    const xShareText = mainTypeInfo
        ? `📊 BookNudgeの診断結果\n\n${mainTypeInfo.emoji || ''} ${mainTypeInfo.label}\n\n「${mainTypeInfo.direction || ''}」\n\n#BookNudge #ビジネス書`
        : '';

    const handleCopyShare = () => {
        navigator.clipboard.writeText(xShareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    return (
        <div className="space-y-5">
            {/* ──── セクション1: リビール演出（全表示） ──── */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white">
                <div className="text-5xl mb-3 text-center">{mainTypeInfo?.emoji || '🎯'}</div>
                <p className="text-indigo-200 text-sm mb-1 text-center">あなたは今...</p>
                <h2 className="text-2xl font-bold mb-3 text-center">{mainTypeInfo?.label || '診断完了'}</h2>
                {mainTypeInfo?.direction && (
                    <p className="text-indigo-100 text-sm text-center italic leading-relaxed">「{mainTypeInfo.direction}」</p>
                )}
            </div>

            {/* ──── セクション2: あるある共感（1つ全表示 + 2つぼかし） ──── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wide">こんな状況、心当たりありませんか？</p>
                <div className="space-y-3">
                    {/* 1つ目: 全表示 */}
                    <div className="flex items-start gap-3">
                        <span className="text-indigo-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-sm text-gray-700">{painPoints[0]}</span>
                    </div>
                    {/* 2・3つ目: ぼかし（未ログイン）/ フェードイン（登録後） */}
                    {[1, 2].map(idx => (
                        <div key={idx} className="flex items-start gap-3">
                            <span className={`font-bold flex-shrink-0 mt-0.5 transition-colors duration-500 ${isLoggedIn ? 'text-indigo-500' : 'text-gray-300'}`}>✓</span>
                            {isLoggedIn ? (
                                <motion.span
                                    initial={registeredJustNow ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: idx * 0.2 }}
                                    className="text-sm text-gray-700"
                                >
                                    {painPoints[idx] || painPoints[0]}
                                </motion.span>
                            ) : (
                                <span className="text-sm text-transparent bg-gray-200 rounded select-none blur-sm">
                                    {painPoints[idx] || 'この項目はぼかし表示されています'}
                                </span>
                            )}
                        </div>
                    ))}
                    {!isLoggedIn && (
                        <p className="text-xs text-gray-400 pl-6 mt-1">残り2つのうち1つは、ほとんどの人が"これだ！"と言う項目です</p>
                    )}
                </div>
            </div>

            {/* ──── セクション3: ソーシャルプルーフ（全表示） ──── */}
            {sameTypeCount > 3 && (
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-indigo-700">
                        このタイプと診断された人: <span className="font-bold text-indigo-900">{sameTypeCount}人</span>
                    </p>
                </div>
            )}

            {/* ──── 登録の壁（未ログインのみ） ──── */}
            {!isLoggedIn && (
                <InlineRegistrationWall
                    mainTypeInfo={mainTypeInfo}
                    sameTypeCount={sameTypeCount}
                    onRegistered={onRegistered}
                />
            )}

            {/* ──── 登録済みコンテンツ（アニメーション表示） ──── */}
            <AnimatePresence>
            {isLoggedIn && (
                <motion.div
                    initial={registeredJustNow ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-5"
                >
                    {/* セクション5: 状態説明 */}
                    {mainTypeInfo?.description && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">あなたの状態</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{mainTypeInfo.description}</p>
                        </div>
                    )}

                    {/* セクション6: サブタイプ */}
                    {subTypeInfo && (
                        <div className="bg-white border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
                            <span className="text-2xl">{subTypeInfo.emoji || '📌'}</span>
                            <div>
                                <p className="text-xs text-gray-400">サブタイプ</p>
                                <p className="font-semibold text-gray-800">{subTypeInfo.label}</p>
                            </div>
                        </div>
                    )}

                    {/* セクション7: 明日からの一歩 */}
                    {mainTypeInfo?.direction && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                            <p className="text-xs text-green-600 font-semibold mb-2">💡 明日からできる具体的な一歩</p>
                            <p className="text-sm text-green-800 font-medium leading-relaxed">{mainTypeInfo.direction}</p>
                        </div>
                    )}

                    {/* セクション8: おすすめ本 */}
                    {books.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4">📚 あなたに合う本3冊</h3>
                            <div className="space-y-4">
                                {books.filter(b => b.book_category !== 'novel_essay').map((book, idx) => (
                                    <div key={book.id} className={`bg-white border rounded-2xl p-5 ${idx === 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
                                        {idx === 0 && (
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <span className="text-amber-500">⭐</span>
                                                <span className="text-amber-700 text-xs font-bold">迷ったらまずこれ</span>
                                            </div>
                                        )}
                                        <BookCard book={book} onNavigate={(id) => onNavigate(createPageUrl('Book') + `?id=${id}`)} />
                                    </div>
                                ))}
                                {books.filter(b => b.book_category === 'novel_essay').map(book => (
                                    <div key={book.id} className="bg-white border border-purple-100 rounded-2xl p-5">
                                        <NovelBookCard book={book} onNavigate={(id) => onNavigate(createPageUrl('Book') + `?id=${id}`)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* セクション9: 事例 + ストーリーゲーム導線 */}
                    {matchedCases.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">🏢 あなたに刺さる実例</h3>
                            <p className="text-xs text-gray-400 mb-4">同じ悩みを持つビジネスの事例です</p>
                            <div className="space-y-3">
                                {matchedCases.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => onNavigate(createPageUrl('CaseStudyDetail') + `?id=${c.id}`)}
                                        className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition-all flex gap-4"
                                    >
                                        {c.thumbnail_url ? (
                                            <img src={c.thumbnail_url} alt={c.company_name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                                        ) : (
                                            <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">🏢</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-indigo-600 font-semibold mb-0.5">{c.company_name}</p>
                                            <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{c.title}</p>
                                            {c.short_description && <p className="text-xs text-gray-500 line-clamp-2">{c.short_description}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* セクション10: シェア */}
                    {xShareText && (
                        <div className="bg-gray-50 rounded-2xl p-5">
                            <p className="text-sm font-bold text-gray-700 mb-3">📣 結果をシェアする</p>
                            <pre className="text-xs text-gray-600 bg-white rounded-xl p-3 mb-3 whitespace-pre-wrap border border-gray-100">{xShareText}</pre>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyShare}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'コピー済み' : 'コピー'}
                                </button>
                                <a
                                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(xShareText)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Xでシェア
                                </a>
                            </div>
                        </div>
                    )}

                    {/* やり直しボタン */}
                    <div className="flex justify-center pb-4">
                        <button onClick={onReset} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />
                            診断をやり直す
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* 未ログイン時のやり直し */}
            {!isLoggedIn && (
                <div className="flex justify-center pb-4">
                    <button onClick={onReset} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                        診断をやり直す
                    </button>
                </div>
            )}
        </div>
    );
}

function NovelBookCard({ book, onNavigate }) {
    const mapping = book._mapping;
    const displayText = mapping?.recommendation_text || book.connection_text || book.one_liner;
    const effectLabel = book.effect_label;

    return (
        <div>
            {effectLabel && (
                <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 text-xs font-bold px-2.5 py-1 rounded-full mb-3 border border-purple-200">
                    ✨ {effectLabel}
                </div>
            )}
            <button
                onClick={() => onNavigate(book.id)}
                className="w-full text-left flex gap-4 hover:opacity-80 transition-opacity"
            >
                {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-sm" />
                ) : (
                    <div className="w-16 h-24 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-purple-400" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{book.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{(book.authors || []).join(', ')}</p>
                    {displayText && (
                        <p className="text-xs text-purple-700 leading-relaxed italic">{displayText}</p>
                    )}
                    {book.what_it_gives?.length > 0 && !displayText && (
                        <p className="text-xs text-gray-600 leading-relaxed">{book.what_it_gives[0]}</p>
                    )}
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