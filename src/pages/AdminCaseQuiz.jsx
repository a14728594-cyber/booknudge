import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import AdminCaseQuizGenreBar from '@/components/admin/casequiz/AdminCaseQuizGenreBar';
import AdminCaseQuizList from '@/components/admin/casequiz/AdminCaseQuizList';
import AdminCaseQuizForm from '@/components/admin/casequiz/AdminCaseQuizForm';

export default function AdminCaseQuiz() {
    const navigate = useNavigate();
    const [selectedGenre, setSelectedGenre] = useState(null);   // Genre object
    const [selectedProblem, setSelectedProblem] = useState(null); // ProblemCategory object
    const [editingQuiz, setEditingQuiz] = useState(null); // null=list, 'new'=新規, quiz object=編集
    const [reload, setReload] = useState(0);

    useEffect(() => {
        (async () => {
            const user = await base44.auth.me();
            if (user?.role !== 'admin') navigate(createPageUrl('home'));
        })();
    }, []);

    const triggerReload = () => setReload(r => r + 1);

    if (editingQuiz !== null) {
        return (
            <AdminCaseQuizForm
                quiz={editingQuiz === 'new' ? null : editingQuiz}
                defaultGenre={selectedGenre}
                defaultProblem={selectedProblem}
                onBack={() => { setEditingQuiz(null); triggerReload(); }}
            />
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">事例クイズ 管理</h1>
                <button
                    onClick={() => navigate(createPageUrl('AdminGenreManager'))}
                    className="text-sm text-indigo-600 hover:underline"
                >
                    ジャンル・悩みカテゴリを管理 →
                </button>
            </div>

            <AdminCaseQuizGenreBar
                selectedGenre={selectedGenre}
                selectedProblem={selectedProblem}
                onSelectGenre={setSelectedGenre}
                onSelectProblem={setSelectedProblem}
            />

            {selectedGenre && (
                <AdminCaseQuizList
                    key={`${selectedGenre?.id}-${selectedProblem?.id}-${reload}`}
                    genre={selectedGenre}
                    problem={selectedProblem}
                    onEdit={(quiz) => setEditingQuiz(quiz)}
                    onNew={() => setEditingQuiz('new')}
                    onReload={triggerReload}
                />
            )}
        </div>
    );
}