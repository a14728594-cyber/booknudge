import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, X, Settings } from 'lucide-react';
import NodeListView from '@/components/admin/diagnosis/NodeListView';
import NodeEditor from '@/components/admin/diagnosis/NodeEditor';
import InlineNodeForm from '@/components/admin/diagnosis/InlineNodeForm';
import DiagnosisResultTypeManager from '@/components/admin/diagnosis/DiagnosisResultTypeManager';
import GenreProblemManager from '@/components/admin/diagnosis/GenreProblemManager';

const TABS = ['フロー管理', 'ジャンル・悩み管理', '診断タイプ管理'];

export default function AdminDiagnosis() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [nodes, setNodes] = useState([]);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [editingNode, setEditingNode] = useState(null);
    const [showRootForm, setShowRootForm] = useState(false);
    const [newGenreText, setNewGenreText] = useState('');
    const [addingGenre, setAddingGenre] = useState(false);

    useEffect(() => {
        checkAdmin();
        loadGenres();
    }, []);

    useEffect(() => {
        if (selectedGenre) loadData();
    }, [selectedGenre]);

    const checkAdmin = async () => {
        const user = await base44.auth.me();
        if (user?.role !== 'admin') navigate(createPageUrl('home'));
    };

    const loadGenres = async () => {
        const allNodes = await base44.entities.DiagnosisNode.list('genre', 500);
        const existing = [...new Set(allNodes.map(n => n.genre).filter(Boolean))];
        const stored = JSON.parse(localStorage.getItem('diagnosis_genres') || '[]');
        const merged = [...new Set([...stored, ...existing])];
        setGenres(merged);
        if (merged.length > 0 && !selectedGenre) setSelectedGenre(merged[0]);
        localStorage.setItem('diagnosis_genres', JSON.stringify(merged));
    };

    const addGenre = () => {
        const g = newGenreText.trim();
        if (!g || genres.includes(g)) return;
        const updated = [...genres, g];
        setGenres(updated);
        localStorage.setItem('diagnosis_genres', JSON.stringify(updated));
        setSelectedGenre(g);
        setNewGenreText('');
        setAddingGenre(false);
    };

    const deleteGenre = (g) => {
        if (!confirm(`ジャンル「${g}」を削除しますか？`)) return;
        const updated = genres.filter(x => x !== g);
        setGenres(updated);
        localStorage.setItem('diagnosis_genres', JSON.stringify(updated));
        if (selectedGenre === g) setSelectedGenre(updated[0] || null);
    };

    const loadData = async () => {
        setLoading(true);
        const [allNodes, allOptions] = await Promise.all([
            base44.entities.DiagnosisNode.filter({ genre: selectedGenre }, 'order', 500),
            base44.entities.DiagnosisOption.list('order', 2000),
        ]);
        setNodes(allNodes);
        // optionMapに変換
        const optMap = {};
        allOptions.forEach(o => {
            if (!optMap[o.node_id]) optMap[o.node_id] = [];
            optMap[o.node_id].push(o);
        });
        setOptions(optMap);
        setLoading(false);
    };

    const handleCreateRoot = async ({ title, prompt, node_type, weight, nodeOptions }) => {
        const newNode = await base44.entities.DiagnosisNode.create({
            genre: selectedGenre,
            title,
            prompt,
            node_type,
            weight: weight || 1,
            order: nodes.length,
            is_active: true,
        });
        const validOpts = nodeOptions.filter(o => o.option_text.trim());
        await Promise.all(
            validOpts.map((o, idx) =>
                base44.entities.DiagnosisOption.create({
                    node_id: newNode.id,
                    option_key: o.option_key,
                    option_text: o.option_text,
                    type_scores: o.type_scores || [],
                    order: idx,
                })
            )
        );
        setShowRootForm(false);
        await loadData();
    };

    const handleAddChild = async (parentOption, { title, prompt, node_type, weight, nodeOptions }) => {
        const newNode = await base44.entities.DiagnosisNode.create({
            genre: selectedGenre,
            title,
            prompt,
            node_type,
            weight: weight || 1,
            order: nodes.length,
            is_active: true,
        });
        const validOpts = nodeOptions.filter(o => o.option_text.trim());
        await Promise.all(
            validOpts.map((o, idx) =>
                base44.entities.DiagnosisOption.create({
                    node_id: newNode.id,
                    option_key: o.option_key,
                    option_text: o.option_text,
                    type_scores: o.type_scores || [],
                    order: idx,
                })
            )
        );
        await base44.entities.DiagnosisOption.update(parentOption.id, { next_node_id: newNode.id });
        await loadData();
    };

    const handleEdit = (node) => {
        const nodeOpts = options.filter(o => o.node_id === node.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        setEditingNode({ ...node, _options: nodeOpts });
    };

    const handleSaveEdit = async ({ node: nodeData, options: optsData }) => {
        await base44.entities.DiagnosisNode.update(editingNode.id, nodeData);
        const existingOpts = options.filter(o => o.node_id === editingNode.id);
        await Promise.all(existingOpts.map(o => base44.entities.DiagnosisOption.delete(o.id)));
        await Promise.all(
            optsData
                .filter(o => o.option_text?.trim())
                .map((o, idx) =>
                    base44.entities.DiagnosisOption.create({
                        node_id: editingNode.id,
                        option_key: o.option_key || String.fromCharCode(65 + idx),
                        option_text: o.option_text,
                        next_node_id: o.next_node_id || null,
                        type_scores: o.type_scores || [],
                        order: idx,
                    })
                )
        );
        setEditingNode(null);
        await loadData();
    };

    const handleDelete = async (node) => {
        const refs = options.filter(o => o.next_node_id === node.id);
        if (refs.length > 0) {
            if (!confirm(`このノードは${refs.length}個の選択肢から参照されています。削除しますか？`)) return;
            await Promise.all(refs.map(o => base44.entities.DiagnosisOption.update(o.id, { next_node_id: null })));
        } else {
            if (!confirm('このノードと選択肢を削除しますか？')) return;
        }
        const nodeOpts = options.filter(o => o.node_id === node.id);
        await Promise.all(nodeOpts.map(o => base44.entities.DiagnosisOption.delete(o.id)));
        await base44.entities.DiagnosisNode.delete(node.id);
        await loadData();
    };

    const referencedIds = new Set(options.map(o => o.next_node_id).filter(Boolean));
    const rootNodes = nodes.filter(n => !referencedIds.has(n.id));

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">深掘り診断 管理</h1>
                    <p className="text-sm text-gray-500 mt-0.5">スコア加点方式・ブランチ型診断フロー</p>
                </div>
            </div>

            {/* タブ */}
            <div className="flex gap-2 mb-6 border-b">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === '診断タイプ管理' ? (
                <DiagnosisResultTypeManager />
            ) : activeTab === 'ジャンル・悩み管理' ? (
                <GenreProblemManager />
            ) : (
                <>
                    {/* ジャンル切り替え */}
                    <div className="flex gap-2 mb-8 flex-wrap items-center">
                        {genres.map(g => (
                            <div key={g} className="flex items-center gap-0.5 group">
                                <button
                                    onClick={() => setSelectedGenre(g)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedGenre === g ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:border-indigo-400'}`}
                                >
                                    {g}
                                </button>
                                <button onClick={() => deleteGenre(g)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity ml-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {addingGenre ? (
                            <div className="flex items-center gap-2">
                                <Input value={newGenreText} onChange={e => setNewGenreText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGenre()} placeholder="ジャンル名" className="h-8 w-36 text-sm" autoFocus />
                                <button onClick={addGenre} className="text-green-600"><Check className="w-4 h-4" /></button>
                                <button onClick={() => { setAddingGenre(false); setNewGenreText(''); }} className="text-gray-400"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <button onClick={() => setAddingGenre(true)} className="px-3 py-2 rounded-full text-sm border border-dashed text-gray-400 hover:text-indigo-600 hover:border-indigo-400 transition-colors flex items-center gap-1">
                                <Plus className="w-3 h-3" /> ジャンル追加
                            </button>
                        )}
                    </div>

                    {/* 編集モーダル */}
                    {editingNode && (
                        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingNode(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="p-6">
                                    <h2 className="text-lg font-bold mb-4 text-gray-900">質問を編集</h2>
                                    <NodeEditor
                                        node={editingNode}
                                        allNodes={nodes}
                                        onSave={handleSaveEdit}
                                        onCancel={() => setEditingNode(null)}
                                        selectedGenre={selectedGenre}
                                        mode="edit"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">読み込み中...</div>
                    ) : (
                        <div className="space-y-6">
                            {rootNodes.length === 0 && !showRootForm && (
                                <div className="text-center py-16 text-gray-400">
                                    <p className="mb-2 text-base font-medium text-gray-600">診断フローがまだありません</p>
                                    <p className="mb-6 text-sm">最初の質問から作成してください</p>
                                    <Button onClick={() => setShowRootForm(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                                        <Plus className="w-4 h-4" /> 最初の質問を作成
                                    </Button>
                                </div>
                            )}

                            {rootNodes.map(rootNode => (
                                <TreeNodeView
                                    key={rootNode.id}
                                    node={rootNode}
                                    options={options.filter(o => o.node_id === rootNode.id)}
                                    allNodes={nodes}
                                    allOptions={options}
                                    depth={0}
                                    isRoot={true}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onAddChild={handleAddChild}
                                />
                            ))}

                            {!showRootForm && rootNodes.length > 0 && (
                                <Button
                                    onClick={() => setShowRootForm(true)}
                                    variant="outline"
                                    className="gap-2 w-full border-dashed text-gray-500 hover:text-indigo-600 hover:border-indigo-400"
                                >
                                    <Plus className="w-4 h-4" /> 別の開始質問を追加（別フロー）
                                </Button>
                            )}

                            {showRootForm && (
                                <div className="bg-white border-2 border-indigo-200 rounded-xl p-5">
                                    <h3 className="font-semibold text-gray-800 mb-3 text-sm">開始質問を作成</h3>
                                    <InlineNodeForm
                                        onSave={handleCreateRoot}
                                        onCancel={() => setShowRootForm(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}