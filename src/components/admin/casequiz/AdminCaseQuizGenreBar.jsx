import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';


export default function AdminCaseQuizGenreBar({
    selectedGenre, selectedProblem,
    onSelectGenre, onSelectProblem
}) {
    const navigate = useNavigate();
    const [genres, setGenres] = useState([]);
    const [problems, setProblems] = useState({}); // genre_id -> ProblemCategory[]

    useEffect(() => {
        loadGenres();
    }, []);

    const loadGenres = async () => {
        const gs = await base44.entities.Genre.filter({ is_active: true }, 'order', 100);
        setGenres(gs);
        if (gs.length > 0 && !selectedGenre) {
            onSelectGenre(gs[0]);
            loadProblems(gs[0].id);
        }
    };

    const loadProblems = async (genreId) => {
        if (problems[genreId]) return;
        const ps = await base44.entities.ProblemCategory.filter({ genre_id: genreId, is_active: true }, 'order', 100);
        setProblems(prev => ({ ...prev, [genreId]: ps }));
    };

    const handleSelectGenre = (genre) => {
        onSelectGenre(genre);
        onSelectProblem(null);
        loadProblems(genre.id);
    };

    const currentProblems = selectedGenre ? (problems[selectedGenre.id] || []) : [];

    return (
        <div className="mb-6 space-y-3">
            {/* ジャンル行 */}
            <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-gray-400 font-medium w-16">ジャンル</span>
                {genres.map(g => (
                    <button
                        key={g.id}
                        onClick={() => handleSelectGenre(g)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedGenre?.id === g.id ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:border-indigo-400'}`}
                    >
                        {g.name}
                    </button>
                ))}
                <button
                    onClick={() => navigate(createPageUrl('AdminGenreManager'))}
                    className="px-3 py-1.5 rounded-full text-sm border text-gray-400 hover:text-indigo-600 hover:border-indigo-400 flex items-center gap-1"
                    title="ジャンル・悩みカテゴリを管理"
                >
                    <Settings className="w-3 h-3" /> 管理
                </button>
            </div>

            {/* 悩みカテゴリ行 */}
            {selectedGenre && (
                <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs text-gray-400 font-medium w-16">悩み</span>
                    <button
                        onClick={() => onSelectProblem(null)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${!selectedProblem ? 'bg-gray-700 text-white' : 'bg-white border text-gray-500 hover:border-gray-400'}`}
                    >
                        すべて
                    </button>
                    {currentProblems.map(p => (
                        <button
                            key={p.id}
                            onClick={() => onSelectProblem(p.id === selectedProblem?.id ? null : p)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedProblem?.id === p.id ? 'bg-gray-700 text-white' : 'bg-white border text-gray-500 hover:border-gray-400'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}