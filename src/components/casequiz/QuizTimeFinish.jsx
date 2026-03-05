import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Star, RefreshCw, List } from 'lucide-react';

const QUIZ_BATCH = 5;

export default function QuizTimeFinish({ genre, user, onRestart, onBackToGenre }) {
    const [otherGenres, setOtherGenres] = useState([]);
    const [starting, setStarting] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOtherGenres();
    }, []);

    const loadOtherGenres = async () => {
        const gs = await base44.entities.Genre.filter({ is_active: true }, 'order', 50);
        setOtherGenres(gs.filter(g => g.id !== genre?.id));
        setLoading(false);
    };

    const handleStart = async (g) => {
        setStarting(g.id);
        const quizzes = await base44.entities.CaseQuiz.filter(
            { genre: g.name, is_active: true },
            'order',
            50
        );
        const batch = quizzes.slice(0, QUIZ_BATCH);
        setStarting(null);
        if (batch.length === 0) {
            alert('このジャンルにはまだクイズがありません');
            return;
        }
        onRestart(g, batch);
    };

    const handleRetry = async () => {
        if (!genre) return;
        handleStart(genre);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
            <div className="max-w-xl mx-auto px-4 py-12">
                {/* 完了メッセージ */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                        <Star className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">お疲れ様でした！</h2>
                    <p className="text-gray-500 text-sm">
                        <span className="font-semibold text-indigo-600">{genre?.name}</span> の5問を完了しました
                    </p>
                </div>

                {/* アクション */}
                <div className="space-y-3 mb-8">
                    <Button
                        onClick={handleRetry}
                        disabled={!!starting}
                        variant="outline"
                        className="w-full h-12 gap-2 text-base"
                    >
                        {starting === genre?.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {genre?.name} をもう一度
                    </Button>
                    <Button
                        onClick={onBackToGenre}
                        variant="ghost"
                        className="w-full h-12 gap-2 text-base text-gray-600"
                    >
                        <List className="w-4 h-4" />
                        ジャンル選択に戻る
                    </Button>
                </div>

                {/* 別ジャンル */}
                {!loading && otherGenres.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">別のジャンルに挑戦</p>
                        <div className="space-y-2">
                            {otherGenres.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => handleStart(g)}
                                    disabled={!!starting}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-indigo-400 hover:shadow-sm transition-all group disabled:opacity-60"
                                >
                                    <span className="font-medium text-gray-800 group-hover:text-indigo-700">{g.name}</span>
                                    {starting === g.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                    ) : (
                                        <span className="text-xs text-indigo-500 group-hover:underline">スタート →</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}