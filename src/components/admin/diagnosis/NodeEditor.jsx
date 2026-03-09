import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

function TypeScoreRow({ typeKey, score, onChange, onDelete, resultTypes }) {
    return (
        <div className="flex items-center gap-2">
            <select
                value={typeKey}
                onChange={e => onChange('type_key', e.target.value)}
                className="flex-1 border rounded-lg text-xs px-2 py-1 bg-white h-7"
            >
                <option value="">タイプを選択</option>
                {resultTypes.map(t => (
                    <option key={t.id} value={t.key}>{t.emoji || ''} {t.label} ({t.key})</option>
                ))}
            </select>
            <span className="text-xs text-gray-500 whitespace-nowrap">+</span>
            <Input
                type="number"
                value={score}
                onChange={e => onChange('score', Number(e.target.value))}
                className="w-16 h-7 text-xs text-center"
                min={1}
                max={10}
            />
            <span className="text-xs text-gray-400">点</span>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}

function OptionRow({ opt, index, allNodes, editingNode, onChange, onDelete, resultTypes }) {
    const typeScores = opt.type_scores || [];

    const addTypeScore = () => {
        onChange('type_scores', [...typeScores, { type_key: '', score: 1 }]);
    };

    const updateTypeScore = (idx, field, value) => {
        const updated = typeScores.map((ts, i) => i === idx ? { ...ts, [field]: value } : ts);
        onChange('type_scores', updated);
    };

    const removeTypeScore = (idx) => {
        onChange('type_scores', typeScores.filter((_, i) => i !== idx));
    };

    return (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
            <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {opt.option_key || String.fromCharCode(65 + index)}
                </span>
                <Input
                    value={opt.option_key || ''}
                    onChange={e => onChange('option_key', e.target.value)}
                    placeholder="Key (A)"
                    className="w-14 h-7 text-sm"
                />
                <Input
                    value={opt.option_text || ''}
                    onChange={e => onChange('option_text', e.target.value)}
                    placeholder="選択肢テキスト"
                    className="flex-1 h-7 text-sm"
                />
                <button onClick={onDelete} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* 次の質問 */}
            <div className="flex items-center gap-2 pl-8">
                <span className="text-xs text-gray-500 whitespace-nowrap">次の質問：</span>
                <select
                    value={opt.next_node_id || ''}
                    onChange={e => onChange('next_node_id', e.target.value)}
                    className="flex-1 border rounded-lg text-xs px-2 py-1 bg-white h-7"
                >
                    <option value="">✓ ここで終了</option>
                    {allNodes
                        .filter(n => !editingNode || n.id !== editingNode.id)
                        .map(n => (
                            <option key={n.id} value={n.id}>
                                {n.title ? `[${n.title}] ` : ''}{n.prompt?.slice(0, 40)}
                            </option>
                        ))
                    }
                </select>
            </div>

            {/* タイプ加点 */}
            <div className="pl-8 space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">診断タイプへの加点</span>
                    <button onClick={addTypeScore} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> 加点追加
                    </button>
                </div>
                {typeScores.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">加点なし（タイプスコアに影響しません）</p>
                ) : (
                    typeScores.map((ts, idx) => (
                        <TypeScoreRow
                            key={idx}
                            typeKey={ts.type_key || ''}
                            score={ts.score || 1}
                            onChange={(field, val) => updateTypeScore(idx, field, val)}
                            onDelete={() => removeTypeScore(idx)}
                            resultTypes={resultTypes}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function NodeEditor({ node, allNodes, onSave, onCancel, selectedGenre, mode = 'edit' }) {
    const [form, setForm] = useState({
        node_type: 'question',
        prompt: '',
        title: '',
        problem: '',
        order: 0,
        weight: 1,
        is_active: true,
        ...node,
    });
    const [opts, setOpts] = useState(
        (node?._options || []).map(o => ({ ...o }))
    );
    const [resultTypes, setResultTypes] = useState([]);

    useEffect(() => {
        base44.entities.DiagnosisResultType.list('order', 100).then(setResultTypes).catch(() => {});
    }, []);

    const updateOpt = (idx, field, value) => {
        setOpts(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
    };

    const addOpt = () => {
        const key = String.fromCharCode(65 + opts.length);
        setOpts(prev => [...prev, { option_key: key, option_text: '', next_node_id: '', type_scores: [] }]);
    };

    const removeOpt = (idx) => {
        setOpts(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = () => {
        if (!form.prompt.trim() || !form.title?.trim()) return;
        onSave({ node: form, options: opts });
    };

    return (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                    {mode === 'create' ? '新規質問を追加' : '質問を編集'}
                </h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">タイプ</label>
                    <select
                        value={form.node_type}
                        onChange={e => setForm(p => ({ ...p, node_type: e.target.value }))}
                        className="w-full border rounded-lg text-sm px-2 py-1.5"
                    >
                        {['question', 'end'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">悩みカテゴリ</label>
                    <Input
                        value={form.problem || ''}
                        onChange={e => setForm(p => ({ ...p, problem: e.target.value }))}
                        placeholder="例：集客できない"
                        className="text-sm h-8"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">タイトル <span className="text-red-500">*</span></label>
                    <Input
                        value={form.title || ''}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="例：MKT_A1"
                        className="text-sm h-8"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">表示順</label>
                    <Input
                        type="number"
                        value={form.order || 0}
                        onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                        className="text-sm h-8"
                    />
                </div>
            </div>

            {/* 重み */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <label className="text-xs font-medium text-amber-800 mb-1 block">⚖️ 質問の重み（加点係数）</label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={1}
                        max={5}
                        step={0.5}
                        value={form.weight || 1}
                        onChange={e => setForm(p => ({ ...p, weight: Number(e.target.value) }))}
                        className="flex-1"
                    />
                    <span className="text-amber-700 font-bold text-sm w-8 text-center">{form.weight || 1}x</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">選択肢の加点にこの係数をかけます。重要な質問は2〜3に設定してください。</p>
            </div>

            <div>
                <label className="text-xs text-gray-500 mb-1 block">質問文 <span className="text-red-500">*</span></label>
                <textarea
                    value={form.prompt}
                    onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))}
                    placeholder="ユーザーに表示する質問文"
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    rows={3}
                />
            </div>

            {/* 選択肢 */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">選択肢・分岐先・加点設定</label>
                    <button onClick={addOpt} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> 選択肢を追加
                    </button>
                </div>
                <div className="space-y-2">
                    {opts.map((opt, idx) => (
                        <OptionRow
                            key={idx}
                            opt={opt}
                            index={idx}
                            allNodes={allNodes}
                            editingNode={node}
                            onChange={(field, val) => updateOpt(idx, field, val)}
                            onDelete={() => removeOpt(idx)}
                            resultTypes={resultTypes}
                        />
                    ))}
                    {opts.length === 0 && (
                        <p className="text-xs text-gray-400 py-2 pl-1">選択肢なし（このノードが終点になります）</p>
                    )}
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={!form.prompt.trim() || !form.title?.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                    <Check className="w-4 h-4 mr-1" /> 保存
                </Button>
                <Button variant="outline" onClick={onCancel}>キャンセル</Button>
            </div>
        </div>
    );
}