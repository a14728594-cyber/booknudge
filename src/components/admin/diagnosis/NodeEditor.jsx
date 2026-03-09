import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check, ArrowRight, ChevronsRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

function TypeScoreRow({ typeKey, score, onChange, onDelete, resultTypes }) {
    return (
        <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-emerald-200">
            <select
                value={typeKey}
                onChange={e => onChange('type_key', e.target.value)}
                className="flex-1 text-xs bg-transparent border-none focus:outline-none text-gray-700"
            >
                <option value="">タイプを選択…</option>
                {resultTypes.map(t => (
                    <option key={t.id} value={t.key}>{t.emoji || '🎯'} {t.label}</option>
                ))}
            </select>
            <span className="text-emerald-600 font-bold text-xs">+</span>
            <div className="flex gap-1">
                {[1, 2].map(pt => (
                    <button
                        key={pt}
                        onClick={() => onChange('score', pt)}
                        className={`w-7 h-6 rounded text-xs font-bold border transition-colors ${score === pt ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-400'}`}
                    >
                        {pt}
                    </button>
                ))}
            </div>
            <span className="text-xs text-gray-400">点</span>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-400 ml-1">
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}

function OptionCard({ opt, index, allNodes, editingNodeId, onChange, onDelete, resultTypes }) {
    const typeScores = opt.type_scores || [];
    const nextNode = allNodes.find(n => n.id === opt.next_node_id);

    const addTypeScore = () => onChange('type_scores', [...typeScores, { type_key: '', score: 1 }]);
    const updateTypeScore = (idx, field, value) => {
        onChange('type_scores', typeScores.map((ts, i) => i === idx ? { ...ts, [field]: value } : ts));
    };
    const removeTypeScore = (idx) => onChange('type_scores', typeScores.filter((_, i) => i !== idx));

    const label = opt.option_key || String.fromCharCode(65 + index);

    return (
        <div className="rounded-xl border-2 border-gray-200 overflow-hidden bg-white hover:border-indigo-200 transition-colors">
            {/* 選択肢ヘッダー */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {label}
                </span>
                <Input
                    value={opt.option_key || ''}
                    onChange={e => onChange('option_key', e.target.value)}
                    placeholder="Key"
                    className="w-12 h-7 text-xs font-mono bg-white"
                />
                <Input
                    value={opt.option_text || ''}
                    onChange={e => onChange('option_text', e.target.value)}
                    placeholder="選択肢テキストを入力"
                    className="flex-1 h-7 text-sm bg-white font-medium"
                />
                <button onClick={onDelete} className="text-gray-300 hover:text-red-400 flex-shrink-0 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="px-3 py-3 space-y-3">
                {/* 分岐先 */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium">分岐先</span>
                    </div>
                    <select
                        value={opt.next_node_id || ''}
                        onChange={e => onChange('next_node_id', e.target.value)}
                        className="flex-1 border rounded-lg text-xs px-2 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                    >
                        <option value="">✓ ここで終了（診断完了）</option>
                        {allNodes
                            .filter(n => n.id !== editingNodeId)
                            .map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.title ? `[${n.title}] ` : ''}{n.prompt?.slice(0, 45)}
                                </option>
                            ))}
                    </select>
                    {nextNode && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                            → {nextNode.title || nextNode.prompt?.slice(0, 12)}
                        </span>
                    )}
                    {!opt.next_node_id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                            終了
                        </span>
                    )}
                </div>

                {/* 加点設定 */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <ChevronsRight className="w-3.5 h-3.5 text-emerald-500" />
                            <span>診断タイプへの加点</span>
                            {typeScores.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                    {typeScores.length}件
                                </span>
                            )}
                        </div>
                        <button
                            onClick={addTypeScore}
                            className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-medium"
                        >
                            <Plus className="w-3 h-3" /> 加点追加
                        </button>
                    </div>
                    {typeScores.length === 0 ? (
                        <p className="text-xs text-gray-400 italic pl-1">加点なし</p>
                    ) : (
                        <div className="space-y-1.5">
                            {typeScores.map((ts, idx) => (
                                <TypeScoreRow
                                    key={idx}
                                    typeKey={ts.type_key || ''}
                                    score={ts.score || 1}
                                    onChange={(field, val) => updateTypeScore(idx, field, val)}
                                    onDelete={() => removeTypeScore(idx)}
                                    resultTypes={resultTypes}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function NodeEditor({ node, allNodes, onSave, onCancel, selectedGenre, mode = 'edit' }) {
    const isStart = node?.node_type === 'start';
    const isEnd = node?.node_type === 'end';

    const [form, setForm] = useState({
        node_type: 'question',
        prompt: '',
        title: '',
        genre: selectedGenre || '',
        problem: '',
        order: 0,
        is_active: true,
        ...node,
    });
    const [flagStart, setFlagStart] = useState(isStart);
    const [flagEnd, setFlagEnd] = useState(isEnd);
    const [opts, setOpts] = useState((node?._options || []).map(o => ({ ...o })));
    const [resultTypes, setResultTypes] = useState([]);

    useEffect(() => {
        base44.entities.DiagnosisResultType.list('order', 100).then(setResultTypes).catch(() => {});
    }, []);

    // ジャンルでタイプ候補を絞り込む（genreが空のタイプは全ジャンルで表示）
    const filteredTypes = resultTypes.filter(t => !t.genre || t.genre === form.genre);

    const getNodeType = () => {
        if (flagEnd) return 'end';
        if (flagStart) return 'start';
        return 'question';
    };

    const updateOpt = (idx, field, value) => {
        setOpts(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
    };

    const addOpt = () => {
        const key = String.fromCharCode(65 + opts.length);
        setOpts(prev => [...prev, { option_key: key, option_text: '', next_node_id: '', type_scores: [] }]);
    };

    const removeOpt = (idx) => setOpts(prev => prev.filter((_, i) => i !== idx));

    const handleSave = () => {
        if (!form.prompt.trim() || !form.title?.trim()) return;
        onSave({ node: { ...form, node_type: getNodeType() }, options: opts });
    };

    const isEndNode = flagEnd;

    return (
        <div className="space-y-5">
            {/* セクション1: 基本設定 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">基本設定</h4>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">ジャンル</label>
                        <Input
                            value={form.genre || ''}
                            onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
                            placeholder="例：マーケ、営業"
                            className="text-sm h-8 bg-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">悩み大分類</label>
                        <Input
                            value={form.problem || ''}
                            onChange={e => setForm(p => ({ ...p, problem: e.target.value }))}
                            placeholder="例：集客できない"
                            className="text-sm h-8 bg-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">タイトル（識別子）<span className="text-red-500">*</span></label>
                        <Input
                            value={form.title || ''}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="例：MKT_A1"
                            className="text-sm h-8 bg-white font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">表示順</label>
                        <Input
                            type="number"
                            value={form.order || 0}
                            onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                            className="text-sm h-8 bg-white"
                        />
                    </div>
                </div>

                {/* 最初・最後フラグ */}
                <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                            onClick={() => { setFlagStart(!flagStart); if (!flagStart) setFlagEnd(false); }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${flagStart ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}
                        >
                            {flagStart && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">🚀 最初の質問（診断開始）</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                            onClick={() => { setFlagEnd(!flagEnd); if (!flagEnd) setFlagStart(false); }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${flagEnd ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}
                        >
                            {flagEnd && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">🏁 最後の質問（診断完了）</span>
                    </label>
                </div>
            </div>

            {/* セクション2: 質問文 */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">質問文 <span className="text-red-500">*</span></label>
                <textarea
                    value={form.prompt}
                    onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))}
                    placeholder="ユーザーに表示する質問文"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-indigo-400 transition-colors"
                    rows={3}
                />
            </div>

            {/* セクション3: 選択肢 */}
            {!isEndNode && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">選択肢・分岐・加点設定</h4>
                        <button
                            onClick={addOpt}
                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                            <Plus className="w-3 h-3" /> 選択肢を追加
                        </button>
                    </div>
                    <div className="space-y-3">
                        {opts.map((opt, idx) => (
                            <OptionCard
                                key={idx}
                                opt={opt}
                                index={idx}
                                allNodes={allNodes}
                                editingNodeId={node?.id}
                                onChange={(field, val) => updateOpt(idx, field, val)}
                                onDelete={() => removeOpt(idx)}
                                resultTypes={resultTypes}
                            />
                        ))}
                        {opts.length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                                選択肢なし — 「選択肢を追加」から追加してください
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isEndNode && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                    🏁 終了ノードのため選択肢はありません。このノードに到達した時点で診断スコアを集計します。
                </div>
            )}

            <div className="flex gap-2 pt-1 border-t border-gray-100">
                <Button
                    onClick={handleSave}
                    disabled={!form.prompt.trim() || !form.title?.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    <Check className="w-4 h-4 mr-1" /> 保存
                </Button>
                <Button variant="outline" onClick={onCancel}>キャンセル</Button>
            </div>
        </div>
    );
}