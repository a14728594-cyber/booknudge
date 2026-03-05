import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';

export default function AdminCaseQuizForm({ quiz, defaultGenre, defaultProblem, onBack }) {
    const isNew = !quiz;
    const [genres, setGenres] = useState([]);
    const [problems, setProblems] = useState([]); // ProblemCategory[]
    const [form, setForm] = useState({
        genre: quiz?.genre || defaultGenre?.name || '',
        genre_id: quiz?.genre_id || defaultGenre?.id || '',
        problem: quiz?.problem || defaultProblem?.name || '',
        problem_id: quiz?.problem_id || defaultProblem?.id || '',
        scenario: quiz?.scenario || '',
        question: quiz?.question || '',
        common_feedback: quiz?.common_feedback || '',
        order: quiz?.order ?? 0,
        is_active: quiz?.is_active ?? true,
        book_id: quiz?.book_id || '',
    });
    const [options, setOptions] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadGenres();
        if (!isNew) loadOptions();
    }, []);

    useEffect(() => {
        if (form.genre_id) loadProblems(form.genre_id);
    }, [form.genre_id]);

    const loadGenres = async () => {
        const gs = await base44.entities.Genre.filter({ is_active: true }, 'order', 100);
        setGenres(gs);
    };

    const loadProblems = async (genreId) => {
        const ps = await base44.entities.ProblemCategory.filter({ genre_id: genreId, is_active: true }, 'order', 100);
        setProblems(ps);
    };

    const loadOptions = async () => {
        const opts = await base44.entities.CaseQuizOption.filter({ quiz_id: quiz.id }, 'order', 20);
        setOptions(opts.map(o => ({ ...o, _saved: true })));
    };

    const handleGenreChange = (genreId) => {
        const g = genres.find(x => x.id === genreId);
        setForm(p => ({ ...p, genre_id: genreId, genre: g?.name || '', problem_id: '', problem: '' }));
        setProblems([]);
        loadProblems(genreId);
    };

    const handleProblemChange = (problemId) => {
        if (problemId === '__none__') {
            setForm(p => ({ ...p, problem_id: '', problem: '' }));
            return;
        }
        const prob = problems.find(x => x.id === problemId);
        setForm(p => ({ ...p, problem_id: problemId, problem: prob?.name || '' }));
    };

    const addOption = () => {
        setOptions(prev => [...prev, { option_text: '', praise: '', risk: '', next_action: '', order: prev.length, _saved: false }]);
    };

    const updateOption = (idx, field, value) => {
        setOptions(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
    };

    const removeOption = async (idx) => {
        const opt = options[idx];
        if (opt._saved && opt.id) {
            if (!confirm('この選択肢を削除しますか？')) return;
            await base44.entities.CaseQuizOption.delete(opt.id);
        }
        setOptions(prev => prev.filter((_, i) => i !== idx));
    };

    const save = async () => {
        if (!form.genre || !form.scenario || !form.question) return alert('ジャンル・事例・質問文は必須です');
        setSaving(true);
        let quizId = quiz?.id;
        const saveData = {
            genre: form.genre,
            problem: form.problem,
            scenario: form.scenario,
            question: form.question,
            common_feedback: form.common_feedback,
            order: form.order,
            is_active: form.is_active,
        };
        if (form.book_id) saveData.book_id = form.book_id;

        if (isNew) {
            const created = await base44.entities.CaseQuiz.create(saveData);
            quizId = created.id;
        } else {
            await base44.entities.CaseQuiz.update(quizId, saveData);
        }
        for (const opt of options) {
            const data = { quiz_id: quizId, option_text: opt.option_text, praise: opt.praise, risk: opt.risk, next_action: opt.next_action, order: opt.order };
            if (opt._saved && opt.id) {
                await base44.entities.CaseQuizOption.update(opt.id, data);
            } else {
                await base44.entities.CaseQuizOption.create(data);
            }
        }
        setSaving(false);
        onBack();
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-8">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
                <ArrowLeft className="w-4 h-4" /> 一覧に戻る
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{isNew ? 'クイズを追加' : 'クイズを編集'}</h2>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 mb-6">
                {/* ジャンル・悩みカテゴリ（連動プルダウン） */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">ジャンル *</label>
                        <Select value={form.genre_id || ''} onValueChange={handleGenreChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                                {genres.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">悩みカテゴリ</label>
                        <Select value={form.problem_id || '__none__'} onValueChange={handleProblemChange} disabled={!form.genre_id}>
                            <SelectTrigger>
                                <SelectValue placeholder="（任意）" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">（なし）</SelectItem>
                                {problems.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 事例本文 */}
                <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">事例本文（scenario）*</label>
                    <textarea
                        value={form.scenario}
                        onChange={e => setForm(p => ({ ...p, scenario: e.target.value }))}
                        placeholder="シチュエーション（3〜5行）"
                        rows={4}
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                </div>

                {/* 質問文 */}
                <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">質問文（question）*</label>
                    <Input value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} placeholder="この状況でどう対応しますか？" />
                </div>

                {/* 共通フィードバック */}
                <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">共通フィードバック（1行）</label>
                    <Input value={form.common_feedback} onChange={e => setForm(p => ({ ...p, common_feedback: e.target.value }))} placeholder="この問いのポイントは..." />
                </div>

                {/* 本ID・order・is_active */}
                <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">本ID（任意）</label>
                        <Input value={form.book_id} onChange={e => setForm(p => ({ ...p, book_id: e.target.value }))} placeholder="本に紐づける場合" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">表示順</label>
                        <Input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                        <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
                        <label htmlFor="is_active" className="text-sm text-gray-700">配信中</label>
                    </div>
                </div>
            </div>

            {/* 選択肢 */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">選択肢（{options.length}個）</h3>
                    {options.length < 6 && (
                        <button onClick={addOption} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <Plus className="w-4 h-4" /> 追加
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {options.map((opt, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500">選択肢 {String.fromCharCode(65 + idx)}</span>
                                <button onClick={() => removeOption(idx)} className="text-gray-300 hover:text-red-400">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">選択肢テキスト *</label>
                                <Input value={opt.option_text} onChange={e => updateOption(idx, 'option_text', e.target.value)} placeholder="選択肢の文章" />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <div>
                                    <label className="text-xs text-emerald-600 mb-1 block">✅ praise（良い点）</label>
                                    <Input value={opt.praise || ''} onChange={e => updateOption(idx, 'praise', e.target.value)} placeholder="この選択の良い点..." />
                                </div>
                                <div>
                                    <label className="text-xs text-amber-600 mb-1 block">⚠️ risk（落とし穴）</label>
                                    <Input value={opt.risk || ''} onChange={e => updateOption(idx, 'risk', e.target.value)} placeholder="注意すべき点..." />
                                </div>
                                <div>
                                    <label className="text-xs text-indigo-600 mb-1 block">🚀 next_action（次の一手）</label>
                                    <Input value={opt.next_action || ''} onChange={e => updateOption(idx, 'next_action', e.target.value)} placeholder="次にやること..." />
                                </div>
                            </div>
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-xl">
                            選択肢を追加してください（4〜6択）
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <Button onClick={save} disabled={saving} className="gap-2">
                    {saving ? '保存中...' : <><Check className="w-4 h-4" /> 保存</>}
                </Button>
                <Button variant="outline" onClick={onBack}>キャンセル</Button>
            </div>
        </div>
    );
}