import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

function ProblemRow({ problem, onEdit, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(problem.name);

    const save = async () => {
        await base44.entities.ProblemCategory.update(problem.id, { name });
        onEdit();
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="flex items-center gap-2 pl-8 py-1">
                <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-sm flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
                <button onClick={save} className="text-green-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditing(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 pl-8 py-1.5 group">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-700 flex-1">{problem.name}</span>
            <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-500 transition-opacity">
                <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(problem)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function GenreRow({ genre, problems, onReload }) {
    const [expanded, setExpanded] = useState(true);
    const [editing, setEditing] = useState(false);
    const [genreName, setGenreName] = useState(genre.name);
    const [addingProblem, setAddingProblem] = useState(false);
    const [newProblem, setNewProblem] = useState('');

    const genreProblems = problems.filter(p => p.genre_id === genre.id).sort((a, b) => (a.order || 0) - (b.order || 0));

    const saveGenre = async () => {
        await base44.entities.Genre.update(genre.id, { name: genreName });
        onReload();
        setEditing(false);
    };

    const deleteGenre = async () => {
        if (!confirm(`ジャンル「${genre.name}」とその悩み大分類をすべて削除しますか？`)) return;
        await Promise.all(genreProblems.map(p => base44.entities.ProblemCategory.delete(p.id)));
        await base44.entities.Genre.delete(genre.id);
        onReload();
    };

    const addProblem = async () => {
        const name = newProblem.trim();
        if (!name) return;
        await base44.entities.ProblemCategory.create({ genre_id: genre.id, name, order: genreProblems.length, is_active: true });
        setNewProblem('');
        setAddingProblem(false);
        onReload();
    };

    const deleteProblem = async (problem) => {
        if (!confirm(`「${problem.name}」を削除しますか？`)) return;
        await base44.entities.ProblemCategory.delete(problem.id);
        onReload();
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {/* ジャンルヘッダー */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 group">
                <button onClick={() => setExpanded(!expanded)} className="text-gray-400">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {editing ? (
                    <>
                        <Input value={genreName} onChange={e => setGenreName(e.target.value)} className="h-7 text-sm flex-1 font-bold" autoFocus onKeyDown={e => e.key === 'Enter' && saveGenre()} />
                        <button onClick={saveGenre} className="text-green-600"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditing(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
                    </>
                ) : (
                    <>
                        <span className="font-semibold text-gray-800 flex-1">{genre.name}</span>
                        <span className="text-xs text-gray-400">{genreProblems.length}件の悩み</span>
                        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-500 transition-opacity">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={deleteGenre} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
            </div>

            {expanded && (
                <div className="py-2">
                    {genreProblems.map(p => (
                        <ProblemRow key={p.id} problem={p} onEdit={onReload} onDelete={deleteProblem} />
                    ))}
                    {addingProblem ? (
                        <div className="flex items-center gap-2 pl-8 py-1">
                            <Input value={newProblem} onChange={e => setNewProblem(e.target.value)} className="h-7 text-sm flex-1" placeholder="悩み大分類名" autoFocus onKeyDown={e => e.key === 'Enter' && addProblem()} />
                            <button onClick={addProblem} className="text-green-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setAddingProblem(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setAddingProblem(true)} className="flex items-center gap-1.5 pl-8 py-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                            <Plus className="w-3 h-3" /> 悩み大分類を追加
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function GenreProblemManager() {
    const [genres, setGenres] = useState([]);
    const [problems, setProblems] = useState([]);
    const [addingGenre, setAddingGenre] = useState(false);
    const [newGenre, setNewGenre] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        const [gs, ps] = await Promise.all([
            base44.entities.Genre.list('order', 100),
            base44.entities.ProblemCategory.list('order', 500),
        ]);
        setGenres(gs);
        setProblems(ps);
    };

    const addGenre = async () => {
        const name = newGenre.trim();
        if (!name) return;
        await base44.entities.Genre.create({ name, order: genres.length, is_active: true });
        setNewGenre('');
        setAddingGenre(false);
        load();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-gray-800">ジャンル・悩み大分類 管理</h2>
                    <p className="text-xs text-gray-500 mt-0.5">診断フロー作成時の選択肢として使われます</p>
                </div>
                {!addingGenre && (
                    <Button size="sm" onClick={() => setAddingGenre(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-3.5 h-3.5" /> ジャンル追加
                    </Button>
                )}
            </div>

            {addingGenre && (
                <div className="flex items-center gap-2 p-3 border border-indigo-200 rounded-xl bg-indigo-50">
                    <Input value={newGenre} onChange={e => setNewGenre(e.target.value)} placeholder="新しいジャンル名" className="h-8 text-sm flex-1 bg-white" autoFocus onKeyDown={e => e.key === 'Enter' && addGenre()} />
                    <button onClick={addGenre} className="text-green-600"><Check className="w-5 h-5" /></button>
                    <button onClick={() => setAddingGenre(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
                </div>
            )}

            {genres.length === 0 && !addingGenre && (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                    <p className="mb-3">ジャンルがまだありません</p>
                    <Button size="sm" onClick={() => setAddingGenre(true)} variant="outline">ジャンルを追加する</Button>
                </div>
            )}

            {genres.map(g => (
                <GenreRow key={g.id} genre={g} problems={problems} onReload={load} />
            ))}
        </div>
    );
}