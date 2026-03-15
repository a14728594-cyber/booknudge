import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, BookOpen } from 'lucide-react';

const INDUSTRY_TAGS = ['飲食', 'サブスク', '小売', 'アパレル', 'テック', 'エンタメ', '美容', '教育', 'EC', 'サービス'];
const LEARNING_TAGS = ['マーケティング', 'ブランディング', '営業', '差別化', '導線設計', '継続設計', '体験価値', '高単価化', '習慣化', 'リピート設計'];

export default function CaseStudies() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeIndustry, setActiveIndustry] = useState(null);
  const [activeLearning, setActiveLearning] = useState(null);

  useEffect(() => {
    base44.entities.CaseStudy.filter({ is_published: true }, 'order', 200)
      .then(setCases)
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter(c => {
    const q = query.toLowerCase();
    const matchQuery = !q || c.title?.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q) || c.short_description?.toLowerCase().includes(q);
    const matchIndustry = !activeIndustry || (c.industry_tags || []).includes(activeIndustry);
    const matchLearning = !activeLearning || (c.learning_tags || []).includes(activeLearning);
    return matchQuery && matchIndustry && matchLearning;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">事例から学ぶ</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            有名企業や人気サービスの成功事例を、ビジネス視点でわかりやすく整理。何がうまいのか、なぜうまくいっているのか、さらに深く学べる本までつなげて読めます。
          </p>
        </div>

        {/* 検索 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="企業名・タイトルで検索"
            className="pl-9"
          />
        </div>

        {/* 業界フィルタ */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">業界</p>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveIndustry(activeIndustry === tag ? null : tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeIndustry === tag
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 学びフィルタ */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-500 mb-2">学び</p>
          <div className="flex flex-wrap gap-2">
            {LEARNING_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveLearning(activeLearning === tag ? null : tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeLearning === tag
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 一覧 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>条件に合う事例が見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(c => (
              <CaseCard key={c.id} case_={c} onClick={() => navigate(createPageUrl('CaseStudyDetail') + `?id=${c.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CaseCard({ case_: c, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
    >
      {c.thumbnail_url && (
        <div className="h-36 overflow-hidden">
          <img src={c.thumbnail_url} alt={c.company_name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs text-indigo-600 font-semibold mb-1">{c.company_name}</p>
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2">{c.title}</h3>
        {c.short_description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{c.short_description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {[...(c.industry_tags || []), ...(c.learning_tags || [])].slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
    </button>
  );
}