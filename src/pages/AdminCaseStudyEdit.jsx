import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, X, Loader2, Plus, Trash2, GripVertical, Image, Video, Type, ChevronUp, ChevronDown } from 'lucide-react';

const INDUSTRY_TAGS = ['飲食', 'サブスク', '小売', 'アパレル', 'テック', 'エンタメ', '美容', '教育', 'EC', 'サービス'];
const LEARNING_TAGS = ['マーケティング', 'ブランディング', '営業', '差別化', '導線設計', '継続設計', '体験価値', '高単価化', '習慣化', 'リピート設計'];

const defaultForm = {
  title: '', company_name: '', thumbnail_url: '', short_description: '',
  summary: '', what_is_good: '', why_it_works: '', learnings: '', target_reader: '',
  industry_tags: [], learning_tags: [], related_book_ids: [], related_case_ids: [],
  is_published: false, order: 0,
};

export default function AdminCaseStudyEdit() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 本検索
  const [bookQuery, setBookQuery] = useState('');
  const [allBooks, setAllBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [showBookList, setShowBookList] = useState(false);

  // 関連事例
  const [allCases, setAllCases] = useState([]);
  const [selectedCases, setSelectedCases] = useState([]);

  // メディアブロック
  const [blocks, setBlocks] = useState([]);
  const [blockSaving, setBlockSaving] = useState({});

  useEffect(() => {
    base44.entities.CaseStudy.list('order', 200).then(setAllCases);
    base44.entities.Book.list('-created_date', 500).then(setAllBooks);
    if (id) {
      base44.entities.CaseStudy.filter({ id }).then(async res => {
        const c = res[0];
        if (!c) return;
        setForm(c);
        if ((c.related_book_ids || []).length > 0) {
          const books = await Promise.all(
            c.related_book_ids.map(bid => base44.entities.Book.filter({ id: bid }).then(r => r[0]).catch(() => null))
          );
          setSelectedBooks(books.filter(Boolean));
        }
        if ((c.related_case_ids || []).length > 0) {
          const cases = await base44.entities.CaseStudy.list('order', 200);
          setSelectedCases(cases.filter(cs => (c.related_case_ids || []).includes(cs.id)));
        }
      });
      // メディアブロック読み込み
      base44.entities.CaseMediaBlock.filter({ case_id: id }, 'order', 100).then(setBlocks);
    }
  }, [id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleTag = (arr, tag) => arr.includes(tag) ? arr.filter(t => t !== tag) : [...arr, tag];

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('thumbnail_url', file_url);
    setUploading(false);
  };

  const bookResults = bookQuery.trim().length >= 1
    ? allBooks.filter(b => {
        const q = bookQuery.toLowerCase();
        return (
          b.title?.toLowerCase().includes(q) ||
          (b.authors || []).some(a => a.toLowerCase().includes(q)) ||
          (b.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }).slice(0, 20)
    : [];

  const addBook = (book) => {
    if (selectedBooks.find(b => b.id === book.id)) return;
    const updated = [...selectedBooks, book];
    setSelectedBooks(updated);
    set('related_book_ids', updated.map(b => b.id));
  };

  const removeBook = (bookId) => {
    const updated = selectedBooks.filter(b => b.id !== bookId);
    setSelectedBooks(updated);
    set('related_book_ids', updated.map(b => b.id));
  };

  const toggleRelatedCase = (c) => {
    const exists = selectedCases.find(sc => sc.id === c.id);
    const updated = exists ? selectedCases.filter(sc => sc.id !== c.id) : [...selectedCases, c];
    setSelectedCases(updated);
    set('related_case_ids', updated.map(sc => sc.id));
  };

  const handleSave = async () => {
    if (!form.title || !form.company_name) { alert('タイトルと企業名は必須です'); return; }
    setSaving(true);
    const payload = { ...form };
    if (id) {
      await base44.entities.CaseStudy.update(id, payload);
    } else {
      const created = await base44.entities.CaseStudy.create(payload);
      navigate(createPageUrl('AdminCaseStudyEdit') + `?id=${created.id}`, { replace: true });
    }
    setSaving(false);
    navigate(createPageUrl('AdminCaseStudies'));
  };

  // --- メディアブロック操作 ---
  const addBlock = (type) => {
    const newBlock = { case_id: id, block_type: type, title: '', body: '', image_url: '', video_url: '', video_file_url: '', caption: '', order: blocks.length, is_published: true, _isNew: true, _tempId: Date.now() };
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlockField = (idx, key, val) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  };

  const saveBlock = async (idx) => {
    const block = blocks[idx];
    setBlockSaving(s => ({ ...s, [idx]: true }));
    const payload = {
      case_id: id,
      block_type: block.block_type,
      title: block.title,
      body: block.body,
      image_url: block.image_url,
      video_url: block.video_url,
      video_file_url: block.video_file_url,
      caption: block.caption,
      order: block.order,
      is_published: block.is_published !== false,
    };
    if (block._isNew) {
      const saved = await base44.entities.CaseMediaBlock.create(payload);
      setBlocks(prev => prev.map((b, i) => i === idx ? { ...saved } : b));
    } else {
      await base44.entities.CaseMediaBlock.update(block.id, payload);
    }
    setBlockSaving(s => ({ ...s, [idx]: false }));
  };

  const deleteBlock = async (idx) => {
    const block = blocks[idx];
    if (!block._isNew && block.id) {
      if (!confirm('このブロックを削除しますか？')) return;
      await base44.entities.CaseMediaBlock.delete(block.id);
    }
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx, dir) => {
    const newBlocks = [...blocks];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
  };

  const uploadBlockImage = async (idx, file) => {
    setBlockSaving(s => ({ ...s, [idx]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateBlockField(idx, 'image_url', file_url);
    setBlockSaving(s => ({ ...s, [idx]: false }));
  };

  const uploadBlockVideo = async (idx, file) => {
    setBlockSaving(s => ({ ...s, [idx]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateBlockField(idx, 'video_file_url', file_url);
    setBlockSaving(s => ({ ...s, [idx]: false }));
  };

  const otherCases = allCases.filter(c => c.id !== id);
  const blockTypeIcon = { text: <Type className="w-3.5 h-3.5" />, image: <Image className="w-3.5 h-3.5" />, video: <Video className="w-3.5 h-3.5" /> };
  const blockTypeLabel = { text: 'テキスト', image: '画像', video: '動画' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(createPageUrl('AdminCaseStudies'))} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        一覧に戻る
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-8">{id ? '事例を編集' : '新規事例を追加'}</h1>

      <div className="space-y-6">
        {/* 基本情報 */}
        <Section title="基本情報">
          <Field label="企業名 / サービス名 *">
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="例：スターバックス" />
          </Field>
          <Field label="一言タイトル *">
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="例：なぜスタバは値引きせずに行列をつくれるのか" />
          </Field>
          <Field label="短い説明文（一覧表示用）">
            <Textarea value={form.short_description} onChange={e => set('short_description', e.target.value)} rows={2} placeholder="一覧カードに表示される短い説明" />
          </Field>
          <div className="flex gap-4">
            <Field label="表示順">
              <Input type="number" value={form.order} onChange={e => set('order', Number(e.target.value))} className="w-28" />
            </Field>
            <Field label="公開設定">
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">公開する</span>
              </label>
            </Field>
          </div>
        </Section>

        {/* サムネイル */}
        <Section title="サムネイル画像">
          <div className="space-y-3">
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="" className="w-full h-40 object-cover rounded-xl" />
            )}
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400 hover:border-indigo-300 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '画像をアップロード'}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <Field label="または画像URLを直接入力">
              <Input value={form.thumbnail_url} onChange={e => set('thumbnail_url', e.target.value)} placeholder="https://..." />
            </Field>
          </div>
        </Section>

        {/* タグ */}
        <Section title="タグ">
          <Field label="業界タグ">
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_TAGS.map(tag => (
                <button key={tag} type="button"
                  onClick={() => set('industry_tags', toggleTag(form.industry_tags || [], tag))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${(form.industry_tags || []).includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                >{tag}</button>
              ))}
            </div>
          </Field>
          <Field label="学びタグ">
            <div className="flex flex-wrap gap-2">
              {LEARNING_TAGS.map(tag => (
                <button key={tag} type="button"
                  onClick={() => set('learning_tags', toggleTag(form.learning_tags || [], tag))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${(form.learning_tags || []).includes(tag) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}
                >{tag}</button>
              ))}
            </div>
          </Field>
        </Section>

        {/* 詳細コンテンツ */}
        <Section title="詳細コンテンツ">
          <Field label="一言要約">
            <Textarea rows={2} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="この事例を一言で表すと..." />
          </Field>
          <Field label="何がうまいのか">
            <Textarea rows={4} value={form.what_is_good} onChange={e => set('what_is_good', e.target.value)} placeholder="具体的に何が優れているのか" />
          </Field>
          <Field label="なぜうまくいってるのか">
            <Textarea rows={4} value={form.why_it_works} onChange={e => set('why_it_works', e.target.value)} placeholder="背景や構造的な理由" />
          </Field>
          <Field label="ここから学べること">
            <Textarea rows={4} value={form.learnings} onChange={e => set('learnings', e.target.value)} placeholder="読者が自分のビジネスに活かせる学び" />
          </Field>
          <Field label="この事例が刺さる人">
            <Textarea rows={2} value={form.target_reader} onChange={e => set('target_reader', e.target.value)} placeholder="例：集客に悩んでいる店舗オーナー" />
          </Field>
        </Section>

        {/* 画像・動画 説明ブロック（事例保存後のみ） */}
        {id ? (
          <Section title="📖 画像・動画 説明ブロック">
            <p className="text-xs text-gray-400 -mt-1 mb-3">ストーリーのように説明するブロックを追加できます。上から順に表示されます。</p>

            {blocks.length > 0 && (
              <div className="space-y-4 mb-4">
                {blocks.map((block, idx) => (
                  <div key={block.id || block._tempId} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                    {/* ヘッダー行 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg">
                          {blockTypeIcon[block.block_type]}
                          {blockTypeLabel[block.block_type]}
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                          <input type="checkbox" checked={block.is_published !== false} onChange={e => updateBlockField(idx, 'is_published', e.target.checked)} className="w-3.5 h-3.5" />
                          公開
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteBlock(idx)} className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* タイトル */}
                    <Input value={block.title || ''} onChange={e => updateBlockField(idx, 'title', e.target.value)} placeholder="タイトル（任意）" className="text-sm" />

                    {/* 画像入力 */}
                    {block.block_type === 'image' && (
                      <div className="space-y-2">
                        {block.image_url && <img src={block.image_url} alt="" className="w-full h-32 object-cover rounded-lg" />}
                        <label className="block cursor-pointer">
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center text-xs text-gray-400 hover:border-indigo-300 transition-colors bg-white">
                            {blockSaving[idx] ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '画像をアップロード'}
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadBlockImage(idx, e.target.files[0])} />
                        </label>
                        <Input value={block.image_url || ''} onChange={e => updateBlockField(idx, 'image_url', e.target.value)} placeholder="または画像URL（https://...）" className="text-xs" />
                      </div>
                    )}

                    {/* 動画入力 */}
                    {block.block_type === 'video' && (
                      <div className="space-y-2">
                        <Input value={block.video_url || ''} onChange={e => updateBlockField(idx, 'video_url', e.target.value)} placeholder="YouTube URLまたは動画の直リンク" className="text-sm" />
                        <div className="text-xs text-gray-400 text-center">または</div>
                        <label className="block cursor-pointer">
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center text-xs text-gray-400 hover:border-indigo-300 transition-colors bg-white">
                            {blockSaving[idx] ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '動画ファイルをアップロード（mp4等）'}
                          </div>
                          <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files[0] && uploadBlockVideo(idx, e.target.files[0])} />
                        </label>
                        {block.video_file_url && <p className="text-xs text-green-600">✓ 動画ファイルアップロード済み</p>}
                      </div>
                    )}

                    {/* 説明文 */}
                    <Textarea value={block.body || ''} onChange={e => updateBlockField(idx, 'body', e.target.value)} rows={3} placeholder="説明文" />

                    {/* キャプション（画像・動画のみ） */}
                    {(block.block_type === 'image' || block.block_type === 'video') && (
                      <Input value={block.caption || ''} onChange={e => updateBlockField(idx, 'caption', e.target.value)} placeholder="キャプション（任意）" className="text-xs" />
                    )}

                    {/* 保存ボタン */}
                    <Button type="button" onClick={() => saveBlock(idx)} disabled={blockSaving[idx]} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
                      {blockSaving[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> : 'このブロックを保存'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* ブロック追加ボタン */}
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => addBlock('text')} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:text-indigo-600 transition-colors text-gray-600">
                <Type className="w-3.5 h-3.5" /> テキストを追加
              </button>
              <button type="button" onClick={() => addBlock('image')} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:text-indigo-600 transition-colors text-gray-600">
                <Image className="w-3.5 h-3.5" /> 画像を追加
              </button>
              <button type="button" onClick={() => addBlock('video')} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:text-indigo-600 transition-colors text-gray-600">
                <Video className="w-3.5 h-3.5" /> 動画を追加
              </button>
            </div>
          </Section>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            💡 画像・動画の説明ブロックは、事例を保存してから追加できます。
          </div>
        )}

        {/* 関連本 */}
        <Section title="関連本">
          <div className="space-y-3">
            {selectedBooks.length > 0 && (
              <div className="space-y-2">
                {selectedBooks.map(b => (
                  <div key={b.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    {b.cover_url && <img src={b.cover_url} alt="" className="w-10 h-14 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{b.title}</p>
                      <p className="text-xs text-gray-500">{(b.authors || []).join(', ')}</p>
                    </div>
                    <button onClick={() => removeBook(b.id)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={bookQuery}
                onChange={e => { setBookQuery(e.target.value); setShowBookList(true); }}
                onFocus={() => setShowBookList(true)}
                placeholder="タイトル・著者名・キーワードで検索"
                className="pl-9"
              />
            </div>
            {showBookList && bookQuery.trim().length >= 1 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {bookResults.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3 text-center">該当なし</p>
                ) : bookResults.map(b => (
                  <button key={b.id} type="button"
                    onClick={() => { addBook(b); setBookQuery(''); setShowBookList(false); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 text-left border-b border-gray-100 last:border-0"
                  >
                    {b.cover_url && <img src={b.cover_url} alt="" className="w-8 h-11 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                      <p className="text-xs text-gray-500">{(b.authors || []).join(', ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* 関連事例 */}
        {otherCases.length > 0 && (
          <Section title="関連事例">
            <div className="flex flex-wrap gap-2">
              {otherCases.map(c => (
                <button key={c.id} type="button" onClick={() => toggleRelatedCase(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedCases.find(sc => sc.id === c.id)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {c.company_name}：{c.title.slice(0, 15)}{c.title.length > 15 ? '...' : ''}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* 保存 */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminCaseStudies'))} className="flex-1">キャンセル</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (id ? '更新する' : '追加する')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h2 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function Textarea({ value, onChange, rows, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
    />
  );
}