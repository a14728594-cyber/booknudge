import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, BookOpen, Play } from 'lucide-react';

export default function CaseStudyDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [case_, setCase] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [relatedCases, setRelatedCases] = useState([]);
  const [mediaBlocks, setMediaBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    const c = await base44.entities.CaseStudy.filter({ id });
    const caseData = c[0];
    if (!caseData) { setLoading(false); return; }
    setCase(caseData);

    const [books, relCases, blocks] = await Promise.all([
      (caseData.related_book_ids || []).length > 0
        ? Promise.all(caseData.related_book_ids.map(bid =>
            base44.entities.Book.filter({ id: bid }).then(r => r[0]).catch(() => null)
          ))
        : Promise.resolve([]),
      (caseData.related_case_ids || []).length > 0
        ? base44.entities.CaseStudy.filter({ is_published: true }, 'order', 50)
            .then(all => all.filter(c2 => (caseData.related_case_ids || []).includes(c2.id)))
        : Promise.resolve([]),
      base44.entities.CaseMediaBlock.filter({ case_id: id, is_published: true }, 'order', 100),
    ]);

    setRelatedBooks(books.filter(Boolean));
    setRelatedCases(relCases);
    setMediaBlocks(blocks);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400">
        <BookOpen className="w-12 h-12 mb-4 opacity-40" />
        <p>事例が見つかりませんでした</p>
      </div>
    );
  }

  const allTags = [...(case_.industry_tags || []), ...(case_.learning_tags || [])];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* サムネイル */}
      {case_.thumbnail_url && (
        <div className="w-full h-52 sm:h-64 overflow-hidden">
          <img src={case_.thumbnail_url} alt={case_.company_name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧に戻る
        </button>

        {/* ヘッダー */}
        <div className="mb-6">
          <p className="text-sm text-indigo-600 font-semibold mb-1">{case_.company_name}</p>
          {case_.company_description && (
            <p className="text-xs text-gray-400 mb-2 leading-relaxed">{case_.company_description}</p>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">{case_.title}</h1>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* 要約 */}
        {case_.summary && (
          <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-6">
            <p className="text-sm leading-relaxed font-medium">{case_.summary}</p>
          </div>
        )}

        {/* 本文セクション */}
        <div className="space-y-5">
          <Section title="何がうまいのか" content={case_.what_is_good} emoji="✅" />
          <Section title="なぜうまくいってるのか" content={case_.why_it_works} emoji="🔍" />
          <Section title="ここから学べること" content={case_.learnings} emoji="💡" />
          <Section title="この事例が刺さる人" content={case_.target_reader} emoji="🎯" />
        </div>

        {/* メディア説明ブロック */}
        {mediaBlocks.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">📖 詳しく見てみよう</h2>
            {mediaBlocks.map(block => (
              <MediaBlock key={block.id} block={block} />
            ))}
          </div>
        )}

        {/* 関連本 */}
        {relatedBooks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              この事例で学びを深める本
            </h2>
            <div className="space-y-3">
              {relatedBooks.map(book => (
                <button
                  key={book.id}
                  onClick={() => navigate(createPageUrl('Book') + `?id=${book.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-all text-left"
                >
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-14 h-20 object-cover rounded-lg flex-shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-14 h-20 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{book.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">{(book.authors || []).join(', ')}</p>
                    {book.one_liner && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{book.one_liner}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 関連事例 */}
        {relatedCases.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">関連する事例</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedCases.map(rc => (
                <button
                  key={rc.id}
                  onClick={() => navigate(createPageUrl('CaseStudyDetail') + `?id=${rc.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition-all"
                >
                  <p className="text-xs text-indigo-600 font-semibold mb-1">{rc.company_name}</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug">{rc.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, content, emoji }) {
  if (!content) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function MediaBlock({ block }) {
  const [videoPlaying, setVideoPlaying] = useState(false);

  // YouTubeのURLをembed形式に変換
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    if (url.includes('youtube.com/embed/')) return url;
    return null;
  };

  if (block.block_type === 'text') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {block.title && <h3 className="font-bold text-gray-900 mb-3 text-base">{block.title}</h3>}
        {block.body && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{block.body}</p>}
      </div>
    );
  }

  if (block.block_type === 'image') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {block.image_url && (
          <img src={block.image_url} alt={block.title || ''} className="w-full object-cover" />
        )}
        {(block.title || block.body || block.caption) && (
          <div className="p-4">
            {block.title && <h3 className="font-bold text-gray-900 mb-2 text-sm">{block.title}</h3>}
            {block.body && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">{block.body}</p>}
            {block.caption && <p className="text-xs text-gray-400 italic">{block.caption}</p>}
          </div>
        )}
      </div>
    );
  }

  if (block.block_type === 'video') {
    const embedUrl = getYouTubeEmbedUrl(block.video_url);
    const fileUrl = block.video_file_url;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* YouTube埋め込み */}
        {embedUrl && (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={embedUrl}
              title={block.title || 'video'}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* アップロード動画ファイル */}
        {!embedUrl && fileUrl && (
          <video
            src={fileUrl}
            controls
            className="w-full max-h-80 bg-black"
            preload="metadata"
          />
        )}

        {/* 直リンク動画URL（YouTube以外） */}
        {!embedUrl && !fileUrl && block.video_url && (
          <video
            src={block.video_url}
            controls
            className="w-full max-h-80 bg-black"
            preload="metadata"
          />
        )}

        {(block.title || block.body || block.caption) && (
          <div className="p-4">
            {block.title && <h3 className="font-bold text-gray-900 mb-2 text-sm">{block.title}</h3>}
            {block.body && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">{block.body}</p>}
            {block.caption && <p className="text-xs text-gray-400 italic">{block.caption}</p>}
          </div>
        )}
      </div>
    );
  }

  return null;
}