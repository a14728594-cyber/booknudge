import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, X } from 'lucide-react';
import NodeCard from '@/components/admin/diagnosis/NodeCard';
import NodeEditor from '@/components/admin/diagnosis/NodeEditor';

export default function AdminDiagnosis() {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [editingNode, setEditingNode] = useState(null); // null = 非表示, {} = 新規, node = 編集
    const [editingMode, setEditingMode] = useState('create');
    const [highlightedId, setHighlightedId] = useState(null);
    const [newGenreText, setNewGenreText] = useState('');
    const [addingGenre, setAddingGenre] = useState(false);

    useEffect(() => {
        checkAdmin();
        loadGenres();
    }, []);

    useEffect(() => {
        if (selectedGenre) loadData();
    }, [selectedGenre]);

    // Highlight scroll
    useEffect(() => {
        if (highlightedId) {
            document.getElementById(`node-${highlightedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const t = setTimeout(() => setHighlightedId(null), 2000);
            return () => clearTimeout(t);
        }
    }, [highlightedId]);

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
            base44.entities.DiagnosisNode.filter({ genre: selectedGenre }, 'order', 200),
            base44.entities.DiagnosisOption.list('order', 1000),
        ]);
        setNodes(allNodes);
        setOptions(allOptions);
        setLoading(false);
    };

    const nodeOptions = (nodeId) =>
        options.filter(o => o.node_id === nodeId).sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleSave = async ({ node: nodeData, options: optsData }) => {
        const isNew = editingMode === 'create';

        let savedNode;
        if (isNew) {
            savedNode = await base44.entities.DiagnosisNode.create({
                genre: selectedGenre,
                ...nodeData,
                is_active: nodeData.is_active ?? true,
            });
        } else {
            await base44.entities.DiagnosisNode.update(editingNode.id, nodeData);
            savedNode = { ...editingNode, ...nodeData };
        }

        const nodeId = savedNode.id || editingNode.id;

        // Sync options: delete old, create new
        const existingOpts = options.filter(o => o.node_id === nodeId);
        await Promise.all(existingOpts.map(o => base44.entities.DiagnosisOption.delete(o.id)));
        await Promise.all(
            optsData
                .filter(o => o.option_text?.trim())
                .map((o, idx) =>
                    base44.entities.DiagnosisOption.create({
                        node_id: nodeId,
                        option_key: o.option_key || String.fromCharCode(65 + idx),
                        option_text: o.option_text,
                        next_node_id: o.next_node_id || null,
                        tag_effects: o.tag_effects || [],
                        order: idx,
                    })
                )
        );

        setEditingNode(null);
        await loadData();
        setHighlightedId(nodeId);
    };

    const handleDelete = async (node) => {
        // Check if this node is referenced by any option
        const refs = options.filter(o => o.next_node_id === node.id);
        if (refs.length > 0) {
            const refTexts = refs.map(o => `「${o.option_text}」`).join(', ');
            if (!confirm(`このノードは ${refs.length}個の選択肢（${refTexts}）から参照されています。\n削除しますか？`)) return;
        } else {
            if (!confirm('このノードと関連する選択肢を削除しますか？')) return;
        }

        const nodeOpts = options.filter(o => o.node_id === node.id);
        await Promise.all(nodeOpts.map(o => base44.entities.DiagnosisOption.delete(o.id)));
        await base44.entities.DiagnosisNode.delete(node.id);
        loadData();
    };

    const openCreate = () => {
        setEditingMode('create');
        setEditingNode({ node_type: 'question', prompt: '', order: nodes.length, _options: [] });
    };

    const openEdit = (node) => {
        setEditingMode('edit');
        setEditingNode({ ...node, _options: nodeOptions(node.id) });
    };

    // Find root nodes: nodes not referenced by any option's next_node_id
    const referencedIds = new Set(options.map(o => o.next_node_id).filter(Boolean));
    const rootNodes = nodes.filter(n => !referencedIds.has(n.id));

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">深掘り診断 管理</h1>
                    <p className="text-sm text-gray-500 mt-0.5">分岐式質問ツリーの管理</p>
                </div>
            </div>

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

            {loading ? (
                <div className="text-center py-12 text-gray-400">読み込み中...</div>
            ) : (
                <div className="space-y-6">
                    {/* 凡例 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 bg-white rounded-xl border border-gray-100 px-4 py-2.5">
                        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>開始点（どの選択肢からも参照されていない質問）</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>start</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>question</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>end / 終了</span>
                    </div>

                    {/* エディター */}
                    {editingNode && (
                        <NodeEditor
                            node={editingNode}
                            allNodes={nodes}
                            onSave={handleSave}
                            onCancel={() => setEditingNode(null)}
                            selectedGenre={selectedGenre}
                            mode={editingMode}
                        />
                    )}

                    {/* ノード一覧 */}
                    {nodes.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <p className="mb-4">このジャンルの質問はまだありません</p>
                            <Button onClick={openCreate} className="gap-2">
                                <Plus className="w-4 h-4" /> 最初の質問を追加
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {nodes.map(node => (
                                <div key={node.id} id={`node-${node.id}`}>
                                    <NodeCard
                                        node={node}
                                        options={nodeOptions(node.id)}
                                        allNodes={nodes}
                                        isRoot={rootNodes.some(r => r.id === node.id)}
                                        isHighlighted={highlightedId === node.id}
                                        onEdit={() => openEdit(node)}
                                        onDelete={() => handleDelete(node)}
                                        onClickNext={(id) => setHighlightedId(id)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 追加ボタン */}
                    {nodes.length > 0 && !editingNode && (
                        <Button onClick={openCreate} variant="outline" className="gap-2 w-full border-dashed">
                            <Plus className="w-4 h-4" /> 質問を追加
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}