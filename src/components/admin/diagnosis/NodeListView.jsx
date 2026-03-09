import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_LABELS = { start: '開始', question: '質問', end: '終了' };
const TYPE_COLORS = { start: 'bg-green-100 text-green-700', question: 'bg-blue-100 text-blue-700', end: 'bg-gray-100 text-gray-600' };

export default function NodeListView({ nodes, options, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState({});

    const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="space-y-2">
            {nodes.map((node, idx) => {
                const nodeOptions = (options[node.id] || []).sort((a, b) => (a.order || 0) - (b.order || 0));
                const isExpanded = expanded[node.id];

                return (
                    <div key={node.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 group">
                            <span className="text-xs font-bold text-gray-400 w-6 text-center">{idx + 1}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[node.node_type] || TYPE_COLORS.question}`}>
                                {TYPE_LABELS[node.node_type] || node.node_type}
                            </span>
                            <p className="flex-1 text-sm text-gray-800 line-clamp-1">{node.prompt}</p>
                            <span className="text-xs text-gray-400">{nodeOptions.length}択</span>
                            <button onClick={() => toggle(node.id)} className="text-gray-400 hover:text-gray-600">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button onClick={() => onEdit(node)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-500 transition-opacity">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(node)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                                {nodeOptions.length === 0 ? (
                                    <p className="text-xs text-gray-400">選択肢なし</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {nodeOptions.map(opt => (
                                            <div key={opt.id} className="flex items-start gap-2">
                                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {opt.option_key}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-700">{opt.option_text}</p>
                                                    {opt.type_scores?.length > 0 && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            加点: {opt.type_scores.map(s => `${s.type_key}+${s.score}`).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}