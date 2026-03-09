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

const SCORE_OPTIONS = [
    { value: 3, label: '3点', desc: 'かなり強く役立つ' },
    { value: 2, label: '2点', desc: '明確に関連する' },
    { value: 1, label: '1点', desc: '補助的に関連する' },
];

export default function AdminBookEdit() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [resultTypes, setResultTypes] = useState([]);
    const [mappings, setMappings] = useState([]); // BookDiagnosisMapping[]

    const [formData, setFormData] = useState({
        title: '',
        authors: [''],
        isbn: '',
        tags: [''],
        description: '',
        cover_url: '',
        amazon_url: '',
        rakuten_url: '',
        ehon_url: '',
        honyaclub_url: '',
        google_rating: '',
        google_ratings_count: '',
        pain_points: [''],
        outcomes: [''],
        not_for: [''],
        one_liner: '',
    });

    useEffect(() => {
        checkAdminAndLoad();
    }, [bookId]);

    const checkAdminAndLoad = async () => {
        try {
            const user = await base44.auth.me();
            if (user.role !== 'admin') {
                navigate(createPageUrl('home'));
                return;
            }

            const [types] = await Promise.all([
                base44.entities.DiagnosisResultType.list('order', 100),
            ]);
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
                    tags: book.tags?.length > 0 ? book.tags : [''],
                    description: book.description || '',
                    cover_url: book.cover_url || '',
                    amazon_url: book.amazon_url || '',
                    rakuten_url: book.rakuten_url || '',
                    ehon_url: book.ehon_url || '',
                    honyaclub_url: book.honyaclub_url || '',
                    google_rating: book.google_rating || '',
                    google_ratings_count: book.google_ratings_count || '',
                    pain_points: book.pain_points?.length > 0 ? book.pain_points : [''],
                    outcomes: book.outcomes?.length > 0 ? book.outcomes : [''],
                    not_for: book.not_for?.length > 0 ? book.not_for : [''],
                    one_liner: book.one_liner || '',
                });
                setMappings(existingMappings);
            }
        } catch (error) {
            console.error('Error:', error);
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

    const addArrayItem = (field) => {
        setFormData({ ...formData, [field]: [...formData[field], ''] });
    };

    const removeArrayItem = (field, index) => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [''] });
    };

    // マッピング管理
    const addMapping = () => {
        if (mappings.length >= 3) return;
        setMappings(prev => [...prev, { _isNew: true, book_id: bookId || 'new', diagnosis_type_key: '', relevance_score: 2, recommendation_text: '' }]);
    };

    const updateMapping = (idx, field, value) => {
        setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
    };

    const removeMapping = (idx) => {
        setMappings(prev => prev.filter((_, i) => i !== idx));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData({ ...formData, cover_url: file_url });
        } catch (error) {
            alert('画像のアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!formData.title) { alert('タイトルを入力してください'); return; }
        setGenerating(true);
        try {
            const prompt = `以下の本についてマーケティング向けのコピーを生成してください。
タイトル: ${formData.title}
著者: ${formData.authors.filter(a => a).join(', ')}

JSON形式で返してください:
{
  "pain_points": ["悩み1", "悩み2", "悩み3", "悩み4", "悩み5"],
  "outcomes": ["成果1", "成果2", "成果3", "成果4", "成果5"],
  "not_for": ["注意点1", "注意点2"],
  "one_liner": "1行で刺さる説明（30文字程度）"
}`;
            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        pain_points: { type: "array", items: { type: "string" } },
                        outcomes: { type: "array", items: { type: "string" } },
                        not_for: { type: "array", items: { type: "string" } },
                        one_liner: { type: "string" }
                    }
                }
            });
            setFormData({ ...formData, pain_points: response.pain_points || [''], outcomes: response.outcomes || [''], not_for: response.not_for?.length > 0 ? response.not_for : [''], one_liner: response.one_liner || '' });
        } catch (error) {
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
        const cleanedPainPoints = formData.pain_points.filter(p => p.trim());
        const cleanedOutcomes = formData.outcomes.filter(o => o.trim());
        if (cleanedPainPoints.length === 0 || cleanedOutcomes.length === 0) { alert('「こんな悩み」と「読後の変化」は必須です'); return; }

        setSaving(true);
        try {
            const cleanedAuthors = formData.authors.filter(a => a.trim());
            const data = {
                title: formData.title,
                authors: cleanedAuthors,
                isbn: formData.isbn || undefined,
                tags: formData.tags.filter(t => t.trim()),
                description: formData.description || undefined,
                cover_url: formData.cover_url || undefined,
                amazon_url: formData.amazon_url,
                rakuten_url: formData.rakuten_url || undefined,
                ehon_url: formData.ehon_url || undefined,
                honyaclub_url: formData.honyaclub_url || undefined,
                google_rating: formData.google_rating ? parseFloat(formData.google_rating) : undefined,
                google_ratings_count: formData.google_ratings_count ? parseInt(formData.google_ratings_count) : undefined,
                pain_points: cleanedPainPoints,
                outcomes: cleanedOutcomes,
                not_for: formData.not_for.filter(n => n.trim()),
                one_liner: formData.one_liner || undefined,
                search_text: normalizeSearchText(formData.title, cleanedAuthors),
            };

            let savedBookId = bookId;
            if (bookId && bookId !== 'new') {
                await base44.entities.Book.update(bookId, data);
            } else {
                const created = await base44.entities.Book.create(data);
                savedBookId = created.id;
            }

            // マッピングを保存（既存を削除して再作成）
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

                <Card className="space-y-6">
                    {/* 基本情報 */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">基本情報</h2>
                        <div className="space-y-4">
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
                                <Label>タグ</Label>
                                {formData.tags.map((tag, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input value={tag} onChange={(e) => handleArrayChange('tags', idx, e.target.value)} placeholder="タグ" />
                                        {formData.tags.length > 1 && (
                                            <Button onClick={() => removeArrayItem('tags', idx)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                ))}
                                <Button onClick={() => addArrayItem('tags')} variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />タグを追加</Button>
                            </div>
                            <div>
                                <Label>説明</Label>
                                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="本の説明" rows={4} />
                            </div>
                            <div>
                                <Label>ISBN</Label>
                                <Input value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} placeholder="ISBN" />
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
                        </div>
                    </div>

                    {/* 購入リンク */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">購入リンク</h2>
                        <div className="space-y-4">
                            <div>
                                <Label>Amazon URL *</Label>
                                <Input value={formData.amazon_url} onChange={(e) => setFormData({ ...formData, amazon_url: e.target.value })} placeholder="https://amazon.co.jp/..." />
                            </div>
                            <div>
                                <Label>楽天ブックス URL</Label>
                                <Input value={formData.rakuten_url} onChange={(e) => setFormData({ ...formData, rakuten_url: e.target.value })} placeholder="https://books.rakuten.co.jp/..." />
                            </div>
                        </div>
                    </div>

                    {/* マーケティング情報 */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">マーケティング情報</h2>
                            <Button onClick={handleGenerateAI} disabled={generating || !formData.title} variant="outline" className="gap-2">
                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                AIで生成
                            </Button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <Label>1行で刺さる説明</Label>
                                <Input value={formData.one_liner} onChange={(e) => setFormData({ ...formData, one_liner: e.target.value })} placeholder="30文字程度" />
                            </div>
                            <div>
                                <Label>こんな悩みの人におすすめ *</Label>
                                {formData.pain_points.map((point, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input value={point} onChange={(e) => handleArrayChange('pain_points', idx, e.target.value)} placeholder="悩みや課題" />
                                        {formData.pain_points.length > 1 && (
                                            <Button onClick={() => removeArrayItem('pain_points', idx)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                ))}
                                <Button onClick={() => addArrayItem('pain_points')} variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />追加</Button>
                            </div>
                            <div>
                                <Label>読んだ後こうなれる *</Label>
                                {formData.outcomes.map((outcome, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input value={outcome} onChange={(e) => handleArrayChange('outcomes', idx, e.target.value)} placeholder="得られる成果や変化" />
                                        {formData.outcomes.length > 1 && (
                                            <Button onClick={() => removeArrayItem('outcomes', idx)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                ))}
                                <Button onClick={() => addArrayItem('outcomes')} variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />追加</Button>
                            </div>
                            <div>
                                <Label>合わないかも（任意）</Label>
                                {formData.not_for.map((note, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input value={note} onChange={(e) => handleArrayChange('not_for', idx, e.target.value)} placeholder="合わない人や注意点" />
                                        {formData.not_for.length > 1 && (
                                            <Button onClick={() => removeArrayItem('not_for', idx)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                                        )}
                                    </div>
                                ))}
                                <Button onClick={() => addArrayItem('not_for')} variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />追加</Button>
                            </div>
                        </div>
                    </div>

                    {/* 診断タイプ紐付け（本×タイプのマッピング） */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-gray-900">🎯 診断タイプ紐付け</h2>
                            <Button
                                onClick={addMapping}
                                variant="outline"
                                className="gap-2 text-sm"
                                disabled={mappings.length >= 3}
                            >
                                <Plus className="w-4 h-4" /> 紐付けを追加
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">この本が特に役立つ診断タイプを最大3つまで設定できます。各タイプには1〜3点で関連度を付けてください。</p>

                        {resultTypes.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
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
                                                    <label className="text-xs text-gray-500 mb-1 block">関連度スコア</label>
                                                    <div className="flex gap-2">
                                                        {SCORE_OPTIONS.map(s => (
                                                            <button
                                                                key={s.value}
                                                                type="button"
                                                                onClick={() => updateMapping(realIdx, 'relevance_score', s.value)}
                                                                className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                                                    (mapping.relevance_score || 2) === s.value
                                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                                                                }`}
                                                                title={s.desc}
                                                            >
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {SCORE_OPTIONS.find(s => s.value === (mapping.relevance_score || 2))?.desc}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">推薦文（任意）</label>
                                                <Textarea
                                                    value={mapping.recommendation_text || ''}
                                                    onChange={e => updateMapping(realIdx, 'recommendation_text', e.target.value)}
                                                    placeholder="例：集客手段を増やす前に、まず自分の強みを言語化することが重要です。この本ではその方法を体系的に学べます。"
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
                                    <p className="mt-1 text-xs">「紐付けを追加」ボタンから設定してください（最大3つ）</p>
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