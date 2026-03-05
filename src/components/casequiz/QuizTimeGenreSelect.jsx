import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, Zap } from 'lucide-react';

const QUIZ_BATCH = 5;

export default function QuizTimeGenreSelect({ user, onStart }) {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(null); // genre.id

    useEffect(() => {
        loadGenres();
    }, []);

    const loadGenres = async () => {
        const gs = await base44.entities.Genre.filter({ is_active: true }, 'order', 50);
        setGenres(gs);
        setLoading(false);
    };

    const handleStart = async (genre) => {
        setStarting(genre.id);
        // そのジャンルのis_active=trueクイズをorder順で最大50件取得し先頭5件を出題
        const quizzes = await base44.entities.CaseQuiz.filter(
            { genre: genre.name, is_active: true },
            'order',
            50
        );
        // シャッフルせず order 順で先頭 QUIZ_BATCH 件
        const batch = quizzes.slice(0, QUIZ_BATCH);
        setStarting(null);
        if (batch.length === 0) {
            alert('このジャンルにはまだクイズがありません');
            return;
        }
        onStart(genre, batch);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
            <div className="max-w-xl mx-auto px-4 py-12">
                {/* ヘッダー */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">クイズタイム</h1>
                    <p className="text-gray-500 text-sm">ジャンルを選んで、5問チャレンジ！</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                    </div>
                ) : genres.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        ジャンルが登録されていません
                    </div>
                ) : (
                    <div className="space-y-3">
                        {genres.map(genre => (
                            <button
                                key={genre.id}
                                onClick={() => handleStart(genre)}
                                disabled={!!starting}
                                className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between hover:border-indigo-400 hover:shadow-md transition-all group disabled:opacity-60"
                            >
                                <span className="text-lg font-semibold text-gray-800 group-hover:text-indigo-700">
                                    {genre.name}
                                </span>
                                {starting === genre.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}