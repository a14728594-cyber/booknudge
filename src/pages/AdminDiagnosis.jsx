import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';

const GENRES = ['マーケ', '営業', 'アイデア', '人間関係', '習慣', 'マインドセット'];
const NODE_TYPES = ['start', 'question', 'end'];

export default function AdminDiagnosis() {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
    const [expandedNodes, setExpandedNodes] = useState({});
    const [editingNode, setEditingNode] = useState(null);
    const [editingOption, setEditingOption] = useState(null);
    const [newNodeForm, setNewNodeForm] = useState(null);
    const [newOptionForm, setNewOptionForm] = useState(null);

    useEffect(() => {
        checkAdmin();
    }, []);

    useEffect(() => {
        loadData();
    }, [selectedGenre]);

    const checkAdmin = async () => {
        const user = await base44.auth.me();
        if (user?.role !== 'admin') navigate(createPageUrl('home'));
    };

    const loadData = async () => {
        setLoading(true);
        const [allNodes, allOptions] = await Promise.all([
            base44.entities.DiagnosisNode.filter({ genre: selectedGenre }, 'order', 100),
            base44.entities.DiagnosisOption.list('order', 500),
        ]);
        setNodes(allNodes);
        setOptions(allOptions);
        setLoading(false);
    };

    const nodeOptions = (nodeId) => options.filter(o => o.node_id === nodeId).sort((a, b) => (a.order || 0) - (b.order || 0));

    // Node CRUD
    const createNode = async () => {
        if (!newNodeForm?.prompt) return;
        await base44.entities.DiagnosisNode.create({
            genre: selectedGenre,
            ...newNodeForm,
            is_active: true,
        });
        setNewNodeForm(null);
        loadData();
    };

    const updateNode = async (id, data) => {
        await base44.entities.DiagnosisNode.update(id, data);
        setEditingNode(null);
        loadData();
    };

    const deleteNode = async (id) => {
        if (!confirm('このノードと関連する選択肢を削除しますか？')) return;
        await base44.entities.DiagnosisNode.delete(id);
        const nodeOpts = options.filter(o => o.node_id === id);
        for (const o of nodeOpts) await base44.entities.DiagnosisOption.delete(o.id);
        loadData();
    };

    // Option CRUD
    const createOption = async (nodeId) => {
        if (!newOptionForm?.option_text) return;
        await base44.entities.DiagnosisOption.create({
            node_id: nodeId,
            option_key: newOptionForm.option_key || 'A',
            option_text: newOptionForm.option_text,
            tag_effects: [],
            next_node_id: newOptionForm.next_node_id || '',
            order: newOptionForm.order || 0,
        });
        setNewOptionForm(null);
        loadData();
    };

    const updateOption = async (id, data) => {
        await base44.entities.DiagnosisOption.update(id, data);
        setEditingOption(null);
        loadData();
    };

    const deleteOption = async (id) => {
        await base44.entities.DiagnosisOption.delete(id);
        loadData();
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">深掘り診断 管理</h1>
                <div className="text-sm text-gray-500">DiagnosisNode / DiagnosisOption</div>
            </div>

            {/* ジャンル切り替え */}
            <div className="flex gap-2 mb-8 flex-wrap">
                {GENRES.map(g => (
                    <button
                        key={g}
                        onClick={() => setSelectedGenre(g)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedGenre === g ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:border-indigo-400'}`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">読み込み中...</div>
            ) : (
                <>
                    {/* ノード一覧 */}
                    <div className="space-y-3 mb-6">
                        {nodes.map(node => (
                            <div key={node.id} className="bg-white rounded-xl border border-gray-200">
                                <div className="flex items-center gap-3 p-4">
                                    <button onClick={() => setExpandedNodes(prev => ({ ...prev, [node.id]: !prev[node.id] }))}>
                                        {expandedNodes[node.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    </button>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${node.node_type === 'start' ? 'bg-green-100 text-green-700' : node.node_type === 'end' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {node.node_type}
                                    </span>
                                    <span className="text-xs text-gray-400">order:{node.order || 0}</span>
                                    {editingNode?.id === node.id ? (
                                        <div className="flex-1 flex gap-2 flex-wrap">
                                            <Input value={editingNode.problem || ''} onChange={e => setEditingNode(p => ({ ...p, problem: e.target.value }))} placeholder="problem" className="flex-1 text-sm h-8" />
                                            <Input value={editingNode.prompt} onChange={e => setEditingNode(p => ({ ...p, prompt: e.target.value }))} placeholder="質問文" className="flex-1 text-sm h-8" />
                                            <Input value={editingNode.order || ''} onChange={e => setEditingNode(p => ({ ...p, order: Number(e.target.value) }))} placeholder="order" type="number" className="w-20 text-sm h-8" />
                                            <button onClick={() => updateNode(node.id, editingNode)} className="text-green-600"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingNode(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 min-w-0">
                                            {node.problem && <span className="text-xs text-gray-400 mr-2">[{node.problem}]</span>}
                                            <span className="text-sm text-gray-800 truncate">{node.prompt}</span>
                                        </div>
                                    )}
                                    <button onClick={() => setEditingNode({ ...node })} className="text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => deleteNode(node.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>

                                {/* 選択肢一覧 */}
                                {expandedNodes[node.id] && (
                                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
                                        <div className="text-xs font-medium text-gray-500 mb-2">選択肢</div>
                                        {nodeOptions(node.id).map(opt => (
                                            <div key={opt.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                                {editingOption?.id === opt.id ? (
                                                    <div className="flex-1 flex gap-2 flex-wrap">
                                                        <Input value={editingOption.option_key} onChange={e => setEditingOption(p => ({ ...p, option_key: e.target.value }))} placeholder="Key" className="w-16 text-sm h-7" />
                                                        <Input value={editingOption.option_text} onChange={e => setEditingOption(p => ({ ...p, option_text: e.target.value }))} placeholder="テキスト" className="flex-1 text-sm h-7" />
                                                        <Input value={editingOption.next_node_id || ''} onChange={e => setEditingOption(p => ({ ...p, next_node_id: e.target.value }))} placeholder="next_node_id" className="w-40 text-sm h-7" />
                                                        <Input value={JSON.stringify(editingOption.tag_effects || [])} onChange={e => { try { setEditingOption(p => ({ ...p, tag_effects: JSON.parse(e.target.value) })); } catch {} }} placeholder='tag_effects JSON' className="flex-1 text-xs h-7" />
                                                        <button onClick={() => updateOption(opt.id, editingOption)} className="text-green-600"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingOption(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">{opt.option_key}</span>
                                                        <span className="flex-1 text-sm text-gray-800">{opt.option_text}</span>
                                                        {opt.next_node_id && <span className="text-xs text-gray-400">→{opt.next_node_id.slice(0, 8)}</span>}
                                                        {opt.tag_effects?.length > 0 && <span className="text-xs text-emerald-600">{opt.tag_effects.map(t => `${t.tag}+${t.delta}`).join(', ')}</span>}
                                                        <button onClick={() => setEditingOption({ ...opt })} className="text-gray-400 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => deleteOption(opt.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                    </>
                                                )}
                                            </div>
                                        ))}

                                        {/* 選択肢追加フォーム */}
                                        {newOptionForm?.nodeId === node.id ? (
                                            <div className="flex gap-2 flex-wrap mt-2">
                                                <Input value={newOptionForm.option_key || ''} onChange={e => setNewOptionForm(p => ({ ...p, option_key: e.target.value }))} placeholder="Key (A)" className="w-16 text-sm h-7" />
                                                <Input value={newOptionForm.option_text || ''} onChange={e => setNewOptionForm(p => ({ ...p, option_text: e.target.value }))} placeholder="選択肢テキスト" className="flex-1 text-sm h-7" />
                                                <Input value={newOptionForm.next_node_id || ''} onChange={e => setNewOptionForm(p => ({ ...p, next_node_id: e.target.value }))} placeholder="next_node_id（任意）" className="w-40 text-sm h-7" />
                                                <Button size="sm" onClick={() => createOption(node.id)} className="h-7 text-xs">追加</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setNewOptionForm(null)} className="h-7 text-xs">キャンセル</Button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setNewOptionForm({ nodeId: node.id, option_key: '', option_text: '' })}
                                                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1"
                                            >
                                                <Plus className="w-3 h-3" /> 選択肢を追加
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 新規ノード追加 */}
                    {newNodeForm ? (
                        <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-3">
                            <div className="text-sm font-medium text-gray-700">新規ノード追加（ジャンル: {selectedGenre}）</div>
                            <div className="flex gap-2 flex-wrap">
                                <select value={newNodeForm.node_type || 'question'} onChange={e => setNewNodeForm(p => ({ ...p, node_type: e.target.value }))} className="border rounded-lg text-sm px-2 py-1">
                                    {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <Input value={newNodeForm.problem || ''} onChange={e => setNewNodeForm(p => ({ ...p, problem: e.target.value }))} placeholder="problem（例：集客できない）" className="flex-1 text-sm h-8" />
                                <Input value={newNodeForm.order || ''} onChange={e => setNewNodeForm(p => ({ ...p, order: Number(e.target.value) }))} placeholder="order" type="number" className="w-20 text-sm h-8" />
                            </div>
                            <Input value={newNodeForm.prompt || ''} onChange={e => setNewNodeForm(p => ({ ...p, prompt: e.target.value }))} placeholder="質問文（必須）" className="text-sm" />
                            <Input value={newNodeForm.title || ''} onChange={e => setNewNodeForm(p => ({ ...p, title: e.target.value }))} placeholder="タイトル（任意）" className="text-sm" />
                            <div className="flex gap-2">
                                <Button onClick={createNode}>保存</Button>
                                <Button variant="outline" onClick={() => setNewNodeForm(null)}>キャンセル</Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={() => setNewNodeForm({ node_type: 'question', prompt: '', order: nodes.length })} className="gap-2">
                            <Plus className="w-4 h-4" /> ノードを追加
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}