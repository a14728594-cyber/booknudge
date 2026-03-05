import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

export default function GenreManagerPanel() {
    const [genres, setGenres] = useState([]);
    const [problems, setProblems] = useState({});
    const [expandedGenre, setExpandedGenre] = useState(null);
    const [addingGenre, setAddingGenre] = useState(false);
    const [newGenreName, setNewGenreName] = useState('');
    const [editingGenre, setEditingGenre] = useState(null);
    const [addingProblem, setAddingProblem] = useState(null);
    const [newProblemName, setNewProblemName] = useState('');
    const [editingProblem, setEditingProblem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadGenres(); }, []);

    const loadGenres = async () => {
        setLoading(true);
        const gs = await base44.entities.Genre.list('order', 100);
        setGenres(gs);
        setLoading(false);
    };

    const loadProblems = async (genreId) => {
        if (problems[genreId]) return;
        const ps = await base44.entities.ProblemCategory.filter({ genre_id: genreId }, 'order', 100);
        setProblems(prev => ({ ...prev, [genreId]: ps }));
    };

    const toggleGenre = async (genre) => {
        if (expandedGenre === genre.id) { setExpandedGenre(null); return; }
        setExpandedGenre(genre.id);
        await loadProblems(genre.id);
    };

    const createGenre = async () => {
        const name = newGenreName.trim();
        if (!name) return;
        const created = await base44.entities.Genre.create({ name, order: genres.length, is_active: true });
        setGenres(prev => [...prev, created]);
        setNewGenreName(''); setAddingGenre(false);
    };

    const updateGenre = async (genre) => {
        const name = editingGenre.name.trim();
        if (!name) return;
        await base44.entities.Genre.update(genre.id, { name });
        setGenres(prev => prev.map(g => g.id === genre.id ? { ...g, name } : g));
        setEditingGenre(null);
    };

    const deleteGenre = async (genre) => {
        if (!confirm(`「${genre.name}」を削除しますか？`)) return;
        const ps = problems[genre.id] || await base44.entities.ProblemCategory.filter({ genre_id: genre.id }, 'order', 200);
        for (const p of ps) await base44.entities.ProblemCategory.delete(p.id);
        await base44.entities.Genre.delete(genre.id);
        setGenres(prev => prev.filter(g => g.id !== genre.id));
        setProblems(prev => { const n = { ...prev }; delete n[genre.id]; return n; });
        if (expandedGenre === genre.id) setExpandedGenre(null);
    };

    const toggleGenreActive = async (genre) => {
        await base44.entities.Genre.update(genre.id, { is_active: !genre.is_active });
        setGenres(prev => prev.map(g => g.id === genre.id ? { ...g, is_active: !genre.is_active } : g));
    };

    const createProblem = async (genreId) => {
        const name = newProblemName.trim();
        if (!name) return;
        const list = problems[genreId] || [];
        const created = await base44.entities.ProblemCategory.create({ genre_id: genreId, name, order: list.length, is_active: true });
        setProblems(prev => ({ ...prev, [genreId]: [...(prev[genreId] || []), created] }));
        setNewProblemName(''); setAddingProblem(null);
    };

    const updateProblem = async (problem) => {
        const name = editingProblem.name.trim();
        if (!name) return;
        await base44.entities.ProblemCategory.update(problem.id, { name });
        setProblems(prev => ({ ...prev, [problem.genre_id]: prev[problem.genre_id].map(p => p.id === problem.id ? { ...p, name } : p) }));
        setEditingProblem(null);
    };

    const deleteProblem = async (problem) => {
        if (!confirm(`「${problem.name}」を削除しますか？`)) return;
        await base44.entities.ProblemCategory.delete(problem.id);
        setProblems(prev => ({ ...prev, [problem.genre_id]: prev[problem.genre_id].filter(p => p.id !== problem.id) }));
    };

    const toggleProblemActive = async (problem) => {
        await base44.entities.ProblemCategory.update(problem.id, { is_active: !problem.is_active });
        setProblems(prev => ({ ...prev, [problem.genre_id]: prev[problem.genre_id].map(p => p.id === problem.id ? { ...p, is_active: !problem.is_active } : p) }));
    };

    if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;

    return (
        <div className="space-y-3">
            {genres.map(genre => (
                <div key={genre.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => toggleGenre(genre)} className="text-gray-400 hover:text-gray-700">
                            {expandedGenre === genre.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {editingGenre?.id === genre.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input value={editingGenre.name} onChange={e => setEditingGenre(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && updateGenre(genre)} className="h-7 text-sm" autoFocus />
                                <button onClick={() => updateGenre(genre)} className="text-green-600"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingGenre(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <span className="flex-1 font-medium text-gray-800 text-sm">{genre.name}</span>
                        )}
                        <span onClick={() => toggleGenreActive(genre)} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer select-none ${genre.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {genre.is_active ? '表示' : '非表示'}
                        </span>
                        <button onClick={() => setEditingGenre({ id: genre.id, name: genre.name })} className="text-xs text-gray-400 hover:text-indigo-600 px-2">編集</button>
                        <button onClick={() => deleteGenre(genre)} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    {expandedGenre === genre.id && (
                        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 space-y-2">
                            {(problems[genre.id] || []).map(prob => (
                                <div key={prob.id} className="flex items-center gap-2 py-1">
                                    {editingProblem?.id === prob.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input value={editingProblem.name} onChange={e => setEditingProblem(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && updateProblem(prob)} className="h-7 text-sm" autoFocus />
                                            <button onClick={() => updateProblem(prob)} className="text-green-600"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingProblem(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <span className="flex-1 text-sm text-gray-700">{prob.name}</span>
                                    )}
                                    <span onClick={() => toggleProblemActive(prob)} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer select-none ${prob.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {prob.is_active ? '表示' : '非表示'}
                                    </span>
                                    <button onClick={() => setEditingProblem({ id: prob.id, name: prob.name })} className="text-xs text-gray-400 hover:text-indigo-600">編集</button>
                                    <button onClick={() => deleteProblem(prob)} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                            {addingProblem === genre.id ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <Input value={newProblemName} onChange={e => setNewProblemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProblem(genre.id)} placeholder="悩みカテゴリ名" className="h-7 text-sm" autoFocus />
                                    <button onClick={() => createProblem(genre.id)} className="text-green-600"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => { setAddingProblem(null); setNewProblemName(''); }} className="text-gray-400"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <button onClick={() => setAddingProblem(genre.id)} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 mt-1">
                                    <Plus className="w-3 h-3" /> 悩みカテゴリを追加
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {addingGenre ? (
                <div className="flex items-center gap-2 bg-white rounded-xl border border-dashed border-indigo-300 px-4 py-3">
                    <Input value={newGenreName} onChange={e => setNewGenreName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGenre()} placeholder="ジャンル名" className="h-7 text-sm" autoFocus />
                    <button onClick={createGenre} className="text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setAddingGenre(false); setNewGenreName(''); }} className="text-gray-400"><X className="w-4 h-4" /></button>
                </div>
            ) : (
                <button onClick={() => setAddingGenre(true)} className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:text-indigo-600 hover:border-indigo-400 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> ジャンルを追加
                </button>
            )}
        </div>
    );
}