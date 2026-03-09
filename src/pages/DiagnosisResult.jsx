import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { getTypeInfo, BOOK_ROLES } from '@/components/common/diagnosisTypes';

export default function DiagnosisResult() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const typeParam = urlParams.get('type'); // ログインなしフォールバック

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [typeInfo, setTypeInfo] = useState(null);
    const [resultTypeKey, setResultTypeKey] = useState(null);
    const [books, setBooks] = useState([]);

    useEffect(() => {
        loadResult();
    }, [sessionId]);

    const loadResult = async () => {
        try {
            let targetSession = null;
            let typeKey = typeParam || null;

            if (sessionId) {
                targetSession = await base44.entities.DiagnosisSession.get(sessionId);
                typeKey = targetSession?.result_type || typeKey;
            } else if (!typeKey) {
                // セッションIDもタイプもない場合は最新セッションを取得
                try {
                    const user = await base44.auth.me();
                    const sessions = await base44.entities.DiagnosisSession.filter(
                        { user_id: user.id, is_latest: true }, '-created_date', 1
                    );
                    targetSession = sessions[0];
                    typeKey = targetSession?.result_type || null;
                } catch (e) {
                    // 未ログイン
                }
            }

            setSession(targetSession);
            setResultTypeKey(typeKey);

            const info = getTypeInfo(typeKey);
            setTypeInfo(info);

            // 該当タイプの本を取得
            if (typeKey) {
                const allBooks = await base44.entities.Book.list('-created_date', 300);
                const typeBooks = allBooks.filter(b =>
                    b.diagnosis_types && b.diagnosis_types.includes(typeKey)
                );

                // role順でソート (priority → perspective → action → 未設定)
                const roleOrder = { priority: 0, perspective: 1, action: 2 };
                const sorted = typeBooks.sort((a, b) =>
                    (roleOrder[a.book_role] ?? 3) - (roleOrder[b.book_role] ?? 3)
                );
                setBooks(sorted.slice(0, 3));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
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

    const priorityBook = books.find(b => b.book_role === 'priority') || books[0];
    const otherBooks = books.filter(b => b.id !== priorityBook?.id).slice(0, 2);

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

                {/* タイプカード */}
                {typeInfo ? (
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white mb-8">
                        <div className="text-4xl mb-3">{typeInfo.emoji}</div>
                        <p className="text-indigo-200 text-sm mb-2">あなたは今...</p>
                        <h2 className="text-3xl font-bold mb-4">{typeInfo.label}</h2>
                        <p className="text-indigo-100 text-base leading-relaxed mb-4">{typeInfo.description}</p>
                        <div className="bg-white/20 rounded-2xl p-4">
                            <p className="text-white font-semibold text-sm">💡 今必要なこと</p>
                            <p className="text-indigo-100 text-sm mt-1">{typeInfo.direction}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-3xl p-8 text-white mb-8">
                        <div className="text-4xl mb-3">📊</div>
                        <p className="text-gray-200 text-sm mb-2">診断が完了しました</p>
                        <h2 className="text-2xl font-bold mb-4">診断結果タイプ未設定</h2>
                        <p className="text-gray-200 text-sm">管理者が診断フローに結果タイプを設定すると、ここに詳細が表示されます。</p>
                    </div>
                )}

                {/* おすすめ本 */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-5">あなたへのおすすめ本</h3>

                    {books.length > 0 ? (
                        <div className="space-y-4">
                            {/* 最優先の1冊 */}
                            {priorityBook && (
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-amber-500 text-lg">⭐</span>
                                        <span className="text-amber-700 font-bold text-sm">迷ったらまずこれ</span>
                                    </div>
                                    <BookResultCard book={priorityBook} />
                                </div>
                            )}

                            {/* その他の2冊 */}
                            {otherBooks.map(book => (
                                <div key={book.id} className="bg-white border border-gray-100 rounded-2xl p-5">
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

                {/* アクション */}
                <div className="flex gap-3 mt-8">
                    <Button
                        onClick={() => navigate(createPageUrl('DeepDiagnosis'))}
                        variant="outline"
                        className="flex-1 gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        もう一度診断
                    </Button>
                    <Button
                        onClick={() => navigate(createPageUrl('home'))}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
                    >
                        ホームへ
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function BookResultCard({ book }) {
    const roleInfo = book.book_role ? BOOK_ROLES[book.book_role] : null;

    return (
        <div>
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
                    {book.recommendation_text && (
                        <p className="text-xs text-gray-600 leading-relaxed">{book.recommendation_text}</p>
                    )}
                </div>
            </div>
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