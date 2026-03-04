import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function CaseQuizGenreSelector({
    user, selectedGenre, selectedProblem,
    onSelectGenre, onSelectProblem, onStartQuiz
}) {
    const [genres] = useState(() => JSON.parse(localStorage.getItem('casequiz_genres') || '[]'));
    const [problems, setProblems] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [answeredIds, setAnsweredIds] = useState(new Set());

    useEffect(() => {
        if (selectedGenre) loadProblems(selectedGenre);
    }, [selectedGenre]);

    useEffect(() => {
        if (selectedGenre) { setPage(0); loadQuizzes(0); }
    }, [selectedGenre, selectedProblem]);

    useEffect(() => {
        if (selectedGenre) loadQuizzes(page);
    }, [page]);

    useEffect(() => {
        if (user && quizzes.length > 0) loadAnsweredIds();
    }, [user, quizzes]);

    const loadProblems = async (genre) => {
        const all = await base44.entities.CaseQuiz.filter({ genre, is_active: true }, 'order', 500);
        const unique = [...new Set(all.map(q => q.problem).filter(Boolean))];
        setProblems(unique);
    };

    const loadQuizzes = async (p) => {
        setLoading(true);
        const filter = { genre: selectedGenre, is_active: true };
        if (selectedProblem) filter.problem = selectedProblem;
        const all = await base44.entities.CaseQuiz.filter(filter, 'order', 500);
        setTotal(all.length);
        setQuizzes(all.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE));
        setLoading(false);
    };

    const loadAnsweredIds = async () => {
        if (!user) return;
        const answers = await base44.entities.CaseQuizAnswer.filter({ user_id: user.id }, '-created_date', 500);
        setAnsweredIds(new Set(answers.map(a => a.quiz_id)));
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">事例クイズ</h1>

            {/* ジャンル選択 */}
            <div className="flex gap-2 flex-wrap mb-4">
                {genres.map(g => (
                    <button
                        key={g}
                        onClick={() => { onSelectGenre(g); onSelectProblem(null); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedGenre === g ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:border-indigo-400'}`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* 悩みカテゴリ */}
            {selectedGenre && problems.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6">
                    <button
                        onClick={() => onSelectProblem(null)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${!selectedProblem ? 'bg-gray-700 text-white' : 'bg-white border text-gray-500 hover:border-gray-400'}`}
                    >
                        すべて
                    </button>
                    {problems.map(p => (
                        <button
                            key={p}
                            onClick={() => onSelectProblem(p === selectedProblem ? null : p)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedProblem === p ? 'bg-gray-700 text-white' : 'bg-white border text-gray-500 hover:border-gray-400'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* クイズ一覧 */}
            {!selectedGenre ? (
                <div className="text-center py-16 text-gray-400">ジャンルを選んでください</div>
            ) : loading ? (
                <div className="text-center py-12 text-gray-400">読み込み中...</div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">クイズがありません</div>
            ) : (
                <div className="space-y-3">
                    {quizzes.map(quiz => (
                        <button
                            key={quiz.id}
                            onClick={() => onStartQuiz(quiz)}
                            className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    {quiz.problem && (
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mb-2 inline-block">{quiz.problem}</span>
                                    )}
                                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{quiz.scenario}</p>
                                    <p className="text-sm font-medium text-gray-900">Q: {quiz.question}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 mt-1">
                                    {answeredIds.has(quiz.id) && (
                                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">回答済み</span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* ページング */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-30">前へ</button>
                    <span className="text-sm text-gray-600">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-30">次へ</button>
                </div>
            )}
        </div>
    );
}