import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const NODE_TYPES = ['question', 'end'];

function OptionRow({ opt, index, allNodes, editingNode, onChange, onDelete }) {
    return (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {opt.option_key || String.fromCharCode(65 + index)}
                </span>
                <Input
                    value={opt.option_key || ''}
                    onChange={e => onChange('option_key', e.target.value)}
                    placeholder="Key (A)"
                    className="w-16 h-7 text-sm"
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
            {/* tag_effects */}
            <div className="flex items-center gap-2 pl-8">
                <span className="text-xs text-gray-500 whitespace-nowrap">タグ効果：</span>
                <Input
                    value={JSON.stringify(opt.tag_effects || [])}
                    onChange={e => {
                        try { onChange('tag_effects', JSON.parse(e.target.value)); } catch {}
                    }}
                    placeholder='例：[{"tag":"営業","delta":2}]'
                    className="flex-1 h-7 text-xs font-mono"
                />
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
        is_active: true,
        ...node,
    });
    const [opts, setOpts] = useState(
        (node?._options || []).map(o => ({ ...o }))
    );
    const [circularWarning, setCircularWarning] = useState(null);

    const updateOpt = (idx, field, value) => {
        setOpts(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
    };

    const addOpt = () => {
        const key = String.fromCharCode(65 + opts.length);
        setOpts(prev => [...prev, { option_key: key, option_text: '', next_node_id: '', tag_effects: [] }]);
    };

    const removeOpt = (idx) => {
        setOpts(prev => prev.filter((_, i) => i !== idx));
    };

    // Circular reference check
    useEffect(() => {
        if (!node?.id) { setCircularWarning(null); return; }
        const visited = new Set();
        const nodeMap = {};
        allNodes.forEach(n => nodeMap[n.id] = n);

        const hasCycle = (startId) => {
            const stack = [startId];
            while (stack.length > 0) {
                const cur = stack.pop();
                if (visited.has(cur)) return true;
                visited.add(cur);
                const nexts = opts.filter(o => o.next_node_id).map(o => o.next_node_id);
                for (const nid of nexts) if (nid === startId) return true;
            }
            return false;
        };

        const cycle = opts.some(o => o.next_node_id && o.next_node_id === node?.id);
        setCircularWarning(cycle ? '自己参照（ループ）が検出されました。next_node_idを確認してください。' : null);
    }, [opts, node?.id]);

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
                        {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

            {/* 選択肢 + 分岐設定 */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">選択肢と分岐先</label>
                    <button onClick={addOpt} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> 選択肢を追加
                    </button>
                </div>
                {circularWarning && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {circularWarning}
                    </div>
                )}
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