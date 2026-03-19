import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Card from '@/components/common/Card';
import { Save, ArrowLeft, Plus, X, Loader2, Sparkles, Trash2 } from 'lucide-react';

const BUSINESS_SCORE_OPTIONS = [
    { value: 3, label: '3点', desc: 'その本の中心テーマとしてかなり強く効く' },
    { value: 2, label: '2点', desc: '明確に関連する' },
    { value: 1, label: '1点', desc: '補助的に関連する' },
];

const NOVEL_SCORE_OPTIONS = [
    { value: 3, label: '3点', desc: 'かなり刺さりやすい / 優先表示したい' },
    { value: 2, label: '2点', desc: '相性がある / 補助的に表示したい' },
    { value: 1, label: '1点', desc: '少し関連する / サブ候補として表示したい' },
];

const EFFECT_LABEL_OPTIONS = [
    // 感情を整える系
    '気持ちが整う', '焦りがやわらぐ', '孤独感がやわらぐ', '自分を責めすぎなくなる', '心の余白が戻る',
    // 視点が変わる系
    '視野が広がる', '発想が広がる', '本質を見直せる', '当たり前を疑える', '自分を客観視できる',
    // 行動を動かす系
    '行動のきっかけになる', '一歩踏み出したくなる', '挑戦したくなる', '続ける力を思い出せる', '立ち止まりをほどける',
    // 仕事観・価値観に効く系
    '仕事観を見直せる', '働く意味を考え直せる', '自分の軸を取り戻せる', '誇りを取り戻せる', '人との向き合い方を見直せる',
];

function ArrayField({ label, field, values, onChange, onAdd, onRemove, placeholder, required }) {
    return (
        <div>
            <Label>{label}{required && ' *'}</Label>
            {values.map((val, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                    <Input value={val} onChange={(e) => onChange(field, idx, e.target.value)} placeholder={placeholder} />
                    {values.length > 1 && (
                        <Button onClick={() => onRemove(field, idx)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                    )}
                </div>
            ))}
            <Button onClick={() => onAdd(field)} variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />追加
            </Button>
        </div>
    );
}

export default function AdminBookEdit() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [resultTypes, setResultTypes] = useState([]);
    const [mappings, setMappings] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        authors: [''],
        isbn: '',
        book_category: 'business',
        subcategory: '',
        tags: [''],
        description: '',
        one_liner: '',
        cover_url: '',
        amazon_url: '',
        rakuten_url: '',
        google_rating: '',
        google_ratings_count: '',
        // business専用
        pain_points: [''],
        outcomes: [''],
        not_for: [''],
        // novel_essay専用
        for_whom: [''],
        what_it_gives: [''],
        novel_outcomes: [''],
        effect_labels: [],
        connection_text: '',
    });

    const category = formData.book_category;
    const isNovel = category === 'novel_essay';
    const scoreOptions = isNovel ? NOVEL_SCORE_OPTIONS : BUSINESS_SCORE_OPTIONS;

    useEffect(() => {
        checkAdminAndLoad();
    }, [bookId]);

    const checkAdminAndLoad = async () => {
        try {
            const user = await base44.auth.me();
            if (user.role !== 'admin') { navigate(createPageUrl('home')); return; }

            const types = await base44.entities.DiagnosisResultType.list('order', 100);
            setResultTypes(types);

            if (bookId && bookId !== 'new') {
                const [book, existingMappings] = await Promise.all([
                    base44.entities.Book.get(bookId),
                    base44.entities.BookDiagnosisMapping.filter({ book_id: bookId }, '-relevance_score', 50),
                ]);
                setFormData({
                    title: book.title || '',
                    authors: book.authors?.length > 0 ? book.authors : [''],
                    isbn: book.isbn || '',
                    book_category: book.book_category || 'business',
                    subcategory: book.subcategory || '',
                    tags: book.tags?.length > 0 ? book.tags : [''],
                    description: book.description || '',
                    one_liner: book.one_liner || '',
                    cover_url: book.cover_url || '',
                    amazon_url: book.amazon_url || '',
                    rakuten_url: book.rakuten_url || '',
                    google_rating: book.google_rating || '',
                    google_ratings_count: book.google_ratings_count || '',
                    pain_points: book.pain_points?.length > 0 ? book.pain_points : [''],
                    outcomes: book.outcomes?.length > 0 ? book.outcomes : [''],
                    not_for: book.not_for?.length > 0 ? book.not_for : [''],
                    for_whom: book.for_whom?.length > 0 ? book.for_whom : [''],
                    what_it_gives: book.what_it_gives?.length > 0 ? book.what_it_gives : [''],
                    novel_outcomes: book.novel_outcomes?.length > 0 ? book.novel_outcomes : [''],
                    effect_labels: Array.isArray(book.effect_labels) ? book.effect_labels : (book.effect_label ? [book.effect_label] : []),
                    connection_text: book.connection_text || '',
                });
                setMappings(existingMappings);
            }
        } catch (error) {
            navigate(createPageUrl('AdminBooks'));
        } finally {
            setLoading(false);
        }
    };

    const handleArrayChange = (field, index, value) => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };
    const addArrayItem = (field) => setFormData({ ...formData, [field]: [...formData[field], ''] });
    const removeArrayItem = (field, index) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [''] });
    };

    const addMapping = () => {
        setMappings(prev => [...prev, { _isNew: true, book_id: bookId || 'new', diagnosis_type_key: '', relevance_score: 2, recommendation_text: '', score_mode: isNovel ? 'affinity' : 'direct' }]);
    };
    const updateMapping = (idx, field, value) => setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
    const removeMapping = (idx) => setMappings(prev => prev.filter((_, i) => i !== idx));

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData({ ...formData, cover_url: file_url });
        } catch {
            alert('画像のアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!formData.title) { alert('タイトルを入力してください'); return; }
        setGenerating(true);
        try {
            const prompt = isNovel
                ? `以下の小説・エッセイについて、以下のJSON形式でコピーを生成してください。
タイトル: ${formData.title}
著者: ${formData.authors.filter(a => a).join(', ')}

JSON:
{
  "for_whom": ["こんな人に合う1", "こんな人に合う2", "こんな人に合う3"],
  "what_it_gives": ["この本がくれるもの1", "この本がくれるもの2"],
  "novel_outcomes": ["読後に起きる変化1", "読後に起きる変化2"],
  "effect_label": "効き方ラベル（10文字以内）",
  "connection_text": "診断結果の悩みとこの本をつなぐ短い推薦文（〜一冊 で終わる形式）",
  "one_liner": "1行で刺さる説明（30文字程度）"
}`
                : `以下の本についてマーケティング向けのコピーを生成してください。
タイトル: ${formData.title}
著者: ${formData.authors.filter(a => a).join(', ')}

JSON:
{
  "pain_points": ["悩み1", "悩み2", "悩み3", "悩み4", "悩み5"],
  "outcomes": ["成果1", "成果2", "成果3", "成果4", "成果5"],
  "not_for": ["注意点1", "注意点2"],
  "one_liner": "1行で刺さる説明（30文字程度）"
}`;

            const schema = isNovel ? {
                type: "object",
                properties: {
                    for_whom: { type: "array", items: { type: "string" } },
                    what_it_gives: { type: "array", items: { type: "string" } },
                    novel_outcomes: { type: "array", items: { type: "string" } },
                    effect_label: { type: "string" },
                    connection_text: { type: "string" },
                    one_liner: { type: "string" },
                }
            } : {
                type: "object",
                properties: {
                    pain_points: { type: "array", items: { type: "string" } },
                    outcomes: { type: "array", items: { type: "string" } },
                    not_for: { type: "array", items: { type: "string" } },
                    one_liner: { type: "string" },
                }
            };

            const response = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });

            if (isNovel) {
                setFormData({
                    ...formData,
                    for_whom: response.for_whom?.length > 0 ? response.for_whom : [''],
                    what_it_gives: response.what_it_gives?.length > 0 ? response.what_it_gives : [''],
                    novel_outcomes: response.novel_outcomes?.length > 0 ? response.novel_outcomes : [''],
                    effect_label: response.effect_label || '',
                    connection_text: response.connection_text || '',
                    one_liner: response.one_liner || '',
                });
            } else {
                setFormData({
                    ...formData,
                    pain_points: response.pain_points || [''],
                    outcomes: response.outcomes || [''],
                    not_for: response.not_for?.length > 0 ? response.not_for : [''],
                    one_liner: response.one_liner || '',
                });
            }
        } catch {
            alert('AI生成に失敗しました');
        } finally {
            setGenerating(false);
        }
    };

    const normalizeSearchText = (title, authors) => {
        let text = (title + ' ' + (authors || []).join(' ')).normalize('NFKC').toLowerCase();
        return text.replace(/[・:！？（）『』「」【】\-\.\,\!\?\(\)\[\]\{\}]/g, '').replace(/\s+/g, '');
    };

    const handleSave = async () => {
        if (!formData.title || !formData.amazon_url) { alert('タイトルとAmazon URLは必須です'); return; }

        setSaving(true);
        try {
            const cleanedAuthors = formData.authors.filter(a => a.trim());
            const base = {
                title: formData.title,
                authors: cleanedAuthors,
                isbn: formData.isbn || undefined,
                book_category: formData.book_category,
                tags: formData.tags.filter(t => t.trim()),
                description: formData.description || undefined,
                one_liner: formData.one_liner || undefined,
                cover_url: formData.cover_url || undefined,
                amazon_url: formData.amazon_url,
                rakuten_url: formData.rakuten_url || undefined,
                google_rating: formData.google_rating ? parseFloat(formData.google_rating) : undefined,
                google_ratings_count: formData.google_ratings_count ? parseInt(formData.google_ratings_count) : undefined,
                search_text: normalizeSearchText(formData.title, cleanedAuthors),
            };

            const categoryData = isNovel ? {
                subcategory: formData.subcategory || undefined,
                for_whom: formData.for_whom.filter(v => v.trim()),
                what_it_gives: formData.what_it_gives.filter(v => v.trim()),
                novel_outcomes: formData.novel_outcomes.filter(v => v.trim()),
                effect_labels: formData.effect_labels,
                effect_label: formData.effect_labels[0] || undefined, // 後方互換
                connection_text: formData.connection_text || undefined,
                // business fields cleared
                pain_points: [],
                outcomes: [],
                not_for: [],
            } : {
                pain_points: formData.pain_points.filter(p => p.trim()),
                outcomes: formData.outcomes.filter(o => o.trim()),
                not_for: formData.not_for.filter(n => n.trim()),
                // novel_essay fields cleared
                for_whom: [],
                what_it_gives: [],
                novel_outcomes: [],
                effect_labels: [],
                effect_label: undefined,
                connection_text: undefined,
            };

            const data = { ...base, ...categoryData };

            let savedBookId = bookId;
            if (bookId && bookId !== 'new') {
                await base44.entities.Book.update(bookId, data);
            } else {
                const created = await base44.entities.Book.create(data);
                savedBookId = created.id;
            }

            if (savedBookId && savedBookId !== 'new') {
                const existingMappings = await base44.entities.BookDiagnosisMapping.filter({ book_id: savedBookId }, '-relevance_score', 50);
                await Promise.all(existingMappings.map(m => base44.entities.BookDiagnosisMapping.delete(m.id)));
                await Promise.all(
                    mappings
                        .filter(m => m.diagnosis_type_key)
                        .map(m => base44.entities.BookDiagnosisMapping.create({
                            book_id: savedBookId,
                            diagnosis_type_key: m.diagnosis_type_key,
                            relevance_score: m.relevance_score || 2,
                            score_mode: isNovel ? 'affinity' : 'direct',
                            recommendation_text: m.recommendation_text || '',
                            priority_order: m.relevance_score || 2,
                        }))
                );
            }

            navigate(createPageUrl('AdminBooks'));
        } catch (error) {
            console.error('Error saving book:', error);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Button onClick={() => navigate(createPageUrl('AdminBooks'))} variant="outline" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />戻る
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">{bookId === 'new' ? '本を新規登録' : '本を編集'}</h1>
                    </div>
                </div>

                <Card className="space-y-8">

                    {/* 基本情報（共通） */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">📌 基本情報（共通）</h2>
                        <div className="space-y-4">
                            <div>
                                <Label>本のカテゴリ *</Label>
                                <div className="flex gap-3 mt-2">
                                    {[
                                        { value: 'business', label: '📊 ビジネス書', desc: '課題への直接的な学び' },
                                        { value: 'novel_essay', label: '📖 小説・エッセイ', desc: '視点・感情・行動の後押し' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, book_category: opt.value })}
                                            className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${formData.book_category === opt.value
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 bg-white hover:border-indigo-300'}`}
                                        >
                                            <div className="font-bold text-gray-900 text-sm">{opt.label}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>タイトル *</Label>
                                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="本のタイトル" />
                            </div>
                            <div>
                                <Label>著者</Label>
                                {formData.authors.map((author, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input value={author} onChange={(e) => handleArrayChange('authors', idx, e.target.value)} placeholder="著者名" />
                                        {formData.authors.length > 1 && (
                                            <Button onClick={() => removeArrayItem('authors', idx)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                ))}
                                <Button onClick={() => addArrayItem('authors')} variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />著者を追加</Button>
                            </div>
                            <div>
                                <Label>表紙画像</Label>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="flex-1" />
                                        {uploading && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                                    </div>
                                    {formData.cover_url && (
                                        <div className="relative w-32 h-48">
                                            <img src={formData.cover_url} alt="表紙プレビュー" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                        </div>
                                    )}
                                    <Input value={formData.cover_url} onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })} placeholder="または画像URLを直接入力" className="text-sm" />
                                </div>
                            </div>
                            <div>
                                <Label>Amazon URL *</Label>
                                <Input value={formData.amazon_url} onChange={(e) => setFormData({ ...formData, amazon_url: e.target.value })} placeholder="https://amazon.co.jp/..." />
                            </div>
                            <div>
                                <Label>楽天ブックス URL</Label>
                                <Input value={formData.rakuten_url} onChange={(e) => setFormData({ ...formData, rakuten_url: e.target.value })} placeholder="https://books.rakuten.co.jp/..." />
                            </div>
                            <div>
                                <Label>ISBN</Label>
                                <Input value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} placeholder="ISBN" />
                            </div>
                        </div>
                    </div>

                    {/* カテゴリ別フォーム */}
                    {!isNovel ? (
                        /* ビジネス書専用 */
                        <div className="border-t pt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">📊 ビジネス書の情報</h2>
                                <Button onClick={handleGenerateAI} disabled={generating || !formData.title} variant="outline" className="gap-2">
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    AIで生成
                                </Button>
                            </div>
                            <div className="space-y-6">
                                <ArrayField label="タグ" field="tags" values={formData.tags}
                                    onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                    placeholder="タグ（例：マーケティング、習慣）" />
                                <div>
                                    <Label>説明</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="本の説明" rows={4} />
                                </div>
                                <div>
                                    <Label>1行で刺さる説明</Label>
                                    <Input value={formData.one_liner} onChange={(e) => setFormData({ ...formData, one_liner: e.target.value })} placeholder="30文字程度" />
                                </div>
                                <ArrayField label="こんな悩みの人におすすめ" field="pain_points" values={formData.pain_points}
                                    onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                    placeholder="悩みや課題" required />
                                <ArrayField label="読んだ後こうなれる" field="outcomes" values={formData.outcomes}
                                    onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                    placeholder="得られる成果や変化" required />
                                <ArrayField label="合わないかも（任意）" field="not_for" values={formData.not_for}
                                    onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                    placeholder="合わない人や注意点" />
                            </div>
                        </div>
                    ) : (
                        /* 小説・エッセイ専用 */
                        <div className="border-t pt-8">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-bold text-gray-900">📖 小説・エッセイの情報</h2>
                                <Button onClick={handleGenerateAI} disabled={generating || !formData.title} variant="outline" className="gap-2">
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    AIで生成
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">「何を解決するか」より「どんな時に、どう効くか」を登録してください</p>
                            <div className="space-y-6">
                                <ArrayField label="タグ" field="tags" values={formData.tags}
                                    onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                    placeholder="タグ（例：自己啓発、物語）" />
                                <div>
                                    <Label>説明</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="本の説明" rows={4} />
                                </div>
                                <div>
                                    <Label>1行で刺さる説明</Label>
                                    <Input value={formData.one_liner} onChange={(e) => setFormData({ ...formData, one_liner: e.target.value })} placeholder="例：停滞感の中に「前に進む力」をくれる一冊" />
                                </div>
                                <div>
                                    <Label>小説 / エッセイ（サブカテゴリ）</Label>
                                    <div className="flex gap-2 mt-1">
                                        {[{ value: '', label: '未分類' }, { value: 'novel', label: '📚 小説' }, { value: 'essay', label: '✍️ エッセイ' }].map(opt => (
                                            <button key={opt.value} type="button"
                                                onClick={() => setFormData({ ...formData, subcategory: opt.value })}
                                                className={`px-4 py-1.5 rounded-lg border text-sm transition-colors ${formData.subcategory === opt.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
                                            >{opt.label}</button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">表示上は「小説・エッセイ」のまま。内部分類として使用します。</p>
                                </div>
                                <div>
                                    <Label>こんな人に合う</Label>
                                    <p className="text-xs text-gray-400 mb-1">診断タイプ名ではなく、自然なユーザー表現で入力してください</p>
                                    <ArrayField label="" field="for_whom" values={formData.for_whom}
                                        onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                        placeholder="例：やる気が落ちている人" />
                                </div>
                                <div>
                                    <Label>この本がくれるもの</Label>
                                    <ArrayField label="" field="what_it_gives" values={formData.what_it_gives}
                                        onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                        placeholder="例：視野を広げてくれる" />
                                </div>
                                <ArrayField label="読後に起きる変化" field="novel_outcomes" values={formData.novel_outcomes}
                                    onChange={handleArrayChange} onAdd={addArrayItem} onRemove={removeArrayItem}
                                    placeholder="例：仕事の見え方が少し変わる" />
                                <div>
                                    <Label>効き方ラベル（2〜3個を選択）</Label>
                                    <p className="text-xs text-gray-400 mb-3">正式ラベルから2〜3個選択してください。足りない場合のみ自由追加できます。</p>
                                    {[
                                        { group: '感情を整える系', labels: ['気持ちが整う', '焦りがやわらぐ', '孤独感がやわらぐ', '自分を責めすぎなくなる', '心の余白が戻る'] },
                                        { group: '視点が変わる系', labels: ['視野が広がる', '発想が広がる', '本質を見直せる', '当たり前を疑える', '自分を客観視できる'] },
                                        { group: '行動を動かす系', labels: ['行動のきっかけになる', '一歩踏み出したくなる', '挑戦したくなる', '続ける力を思い出せる', '立ち止まりをほどける'] },
                                        { group: '仕事観・価値観に効く系', labels: ['仕事観を見直せる', '働く意味を考え直せる', '自分の軸を取り戻せる', '誇りを取り戻せる', '人との向き合い方を見直せる'] },
                                    ].map(({ group, labels }) => (
                                        <div key={group} className="mb-3">
                                            <p className="text-xs font-medium text-gray-500 mb-1.5">【{group}】</p>
                                            <div className="flex flex-wrap gap-2">
                                                {labels.map(ex => {
                                                    const selected = (formData.effect_labels || []).includes(ex);
                                                    return (
                                                        <button key={ex} type="button"
                                                            onClick={() => {
                                                                const current = formData.effect_labels || [];
                                                                setFormData({ ...formData, effect_labels: selected ? current.filter(l => l !== ex) : [...current, ex] });
                                                            }}
                                                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}
                                                        >{ex}</button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {/* カスタムラベル表示 */}
                                    {(formData.effect_labels || []).filter(l => !EFFECT_LABEL_OPTIONS.includes(l)).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(formData.effect_labels || []).filter(l => !EFFECT_LABEL_OPTIONS.includes(l)).map(label => (
                                                <span key={label} className="text-xs px-3 py-1.5 rounded-full border bg-purple-600 text-white border-purple-600 flex items-center gap-1">
                                                    {label}
                                                    <button type="button" onClick={() => setFormData({ ...formData, effect_labels: (formData.effect_labels || []).filter(l => l !== label) })}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* 自由入力 */}
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            id="custom-effect-label-input"
                                            placeholder="独自ラベルを追加（例：涙が出る）"
                                            className="text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = e.target.value.trim();
                                                    if (val && !(formData.effect_labels || []).includes(val)) {
                                                        setFormData({ ...formData, effect_labels: [...(formData.effect_labels || []), val] });
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="outline" size="sm" className="shrink-0"
                                            onClick={() => {
                                                const input = document.getElementById('custom-effect-label-input');
                                                const val = input.value.trim();
                                                if (val && !(formData.effect_labels || []).includes(val)) {
                                                    setFormData({ ...formData, effect_labels: [...(formData.effect_labels || []), val] });
                                                }
                                                input.value = '';
                                            }}
                                        ><Plus className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div>
                                    <Label>接続文</Label>
                                    <p className="text-xs text-gray-400 mb-1">診断結果の悩みとこの本をつなぐ短い推薦文を入力してください。できれば「〜一冊」で終わる形を推奨。</p>
                                    <Textarea
                                        value={formData.connection_text}
                                        onChange={(e) => setFormData({ ...formData, connection_text: e.target.value })}
                                        placeholder="例：立ち止まっている時に、前に進むきっかけをくれる一冊"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 診断タイプ紐付け */}
                    <div className="border-t pt-8">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-gray-900">🎯 診断タイプ紐付け</h2>
                            <Button onClick={addMapping} variant="outline" className="gap-2 text-sm" disabled={mappings.length >= (isNovel ? 3 : 5)}>
                                <Plus className="w-4 h-4" /> 紐付けを追加{isNovel ? `（最大3つ）` : `（最大5つ）`}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">システム上のレコメンド分類です。自然文ではなくタイプで設定してください。</p>
                        <div className={`text-sm mb-3 p-3 rounded-xl ${isNovel ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                            {isNovel
                                ? '🎭 小説・エッセイの上限は3つです。広く紐付けすぎるとレコメンド精度が落ちるため、特に刺さるタイプに絞って設定してください。'
                                : '📊 ビジネス書のスコアは「直接解決の強さ」として扱います。その本の中心テーマがどれだけ診断タイプの悩みに効くかで判断してください。'}
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-xs text-gray-600 space-y-1">
                            <p className="font-semibold text-gray-700 mb-1">スコア基準</p>
                            {isNovel ? (
                                <>
                                    <p>🔴 3点 = このタイプの人にかなり刺さりやすい / 優先表示したい</p>
                                    <p>🟡 2点 = 相性がある / 補助的に表示したい</p>
                                    <p>⚪ 1点 = 少し関連する / サブ候補として表示したい</p>
                                </>
                            ) : (
                                <>
                                    <p>🔴 3点 = その本の中心テーマとしてかなり強く効く</p>
                                    <p>🟡 2点 = 明確に関連する</p>
                                    <p>⚪ 1点 = 補助的に関連する</p>
                                </>
                            )}
                        </div>

                        {resultTypes.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-4">
                                診断タイプがまだ登録されていません。AdminDiagnosis &gt; 診断タイプ管理 から先に作成してください。
                            </div>
                        )}

                        <div className="space-y-3">
                            {[...mappings]
                                .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
                                .map((mapping, idx) => {
                                    const realIdx = mappings.indexOf(mapping);
                                    return (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">紐付け #{idx + 1}</span>
                                                <button onClick={() => removeMapping(realIdx)} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">診断タイプ *</label>
                                                    <select
                                                        value={mapping.diagnosis_type_key}
                                                        onChange={e => updateMapping(realIdx, 'diagnosis_type_key', e.target.value)}
                                                        className="w-full border rounded-lg text-sm px-2 py-1.5 bg-white"
                                                    >
                                                        <option value="">選択してください</option>
                                                        {resultTypes.map(t => (
                                                            <option key={t.id} value={t.key}>{t.emoji || ''} {t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">
                                                        {isNovel ? '適合度スコア' : '関連度スコア'}
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {scoreOptions.map(s => (
                                                            <button
                                                                key={s.value}
                                                                type="button"
                                                                onClick={() => updateMapping(realIdx, 'relevance_score', s.value)}
                                                                className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                                                    (mapping.relevance_score || 2) === s.value
                                                                        ? (isNovel ? 'bg-purple-600 text-white border-purple-600' : 'bg-indigo-600 text-white border-indigo-600')
                                                                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                                                                }`}
                                                                title={s.desc}
                                                            >
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {scoreOptions.find(s => s.value === (mapping.relevance_score || 2))?.desc}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">
                                                    {isNovel ? '接続コメント（任意）' : '推薦文（任意）'}
                                                </label>
                                                <Textarea
                                                    value={mapping.recommendation_text || ''}
                                                    onChange={e => updateMapping(realIdx, 'recommendation_text', e.target.value)}
                                                    placeholder={isNovel
                                                        ? '例：立ち止まっている時に、前に進むきっかけをくれる一冊'
                                                        : '例：集客手段を増やす前に、まず自分の強みを言語化することが重要です。'}
                                                    rows={2}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            {mappings.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                                    <p>まだ診断タイプが紐付けられていません</p>
                                    <p className="mt-1 text-xs">「紐付けを追加」ボタンから設定してください（最大{isNovel ? 3 : 5}つ）</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button onClick={() => navigate(createPageUrl('AdminBooks'))} variant="outline">キャンセル</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            保存
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}