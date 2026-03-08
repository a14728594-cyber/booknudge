import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, BookOpen, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SubscriptionGuard from '@/components/common/SubscriptionGuard';

export default function PersonalizedQuiz() {
    return (
        <SubscriptionGuard pagePath="/PersonalizedQuiz">
            <PersonalizedQuizContent />
        </SubscriptionGuard>
    );
}

function PersonalizedQuizContent() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        setLoading(true);
        const u = await base44.auth.me();
        setUser(u);

        // 最新の診断セッションを取得
        const sessions = await base44.entities.DiagnosisSession.filter(
            { user_id: u.id, is_latest: true },
            '-created_date',
            1
        );
        const latestSession = sessions[0] || null;
        setSession(latestSession);

        if (latestSession?.recommended_books?.length > 0) {
            // キャッシュされたおすすめ本のIDリストから本データを取得
            const bookIds = latestSession.recommended_books.map(r => r.book_id);
            const allBooks = await base44.entities.Book.list('-created_date', 200);
            const bookMap = {};
            allBooks.forEach(b => { bookMap[b.id] = b; });

            const merged = latestSession.recommended_books
                .map(r => ({ ...r, book: bookMap[r.book_id] }))
                .filter(r => r.book);
            setBooks(merged);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    // 診断未実施
    if (!session || !session.recommended_books?.length) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">パーソナライズおすすめ</h1>
                <p className="text-gray-500 mb-8">
                    診断を受けると、あなたの悩みや状況に合わせた<br />
                    おすすめ本をAIが選んでくれます。
                </p>
                <Button
                    onClick={() => navigate(createPageUrl('DeepDiagnosis'))}
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                    診断を受ける <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">あなたへのおすすめ</h1>
                        <p className="text-sm text-gray-500">
                            {session.genre} / {session.problem} の診断結果より
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(createPageUrl('DeepDiagnosis'))}
                    className="gap-2 text-sm"
                >
                    <RefreshCw className="w-4 h-4" /> 再診断
                </Button>
            </div>

            {/* おすすめ本リスト */}
            <div className="space-y-4">
                {books.map((item, idx) => (
                    <div
                        key={item.book_id}
                        className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(createPageUrl('BookDetail') + '?id=' + item.book_id)}
                    >
                        {/* 順位 */}
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                        </div>

                        {/* カバー */}
                        {item.book.cover_url ? (
                            <img
                                src={item.book.cover_url}
                                alt={item.book.title}
                                className="w-14 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                        ) : (
                            <div className="w-14 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-6 h-6 text-gray-400" />
                            </div>
                        )}

                        {/* 情報 */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1 leading-snug">{item.book.title}</h3>
                            {item.book.authors?.length > 0 && (
                                <p className="text-xs text-gray-400 mb-2">{item.book.authors.join(', ')}</p>
                            )}
                            {/* AIのおすすめ理由 */}
                            <div className="bg-purple-50 rounded-xl px-3 py-2">
                                <p className="text-xs text-purple-700 leading-relaxed">✨ {item.reason}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}