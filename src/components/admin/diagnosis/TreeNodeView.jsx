import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus, Star, ArrowRight } from 'lucide-react';
import InlineNodeForm from './InlineNodeForm';

const TYPE_COLORS = {
    start: 'bg-green-100 text-green-700 border-green-200',
    question: 'bg-blue-100 text-blue-700 border-blue-200',
    end: 'bg-red-100 text-red-700 border-red-200',
};

export default function TreeNodeView({
    node,
    options,
    allNodes,
    allOptions,
    depth = 0,
    isRoot,
    onEdit,
    onDelete,
    onAddChild,
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [addingForOptId, setAddingForOptId] = useState(null); // opt.id or 'new'

    const nodeOpts = options
        .filter(o => o.node_id === node.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const getChildNode = (optId) => {
        const opt = allOptions.find(o => o.id === optId);
        if (!opt?.next_node_id) return null;
        return allNodes.find(n => n.id === opt.next_node_id) || null;
    };

    const borderColor = depth === 0 ? 'border-gray-200' : 'border-indigo-100';
    const bgColor = depth === 0 ? 'bg-white' : depth === 1 ? 'bg-indigo-50/40' : 'bg-purple-50/30';

    return (
        <div className={`rounded-xl border-2 ${borderColor} ${bgColor} overflow-hidden`}>
            {/* Node header */}
            <div className="flex items-start gap-2 p-3.5">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                    {collapsed
                        ? <ChevronRight className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[node.node_type] || TYPE_COLORS.question}`}>
                            {node.node_type}
                        </span>
                        {isRoot && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium flex items-center gap-1">
                                <Star className="w-2.5 h-2.5" /> 開始点
                            </span>
                        )}
                        {node.title && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{node.title}</span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">{node.prompt}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => onEdit(node)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(node)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Options and children */}
            {!collapsed && (
                <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-2.5 space-y-3">
                    {nodeOpts.length === 0 && node.node_type !== 'end' && (
                        <p className="text-xs text-gray-400 italic">選択肢なし</p>
                    )}

                    {nodeOpts.map(opt => {
                        const childNode = getChildNode(opt.id);
                        const isAddingHere = addingForOptId === opt.id;

                        return (
                            <div key={opt.id} className="space-y-2">
                                {/* Option row */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                                        {opt.option_key}
                                    </span>
                                    <span className="text-gray-700 font-medium flex-1">{opt.option_text}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                    {childNode ? (
                                        <span className="text-indigo-500 font-mono text-[10px]">{childNode.title || childNode.prompt?.slice(0, 20)}</span>
                                    ) : (
                                        <span className="text-gray-400">未設定</span>
                                    )}
                                </div>

                                {/* Child node (recursive) */}
                                {childNode && (
                                    <div className="ml-6 border-l-2 border-indigo-200 pl-3">
                                        <TreeNodeView
                                            node={childNode}
                                            options={allOptions.filter(o => o.node_id === childNode.id)}
                                            allNodes={allNodes}
                                            allOptions={allOptions}
                                            depth={depth + 1}
                                            isRoot={false}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onAddChild={onAddChild}
                                        />
                                    </div>
                                )}

                                {/* Add child button / form */}
                                {!childNode && !isAddingHere && (
                                    <button
                                        onClick={() => setAddingForOptId(opt.id)}
                                        className="ml-6 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 border border-dashed border-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> 派生質問を追加
                                    </button>
                                )}

                                {isAddingHere && (
                                    <InlineNodeForm
                                        onSave={(formData) => {
                                            onAddChild(opt, formData);
                                            setAddingForOptId(null);
                                        }}
                                        onCancel={() => setAddingForOptId(null)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}