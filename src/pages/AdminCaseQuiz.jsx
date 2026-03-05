import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import AdminCaseQuizGenreBar from '@/components/admin/casequiz/AdminCaseQuizGenreBar';
import AdminCaseQuizList from '@/components/admin/casequiz/AdminCaseQuizList';
import AdminCaseQuizForm from '@/components/admin/casequiz/AdminCaseQuizForm';
import GenreManagerPanel from '@/components/admin/casequiz/GenreManagerPanel';

// tab: 'quizzes' | 'genres'
export default function AdminCaseQuiz() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('quizzes');
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [editingQuiz, setEditingQuiz] = useState(null);
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">事例クイズ 管理</h1>

            {/* タブ */}
            <div className="flex border-b border-gray-200 mb-6">
                {[
                    { id: 'quizzes', label: 'クイズ一覧' },
                    { id: 'genres', label: 'ジャンル・悩みカテゴリ管理' },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            tab === t.id
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'quizzes' && (
                <>
                    <AdminCaseQuizGenreBar
                        key={reload}
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
                </>
            )}

            {tab === 'genres' && <GenreManagerPanel />}
        </div>
    );
}