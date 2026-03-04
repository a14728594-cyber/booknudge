import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X, Check, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminCaseQuizGenreBar({
    genres, selectedGenre, selectedProblem,
    onSelectGenre, onSelectProblem, onSaveGenres
}) {
    const [addingGenre, setAddingGenre] = useState(false);
    const [newGenreText, setNewGenreText] = useState('');
    const [addingProblem, setAddingProblem] = useState(false);
    const [newProblemText, setNewProblemText] = useState('');
    const [problems, setProblems] = useState({});

    // genreが変わったら問題一覧を取得
    const loadProblems = async (genre) => {
        if (problems[genre]) return;
        const nodes = await base44.entities.CaseQuiz.filter({ genre }, 'order', 500);
        const unique = [...new Set(nodes.map(n => n.problem).filter(Boolean))];
        setProblems(p => ({ ...p, [genre]: unique }));
    };

    const handleSelectGenre = (g) => {
        onSelectGenre(g);
        loadProblems(g);
    };

    const addGenre = () => {
        const g = newGenreText.trim();
        if (!g || genres.includes(g)) return;
        onSaveGenres([...genres, g]);
        handleSelectGenre(g);
        setNewGenreText('');
        setAddingGenre(false);
    };

    const deleteGenre = (g) => {
        if (!confirm(`ジャンル「${g}」を削除しますか？（クイズは削除されません）`)) return;
        const updated = genres.filter(x => x !== g);
        onSaveGenres(updated);
        if (selectedGenre === g) onSelectGenre(updated[0] || null);
    };

    const currentProblems = problems[selectedGenre] || [];

    const addProblem = () => {
        const p = newProblemText.trim();
        if (!p) return;
        const updated = [...currentProblems, p];
        setProblems(prev => ({ ...prev, [selectedGenre]: updated }));
        onSelectProblem(p);
        setNewProblemText('');
        setAddingProblem(false);
    };

    return (
        <div className="mb-6 space-y-3">
            {/* ジャンル行 */}
            <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-gray-400 font-medium w-16">ジャンル</span>
                {genres.map(g => (
                    <div key={g} className="flex items-center gap-0.5 group">
                        <button
                            onClick={() => handleSelectGenre(g)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedGenre === g ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:border-indigo-400'}`}
                        >
                            {g}
                        </button>
                        <button onClick={() => deleteGenre(g)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {addingGenre ? (
                    <div className="flex items-center gap-2">
                        <Input value={newGenreText} onChange={e => setNewGenreText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGenre()} placeholder="ジャンル名" className="h-7 w-32 text-sm" autoFocus />
                        <button onClick={addGenre} className="text-green-600"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setAddingGenre(false); setNewGenreText(''); }} className="text-gray-400"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <button onClick={() => setAddingGenre(true)} className="px-3 py-1.5 rounded-full text-sm border border-dashed text-gray-400 hover:text-indigo-600 hover:border-indigo-400 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> 追加
                    </button>
                )}
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
                            key={p}
                            onClick={() => onSelectProblem(p === selectedProblem ? null : p)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedProblem === p ? 'bg-gray-700 text-white' : 'bg-white border text-gray-500 hover:border-gray-400'}`}
                        >
                            {p}
                        </button>
                    ))}
                    {addingProblem ? (
                        <div className="flex items-center gap-2">
                            <Input value={newProblemText} onChange={e => setNewProblemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProblem()} placeholder="悩みカテゴリ名" className="h-7 w-36 text-sm" autoFocus />
                            <button onClick={addProblem} className="text-green-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => { setAddingProblem(false); setNewProblemText(''); }} className="text-gray-400"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setAddingProblem(true)} className="px-3 py-1 rounded-full text-sm border border-dashed text-gray-400 hover:text-gray-600 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> 追加
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}