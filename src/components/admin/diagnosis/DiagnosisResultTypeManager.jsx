import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react';

function TypeForm({ form, setForm, onSave, onCancel, title }) {
    return (
        <div className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 text-sm">{title}</h3>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">タイプキー（英数字）<span className="text-red-500">*</span></label>
                    <Input
                        value={form.key}
                        onChange={e => setForm(p => ({ ...p, key: e.target.value }))}
                        placeholder="例: marketing_lost"
                        className="text-sm h-8 font-mono"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">表示名<span className="text-red-500">*</span></label>
                    <Input
                        value={form.label}
                        onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                        placeholder="例: 集客迷子タイプ"
                        className="text-sm h-8"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">絵文字</label>
                    <Input
                        value={form.emoji}
                        onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                        placeholder="🎯"
                        className="text-sm h-8 w-20"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">ジャンル（絞り込み用）</label>
                    <Input
                        value={form.genre}
                        onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
                        placeholder="例：マーケ（空=全ジャンル）"
                        className="text-sm h-8"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">表示順</label>
                    <Input
                        type="number"
                        value={form.order}
                        onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                        className="text-sm h-8"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs text-gray-500 mb-1 block">説明文（ユーザーに表示）</label>
                <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="このタイプの詳細説明..."
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    rows={2}
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 mb-1 block">今必要なこと（方向性の一言）</label>
                <Input
                    value={form.direction}
                    onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}
                    placeholder="例: 集客手段より先に、強みを言語化することが先決"
                    className="text-sm h-8"
                />
            </div>
            <div className="flex gap-2 pt-1">
                <Button onClick={onSave} disabled={!form.key || !form.label} className="bg-indigo-600 hover:bg-indigo-700 text-sm h-8">
                    <Check className="w-3 h-3 mr-1" /> 保存
                </Button>
                <Button variant="outline" onClick={onCancel} className="text-sm h-8">キャンセル</Button>
            </div>
        </div>
    );
}

export default function DiagnosisResultTypeManager() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ key: '', label: '', emoji: '', genre: '', description: '', direction: '', order: 0 });

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        setLoading(true);
        const list = await base44.entities.DiagnosisResultType.list('order', 100);
        setTypes(list);
        setLoading(false);
    };

    const resetForm = () => {
        setForm({ key: '', label: '', emoji: '', genre: '', description: '', direction: '', order: types.length });
    };

    const handleEdit = (t) => {
        setEditingId(t.id);
        setForm({ key: t.key, label: t.label, emoji: t.emoji || '', genre: t.genre || '', description: t.description || '', direction: t.direction || '', order: t.order || 0 });
        setShowForm(false);
    };

    const handleSaveEdit = async () => {
        await base44.entities.DiagnosisResultType.update(editingId, form);
        setEditingId(null);
        await loadTypes();
    };

    const handleCreate = async () => {
        if (!form.key || !form.label) return;
        await base44.entities.DiagnosisResultType.create(form);
        setShowForm(false);
        resetForm();
        await loadTypes();
    };

    const handleDelete = async (t) => {
        if (!confirm(`タイプ「${t.label}」を削除しますか？`)) return;
        await base44.entities.DiagnosisResultType.delete(t.id);
        await loadTypes();
    };

    if (loading) return <div className="text-center py-8 text-gray-400">読み込み中...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">診断結果タイプ</h2>
                    <p className="text-sm text-gray-500">各タイプのラベル・説明・絵文字を設定します</p>
                </div>
                <Button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-sm">
                    <Plus className="w-4 h-4" /> タイプを追加
                </Button>
            </div>

            {showForm && (
                <TypeForm
                    form={form}
                    setForm={setForm}
                    onSave={handleCreate}
                    onCancel={() => setShowForm(false)}
                    title="新規タイプ作成"
                />
            )}

            <div className="space-y-3">
                {types.map(t => (
                    <div key={t.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {editingId === t.id ? (
                            <div className="p-4">
                                <TypeForm
                                    form={form}
                                    setForm={setForm}
                                    onSave={handleSaveEdit}
                                    onCancel={() => setEditingId(null)}
                                    title="タイプを編集"
                                />
                            </div>
                        ) : (
                            <div className="flex items-start gap-4 p-4">
                                <span className="text-3xl">{t.emoji || '🎯'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-900">{t.label}</span>
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{t.key}</span>
                                    </div>
                                    {t.description && <p className="text-sm text-gray-600 mb-1">{t.description}</p>}
                                    {t.direction && <p className="text-xs text-indigo-600">💡 {t.direction}</p>}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(t)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {types.length === 0 && !showForm && (
                    <div className="text-center py-12 text-gray-400">
                        <p>診断結果タイプがまだ登録されていません</p>
                        <p className="text-sm mt-1">「タイプを追加」ボタンから作成してください</p>
                    </div>
                )}
            </div>
        </div>
    );
}