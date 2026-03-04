import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import AdminCaseQuizGenreBar from '../components/admin/casequiz/AdminCaseQuizGenreBar';
import AdminCaseQuizList from '../components/admin/casequiz/AdminCaseQuizList';
import AdminCaseQuizForm from '../components/admin/casequiz/AdminCaseQuizForm';

export default function AdminCaseQuiz() {
    const navigate = useNavigate();
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [editingQuiz, setEditingQuiz] = useState(null); // null=list, 'new'=新規, quiz object=編集
    const [reload, setReload] = useState(0);

    useEffect(() => {
        (async () => {
            const user = await base44.auth.me();
            if (user?.role !== 'admin') navigate(createPageUrl('home'));
        })();
        loadGenres();
    }, []);

    const loadGenres = () => {
        const stored = JSON.parse(localStorage.getItem('casequiz_genres') || '[]');
        setGenres(stored);
        if (stored.length > 0 && !selectedGenre) setSelectedGenre(stored[0]);
    };

    const saveGenres = (updated) => {
        localStorage.setItem('casequiz_genres', JSON.stringify(updated));
        setGenres(updated);
    };

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
                <div className="text-sm text-gray-500">CaseQuiz / CaseQuizOption</div>
            </div>

            <AdminCaseQuizGenreBar
                genres={genres}
                selectedGenre={selectedGenre}
                selectedProblem={selectedProblem}
                onSelectGenre={(g) => { setSelectedGenre(g); setSelectedProblem(null); }}
                onSelectProblem={setSelectedProblem}
                onSaveGenres={saveGenres}
            />

            {selectedGenre && (
                <AdminCaseQuizList
                    key={`${selectedGenre}-${selectedProblem}-${reload}`}
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