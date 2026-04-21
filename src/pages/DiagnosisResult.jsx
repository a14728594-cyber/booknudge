import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';

const ROLE_CONFIG = {
    priority: { emoji: '⭐', label: 'まずこれを読む', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
    perspective: { emoji: '🔭', label: '視点を広げる', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
    action: { emoji: '⚡', label: '行動に落とす', bgClass: 'bg-green-50', textClass: 'text-green-700', borderClass: 'border-green-200' },
};

export default function DiagnosisResult() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const mainTypeParam = urlParams.get('main_type');
    const subTypeParam = urlParams.get('sub_type');

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [mainTypeInfo, setMainTypeInfo] = useState(null);
    const [subTypeInfo, setSubTypeInfo] = useState(null);
    const [mainTypeKey, setMainTypeKey] = useState(null);
    const [books, setBooks] = useState([]);

    useEffect(() => {
        loadResult();
    }, [sessionId]);

    const loadResult = async () => {
        try {
            let targetSession = null;
            let mainType = mainTypeParam || null;
            let subType = subTypeParam || null;

            if (sessionId) {
                targetSession = await base44.entities.DiagnosisSession.get(sessionId);
                mainType = targetSession?.main_type || mainType;
                subType = targetSession?.sub_type || subType;
            } else if (!mainType) {
                try {
                    const user = await base44.auth.me();
                    const sessions = await base44.entities.DiagnosisSession.filter(
                        { user_id: user.id, is_latest: true }, '-created_date', 1
                    );
                    targetSession = sessions[0];
                    mainType = targetSession?.main_type || null;
                    subType = targetSession?.sub_type || null;
                } catch (e) {
                    // 未ログイン
                }
            }

            setSession(targetSession);
            setMainTypeKey(mainType);

            // 診断タイプ情報を取得
            const [mainInfo, subInfo] = await Promise.all([
                mainType ? fetchTypeInfo(mainType) : Promise.resolve(null),
                subType ? fetchTypeInfo(subType) : Promise.resolve(null),
            ]);
            setMainTypeInfo(mainInfo);
            setSubTypeInfo(subInfo);

            // 本を取得 (メインタイプ優先、サブタイプも追加)
            if (mainType) {
                const [mainMappings, subMappings, allBooks] = await Promise.all([
                    base44.entities.BookDiagnosisMapping.filter({ diagnosis_type_key: mainType }, 'priority_order', 20),
                    subType ? base44.entities.BookDiagnosisMapping.filter({ diagnosis_type_key: subType }, 'priority_order', 10) : Promise.resolve([]),
                    base44.entities.Book.list('-created_date', 300),
                ]);

                const bookMap = {};
                allBooks.forEach(b => { bookMap[b.id] = b; });

                // メインタイプ本 (最大2冊)
                const mainBooks = mainMappings
                    .filter(m => bookMap[m.book_id])
                    .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0))
                    .slice(0, 2)
                    .map(m => ({ ...bookMap[m.book_id], _mapping: m }));

                // サブタイプ本（メインと重複しないもの1冊）
                const mainBookIds = new Set(mainBooks.map(b => b.id));
                const subBooks = subMappings
                    .filter(m => bookMap[m.book_id] && !mainBookIds.has(m.book_id))
                    .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0))
                    .slice(0, 1)
                    .map(m => ({ ...bookMap[m.book_id], _mapping: m, _isSubType: true }));

                const combined = [...mainBooks, ...subBooks].slice(0, 3);
                setBooks(combined);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTypeInfo = async (typeKey) => {
        try {
            const types = await base44.entities.DiagnosisResultType.filter({ key: typeKey }, 'order', 1);
            return types[0] || null;
        } catch {
            return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">診断結果を準備中...</p>
                </div>
            </div>
        );
    }

    const priorityBook = books.find(b => b._mapping?.role === 'priority') || books[0];
    const otherBooks = books.filter(b => b.id !== priorityBook?.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-2xl mx-auto">
                {/* ヘッダー */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(createPageUrl('home'))}
                        className="p-2 rounded-xl hover:bg-white text-gray-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">深掘り診断 結果</h1>
                        {session?.genre && <p className="text-sm text-gray-500">{session.genre} の診断結果</p>}
                    </div>
                </div>

                {/* メインタイプカード */}
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
                            <Button onClick={() => navigate(createPageUrl('DeepDiagnosis'))} variant="outline" className="flex-1 gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                                <RotateCcw className="w-4 h-4" />
                                もう一度
                            </Button>
                            <Button onClick={() => navigate(createPageUrl('home'))} className="flex-1 bg-white text-indigo-700 hover:bg-indigo-50 gap-2 font-bold">
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
                            <Button onClick={() => navigate(createPageUrl('DeepDiagnosis'))} variant="outline" className="flex-1 gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                                <RotateCcw className="w-4 h-4" />
                                もう一度
                            </Button>
                            <Button onClick={() => navigate(createPageUrl('home'))} className="flex-1 bg-white text-gray-700 hover:bg-gray-50 gap-2 font-bold">
                                ホームへ
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* サブタイプバッジ */}
                {subTypeInfo && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <span className="text-2xl">{subTypeInfo.emoji || '📌'}</span>
                        <div>
                            <p className="text-xs text-gray-500">サブタイプ</p>
                            <p className="font-semibold text-gray-800">{subTypeInfo.label}</p>
                        </div>
                    </div>
                )}

                {/* おすすめ本 */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-5">あなたへのおすすめ本</h3>

                    {books.length > 0 ? (
                        <div className="space-y-4">
                            {priorityBook && (
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-amber-500 text-lg">⭐</span>
                                        <span className="text-amber-700 font-bold text-sm">迷ったらまずこれ</span>
                                    </div>
                                    <BookResultCard book={priorityBook} subTypeInfo={subTypeInfo} />
                                </div>
                            )}
                            {otherBooks.map(book => (
                                <div key={book.id} className={`bg-white border rounded-2xl p-5 ${book._isSubType ? 'border-purple-200' : 'border-gray-100'}`}>
                                    {book._isSubType && (
                                        <div className="flex items-center gap-1 mb-3">
                                            <span className="text-purple-500 text-sm">📌</span>
                                            <span className="text-purple-700 text-xs font-medium">
                                                {subTypeInfo?.label}にも対応
                                            </span>
                                        </div>
                                    )}
                                    <BookResultCard book={book} />
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
        </div>
    );
}

function BookResultCard({ book }) {
    const roleInfo = book._mapping?.role ? ROLE_CONFIG[book._mapping.role] : null;
    const recText = book._mapping?.recommendation_text;

    return (
        <Link to={createPageUrl('BookDetail') + `?id=${book.id}`} className="block">
            <div className="flex gap-4">
                {book.cover_url ? (
                    <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-sm"
                    />
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
                    {recText && (
                        <p className="text-xs text-gray-600 leading-relaxed">{recText}</p>
                    )}
                </div>
            </div>
            {book.amazon_url && (
                <a
                    href={book.amazon_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold text-sm py-2.5 px-4 rounded-xl transition-colors"
                >
                    Amazonで見る
                </a>
            )}
        </Link>
    );
}