import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function AdminCaseQuizList({ genre, problem, onEdit, onNew, onReload }) {
    const [quizzes, setQuizzes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPage(0);
    }, [genre, problem]);

    useEffect(() => {
        loadQuizzes();
    }, [genre, problem, page]);

    const loadQuizzes = async () => {
        setLoading(true);
        const filter = { genre };
        if (problem) filter.problem = problem;
        const all = await base44.entities.CaseQuiz.filter(filter, 'order', 500);
        setTotal(all.length);
        setQuizzes(all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
        setLoading(false);
    };

    const deleteQuiz = async (id) => {
        if (!confirm('このクイズを削除しますか？')) return;
        await base44.entities.CaseQuiz.delete(id);
        // 関連する選択肢も削除
        const opts = await base44.entities.CaseQuizOption.filter({ quiz_id: id }, 'order', 100);
        for (const o of opts) await base44.entities.CaseQuizOption.delete(o.id);
        loadQuizzes();
        onReload();
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500">{total}件</div>
                <Button onClick={onNew} size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> クイズを追加
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">読み込み中...</div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                    クイズがありません
                </div>
            ) : (
                <div className="space-y-3">
                    {quizzes.map(quiz => (
                        <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {quiz.problem && <Badge variant="secondary" className="text-xs">{quiz.problem}</Badge>}
                                        <Badge variant={quiz.is_active ? 'default' : 'outline'} className="text-xs">
                                            {quiz.is_active ? '配信中' : '停止中'}
                                        </Badge>
                                        <span className="text-xs text-gray-400">order: {quiz.order ?? '-'}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 line-clamp-2 mb-1">{quiz.scenario}</p>
                                    <p className="text-sm font-medium text-gray-900">Q: {quiz.question}</p>
                                    {quiz.common_feedback && (
                                        <p className="text-xs text-indigo-600 mt-1">💡 {quiz.common_feedback}</p>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => onEdit(quiz)} className="text-gray-400 hover:text-indigo-600">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteQuiz(quiz.id)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ページング */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="p-1 disabled:opacity-30">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="p-1 disabled:opacity-30">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}