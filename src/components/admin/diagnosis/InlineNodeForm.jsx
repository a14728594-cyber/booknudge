import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export default function InlineNodeForm({ onSave, onCancel }) {
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [nodeType, setNodeType] = useState('question');
    const [opts, setOpts] = useState([
        { option_key: 'A', option_text: '' },
        { option_key: 'B', option_text: '' },
    ]);

    const addOpt = () => {
        const key = String.fromCharCode(65 + opts.length);
        setOpts([...opts, { option_key: key, option_text: '' }]);
    };

    const removeOpt = (idx) => setOpts(opts.filter((_, i) => i !== idx));

    const updateOpt = (idx, val) => {
        const next = [...opts];
        next[idx] = { ...next[idx], option_text: val };
        setOpts(next);
    };

    const handleSave = () => {
        if (!title.trim() || !prompt.trim()) return;
        onSave({ title, prompt, node_type: nodeType, nodeOptions: opts });
    };

    const isEnd = nodeType === 'end';

    return (
        <div className="ml-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
                <select
                    value={nodeType}
                    onChange={e => setNodeType(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1.5 bg-white text-gray-700"
                >
                    <option value="question">question（質問）</option>
                    <option value="end">end（終了）</option>
                </select>
            </div>

            <Input
                placeholder="タイトル（短い識別子 例：MKT_A1）"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-white text-sm"
            />
            <textarea
                placeholder="質問文"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={2}
            />

            {!isEnd && (
                <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium">選択肢</p>
                    {opts.map((o, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 w-5 flex-shrink-0">{o.option_key}.</span>
                            <Input
                                placeholder={`選択肢 ${o.option_key}`}
                                value={o.option_text}
                                onChange={e => updateOpt(idx, e.target.value)}
                                className="bg-white text-sm flex-1"
                            />
                            {opts.length > 1 && (
                                <button onClick={() => removeOpt(idx)} className="text-gray-400 hover:text-red-400 flex-shrink-0">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={addOpt}
                        className="text-xs text-indigo-500 flex items-center gap-1 hover:text-indigo-700 mt-1"
                    >
                        <Plus className="w-3 h-3" /> 選択肢を追加
                    </button>
                </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={onCancel}>キャンセル</Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!title.trim() || !prompt.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    保存して接続
                </Button>
            </div>
        </div>
    );
}