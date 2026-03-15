import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, X, Loader2 } from 'lucide-react';

const INDUSTRY_TAGS = ['飲食', 'サブスク', '小売', 'アパレル', 'テック', 'エンタメ', '美容', '教育', 'EC', 'サービス'];
const LEARNING_TAGS = ['マーケティング', 'ブランディング', '営業', '差別化', '導線設計', '継続設計', '体験価値', '高単価化', '習慣化', 'リピート設計'];

const defaultForm = {
  title: '',
  company_name: '',
  thumbnail_url: '',
  short_description: '',
  summary: '',
  what_is_good: '',
  why_it_works: '',
  learnings: '',
  target_reader: '',
  industry_tags: [],
  learning_tags: [],
  related_book_ids: [],
  related_case_ids: [],
  is_published: false,
  order: 0,
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
  const [bookResults, setBookResults] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);

  // 関連事例
  const [allCases, setAllCases] = useState([]);
  const [selectedCases, setSelectedCases] = useState([]);

  useEffect(() => {
    base44.entities.CaseStudy.list('order', 200).then(setAllCases);
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
    }
  }, [id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleTag = (arr, tag) =>
    arr.includes(tag) ? arr.filter(t => t !== tag) : [...arr, tag];

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('thumbnail_url', file_url);
    setUploading(false);
  };

  const searchBooks = async () => {
    if (!bookQuery.trim()) return;
    const res = await base44.functions.invoke('searchBooks', { query: bookQuery });
    setBookResults(res.data?.results || []);
  };

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
    if (!form.title || !form.company_name) {
      alert('タイトルと企業名は必須です');
      return;
    }
    setSaving(true);
    const payload = { ...form };
    if (id) {
      await base44.entities.CaseStudy.update(id, payload);
    } else {
      await base44.entities.CaseStudy.create(payload);
    }
    setSaving(false);
    navigate(createPageUrl('AdminCaseStudies'));
  };

  const otherCases = allCases.filter(c => c.id !== id);

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
            <textarea
              value={form.short_description}
              onChange={e => set('short_description', e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="一覧カードに表示される短い説明"
            />
          </Field>
          <Field label="表示順">
            <Input type="number" value={form.order} onChange={e => set('order', Number(e.target.value))} className="w-32" />
          </Field>
          <Field label="公開設定">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">公開する</span>
            </label>
          </Field>
        </Section>

        {/* サムネイル */}
        <Section title="サムネイル画像">
          <div className="space-y-3">
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="" className="w-full h-40 object-cover rounded-xl" />
            )}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400 hover:border-indigo-300 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '画像をアップロード'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
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
                <button
                  key={tag}
                  type="button"
                  onClick={() => set('industry_tags', toggleTag(form.industry_tags || [], tag))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    (form.industry_tags || []).includes(tag)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Field>
          <Field label="学びタグ">
            <div className="flex flex-wrap gap-2">
              {LEARNING_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => set('learning_tags', toggleTag(form.learning_tags || [], tag))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    (form.learning_tags || []).includes(tag)
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* 詳細コンテンツ */}
        <Section title="詳細コンテンツ">
          <Field label="一言要約">
            <textarea rows={2} value={form.summary} onChange={e => set('summary', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="この事例を一言で表すと..." />
          </Field>
          <Field label="何がうまいのか">
            <textarea rows={4} value={form.what_is_good} onChange={e => set('what_is_good', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="具体的に何が優れているのか" />
          </Field>
          <Field label="なぜうまくいってるのか">
            <textarea rows={4} value={form.why_it_works} onChange={e => set('why_it_works', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="背景や構造的な理由" />
          </Field>
          <Field label="ここから学べること">
            <textarea rows={4} value={form.learnings} onChange={e => set('learnings', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="読者が自分のビジネスに活かせる学び" />
          </Field>
          <Field label="この事例が刺さる人">
            <textarea rows={2} value={form.target_reader} onChange={e => set('target_reader', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="例：集客に悩んでいる店舗オーナー" />
          </Field>
        </Section>

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
                    <button onClick={() => removeBook(b.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={bookQuery}
                onChange={e => setBookQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchBooks()}
                placeholder="本のタイトルで検索"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={searchBooks}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {bookResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {bookResults.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { addBook(b); setBookResults([]); setBookQuery(''); }}
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
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleRelatedCase(c)}
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
          <Button variant="outline" onClick={() => navigate(createPageUrl('AdminCaseStudies'))} className="flex-1">
            キャンセル
          </Button>
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