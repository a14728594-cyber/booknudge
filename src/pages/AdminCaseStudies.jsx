import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

export default function AdminCaseStudies() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CaseStudy.list('order', 200);
    setCases(data);
    setLoading(false);
  };

  const togglePublish = async (c) => {
    await base44.entities.CaseStudy.update(c.id, { is_published: !c.is_published });
    load();
  };

  const handleDelete = async (c) => {
    if (!confirm(`「${c.title}」を削除しますか？`)) return;
    await base44.entities.CaseStudy.delete(c.id);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">事例管理</h1>
          <p className="text-sm text-gray-500 mt-1">事例から学ぶ コンテンツの管理</p>
        </div>
        <Button
          onClick={() => navigate(createPageUrl('AdminCaseStudyEdit'))}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>事例がまだ登録されていません</p>
          <Button onClick={() => navigate(createPageUrl('AdminCaseStudyEdit'))} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
            最初の事例を追加
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {cases.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_published ? '公開中' : '非公開'}
                  </span>
                  <span className="text-xs text-gray-400">順: {c.order ?? 0}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{c.title}</p>
                <p className="text-xs text-gray-500 truncate">{c.company_name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => togglePublish(c)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  title={c.is_published ? '非公開にする' : '公開する'}
                >
                  {c.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => navigate(createPageUrl('AdminCaseStudyEdit') + `?id=${c.id}`)}
                  className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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