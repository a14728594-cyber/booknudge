import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export default function MangaPagesUploader({ pages = [], onChange }) {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // ファイル名順で自動ソート（01.webp, 02.webp… のゼロ埋め連番）
        const sorted = [...files].sort((a, b) =>
            a.name.localeCompare(b.name, 'ja', { numeric: true })
        );

        setUploading(true);
        try {
            const uploaded = [];
            for (const file of sorted) {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                uploaded.push(file_url);
            }
            onChange([...pages, ...uploaded]);
        } catch {
            alert('アップロードに失敗しました');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removePage = (idx) => {
        onChange(pages.filter((_, i) => i !== idx));
    };

    const movePage = (idx, dir) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= pages.length) return;
        const newPages = [...pages];
        [newPages[idx], newPages[newIdx]] = [newPages[newIdx], newPages[idx]];
        onChange(newPages);
    };

    return (
        <div>
            {/* アップロードエリア */}
            <div className="mb-4">
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-600">
                        {uploading ? 'アップロード中...' : 'WebP / PNG を選択（複数可）'}
                    </span>
                    <input
                        type="file"
                        accept="image/webp,image/png"
                        multiple
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>
                {uploading && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-indigo-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        画像をアップロードしています...
                    </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                    ファイル名順（01.webp, 02.webp…）で自動ソートされます
                </p>
            </div>

            {/* コマ一覧 */}
            {pages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pages.map((url, idx) => (
                        <div key={idx} className="relative group bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
                                {idx + 1}
                            </div>
                            <img
                                src={url}
                                alt={`コマ ${idx + 1}`}
                                className="w-full aspect-[9/16] object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 flex items-center justify-between px-2 py-1">
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => movePage(idx, -1)}
                                        disabled={idx === 0}
                                        className="p-1 rounded text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => movePage(idx, 1)}
                                        disabled={idx === pages.length - 1}
                                        className="p-1 rounded text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removePage(idx)}
                                    className="p-1 rounded text-white hover:bg-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}