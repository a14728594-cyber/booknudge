import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function InlineNodeForm({ onSave, onCancel, selectedGenre = '' }) {
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [genre, setGenre] = useState(selectedGenre);
    const [problem, setProblem] = useState('');
    const [nodeType, setNodeType] = useState('question');
    const [flagStart, setFlagStart] = useState(false);
    const [flagEnd, setFlagEnd] = useState(false);
    const [opts, setOpts] = useState([
        { option_key: 'A', option_text: '', type_scores: [] },
        { option_key: 'B', option_text: '', type_scores: [] },
    ]);
    const [resultTypes, setResultTypes] = useState([]);

    useEffect(() => {
        base44.entities.DiagnosisResultType.list('order', 100).then(setResultTypes).catch(() => {});
    }, []);

    const addOpt = () => {
        const key = String.fromCharCode(65 + opts.length);
        setOpts([...opts, { option_key: key, option_text: '', type_scores: [] }]);
    };

    const removeOpt = (idx) => setOpts(opts.filter((_, i) => i !== idx));

    const updateOpt = (idx, field, val) => {
        const next = [...opts];
        next[idx] = { ...next[idx], [field]: val };
        setOpts(next);
    };

    const getNodeType = () => {
        if (flagEnd) return 'end';
        if (flagStart) return 'start';
        return 'question';
    };

    const handleSave = () => {
        if (!title.trim() || !prompt.trim()) return;
        onSave({
            title,
            prompt,
            genre,
            problem,
            node_type: getNodeType(),
            weight: 1,
            nodeOptions: opts,
        });
    };

    const isEnd = flagEnd;

    return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
            {/* 基本設定 */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">ジャンル</label>
                    <Input
                        value={genre}
                        onChange={e => setGenre(e.target.value)}
                        placeholder="例：マーケ"
                        className="bg-white text-sm h-8"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">悩み大分類</label>
                    <Input
                        value={problem}
                        onChange={e => setProblem(e.target.value)}
                        placeholder="例：集客できない"
                        className="bg-white text-sm h-8"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">タイトル（識別子）<span className="text-red-500">*</span></label>
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="例：MKT_A1"
                        className="bg-white text-sm h-8 font-mono"
                    />
                </div>
            </div>

            {/* フラグ */}
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <div
                        onClick={() => { setFlagStart(!flagStart); if (!flagStart) setFlagEnd(false); }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${flagStart ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                    >
                        {flagStart && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">🚀 最初の質問</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <div
                        onClick={() => { setFlagEnd(!flagEnd); if (!flagEnd) setFlagStart(false); }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${flagEnd ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}
                    >
                        {flagEnd && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">🏁 最後の質問</span>
                </label>
            </div>

            {/* 質問文 */}
            <div>
                <label className="text-xs text-gray-500 mb-1 block">質問文 <span className="text-red-500">*</span></label>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="ユーザーに表示する質問文"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    rows={2}
                />
            </div>

            {/* 選択肢 */}
            {!isEnd && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600">選択肢</p>
                        <button onClick={addOpt} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> 追加
                        </button>
                    </div>
                    <div className="space-y-2">
                        {opts.map((o, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                        {o.option_key}
                                    </span>
                                    <Input
                                        value={o.option_key}
                                        onChange={e => updateOpt(idx, 'option_key', e.target.value)}
                                        className="w-12 h-7 text-xs font-mono"
                                        placeholder="Key"
                                    />
                                    <Input
                                        value={o.option_text}
                                        onChange={e => updateOpt(idx, 'option_text', e.target.value)}
                                        placeholder={`選択肢 ${o.option_key}`}
                                        className="flex-1 text-sm h-7"
                                    />
                                    {opts.length > 1 && (
                                        <button onClick={() => removeOpt(idx)} className="text-gray-300 hover:text-red-400">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                {/* 加点設定 */}
                                <div className="pl-7 space-y-1">
                                    {(o.type_scores || []).map((ts, tsIdx) => (
                                        <div key={tsIdx} className="flex items-center gap-2">
                                            <select
                                                value={ts.type_key || ''}
                                                onChange={e => {
                                                    const scores = [...(o.type_scores || [])];
                                                    scores[tsIdx] = { ...scores[tsIdx], type_key: e.target.value };
                                                    updateOpt(idx, 'type_scores', scores);
                                                }}
                                                className="flex-1 border rounded text-xs px-2 py-1 bg-white"
                                            >
                                                <option value="">タイプ選択…</option>
                                                {resultTypes.map(t => (
                                                    <option key={t.id} value={t.key}>{t.emoji || '🎯'} {t.label}</option>
                                                ))}
                                            </select>
                                            <span className="text-emerald-600 text-xs font-bold">+</span>
                                            <Input
                                                type="number"
                                                value={ts.score || 1}
                                                onChange={e => {
                                                    const scores = [...(o.type_scores || [])];
                                                    scores[tsIdx] = { ...scores[tsIdx], score: Number(e.target.value) };
                                                    updateOpt(idx, 'type_scores', scores);
                                                }}
                                                className="w-12 h-6 text-xs text-center"
                                                min={1} max={10}
                                            />
                                            <span className="text-xs text-gray-400">点</span>
                                            <button
                                                onClick={() => {
                                                    const scores = (o.type_scores || []).filter((_, i) => i !== tsIdx);
                                                    updateOpt(idx, 'type_scores', scores);
                                                }}
                                                className="text-gray-300 hover:text-red-400"
                                            >
                                                <span className="text-xs">✕</span>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const scores = [...(o.type_scores || []), { type_key: '', score: 1 }];
                                            updateOpt(idx, 'type_scores', scores);
                                        }}
                                        className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> 加点設定を追加
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
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
                    保存
                </Button>
            </div>
        </div>
    );
}