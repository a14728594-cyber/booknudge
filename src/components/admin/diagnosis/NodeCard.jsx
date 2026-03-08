import React from 'react';
import { Edit2, Trash2, ArrowRight, Star, PlusCircle } from 'lucide-react';

const TYPE_COLORS = {
    start: 'bg-green-100 text-green-700 border-green-200',
    question: 'bg-blue-100 text-blue-700 border-blue-200',
    end: 'bg-red-100 text-red-700 border-red-200',
};

export default function NodeCard({ node, options, allNodes, onEdit, onDelete, isRoot, isHighlighted, onClickNext }) {
    const getNodeLabel = (id) => {
        const n = allNodes.find(x => x.id === id);
        return n ? (n.title ? `[${n.title}] ${n.prompt?.slice(0, 25)}` : n.prompt?.slice(0, 35)) : `(ID: ${id.slice(0, 8)}...)`;
    };

    return (
        <div className={`bg-white rounded-xl border-2 transition-all ${isHighlighted ? 'border-indigo-400 shadow-lg shadow-indigo-100' : 'border-gray-100 hover:border-gray-200'}`}>
            {/* Header */}
            <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[node.node_type] || TYPE_COLORS.question}`}>
                            {node.node_type}
                        </span>
                        {isRoot && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium flex items-center gap-1">
                                <Star className="w-2.5 h-2.5" /> 開始点
                            </span>
                        )}
                        {node.problem && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{node.problem}</span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{node.prompt}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Options / branching */}
            <div className="border-t border-gray-100 px-4 pb-3 pt-2.5 space-y-2">
                {options.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">選択肢なし（終了ノード）</p>
                ) : (
                    options.map(opt => (
                        <div key={opt.id} className="flex items-center gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                                {opt.option_key}
                            </span>
                            <span className="text-gray-700 flex-1 min-w-0 truncate">{opt.option_text}</span>
                            <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            {opt.next_node_id ? (
                                <button
                                    onClick={() => onClickNext?.(opt.next_node_id)}
                                    className="text-indigo-600 font-medium truncate max-w-[140px] hover:underline text-left"
                                >
                                    {getNodeLabel(opt.next_node_id)}
                                </button>
                            ) : (
                                <span className="text-green-600 font-medium whitespace-nowrap">✓ 終了</span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}