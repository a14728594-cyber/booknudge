import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Card from '@/components/common/Card';
import { Save, ArrowLeft, Plus, X, Loader2, Sparkles } from 'lucide-react';
import { getAllTypeKeys, BOOK_ROLES } from '@/components/common/diagnosisTypes';

export default function AdminBookEdit() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);

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
        diagnosis_types: [],
        book_role: '',
        recommendation_text: ''
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

            if (bookId && bookId !== 'new') {
                const book = await base44.entities.Book.get(bookId);
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
                    diagnosis_types: book.diagnosis_types || [],
                    book_role: book.book_role || '',
                    recommendation_text: book.recommendation_text || ''
                });
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

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setFormData({ ...formData, cover_url: file_url });
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('画像のアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!formData.title) {
            alert('タイトルを入力してください');
            return;
        }

        setGenerating(true);
        try {
            const prompt = `以下の本について、マーケティング向けのコピーを生成してください。

タイトル: ${formData.title}
著者: ${formData.authors.filter(a => a).join(', ')}
タグ: ${formData.tags.filter(t => t).join(', ')}
説明: ${formData.description || 'なし'}

以下の形式でJSONを返してください：
{
  "pain_points": ["悩み1", "悩み2", "悩み3", "悩み4", "悩み5"],
  "outcomes": ["成果1", "成果2", "成果3", "成果4", "成果5"],
  "not_for": ["注意点1", "注意点2"],
  "one_liner": "1行で刺さる説明"
}

- pain_points: この本を読むべき人の具体的な悩みや課題（3〜7個）
- outcomes: 読後に得られる具体的な成果や変化（3〜7個）
- not_for: 合わない人や注意点（0〜3個）
- one_liner: 30文字程度で心に刺さる説明`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
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

            setFormData({
                ...formData,
                pain_points: response.pain_points || [''],
                outcomes: response.outcomes || [''],
                not_for: response.not_for?.length > 0 ? response.not_for : [''],
                one_liner: response.one_liner || ''
            });
        } catch (error) {
            console.error('Error generating AI content:', error);
            alert('AI生成に失敗しました');
        } finally {
            setGenerating(false);
        }
    };

    const normalizeSearchText = (title, authors) => {
        const text = title + ' ' + (authors || []).join(' ');
        let normalized = text.normalize('NFKC');
        normalized = normalized.toLowerCase();
        normalized = normalized.replace(/[・:！？（）『』「」【】\-\.\,\!\?\(\)\[\]\{\}]/g, '');
        normalized = normalized.replace(/\s+/g, '');
        return normalized;
    };

    const handleSave = async () => {
        if (!formData.title || !formData.amazon_url) {
            alert('タイトルとAmazon URLは必須です');
            return;
        }

        const cleanedPainPoints = formData.pain_points.filter(p => p.trim());
        const cleanedOutcomes = formData.outcomes.filter(o => o.trim());

        if (cleanedPainPoints.length === 0 || cleanedOutcomes.length === 0) {
            alert('「こんな悩み」と「読後の変化」は必須です');
            return;
        }

        setSaving(true);
        try {
            const cleanedAuthors = formData.authors.filter(a => a.trim());
            const searchText = normalizeSearchText(formData.title, cleanedAuthors);

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
                diagnosis_types: formData.diagnosis_types || [],
                book_role: formData.book_role || undefined,
                recommendation_text: formData.recommendation_text || undefined,
                search_text: searchText
            };

            if (bookId && bookId !== 'new') {
                await base44.entities.Book.update(bookId, data);
            } else {
                await base44.entities.Book.create(data);
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => navigate(createPageUrl('AdminBooks'))}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            戻る
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {bookId === 'new' ? '本を新規登録' : '本を編集'}
                        </h1>
                    </div>
                </div>

                <Card className="space-y-6">
                    {/* 基本情報 */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">基本情報</h2>
                        <div className="space-y-4">
                            <div>
                                <Label>タイトル *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="本のタイトル"
                                />
                            </div>

                            <div>
                                <Label>著者</Label>
                                {formData.authors.map((author, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input
                                            value={author}
                                            onChange={(e) => handleArrayChange('authors', idx, e.target.value)}
                                            placeholder="著者名"
                                        />
                                        {formData.authors.length > 1 && (
                                            <Button
                                                onClick={() => removeArrayItem('authors', idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    onClick={() => addArrayItem('authors')}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    著者を追加
                                </Button>
                            </div>

                            <div>
                                <Label>タグ</Label>
                                {formData.tags.map((tag, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input
                                            value={tag}
                                            onChange={(e) => handleArrayChange('tags', idx, e.target.value)}
                                            placeholder="タグ"
                                        />
                                        {formData.tags.length > 1 && (
                                            <Button
                                                onClick={() => removeArrayItem('tags', idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    onClick={() => addArrayItem('tags')}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    タグを追加
                                </Button>
                            </div>

                            <div>
                                <Label>説明</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="本の説明"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <Label>ISBN</Label>
                                <Input
                                    value={formData.isbn}
                                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                                    placeholder="ISBN"
                                />
                            </div>

                            <div>
                                <Label>表紙画像</Label>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            className="flex-1"
                                        />
                                        {uploading && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                                    </div>
                                    {formData.cover_url && (
                                        <div className="relative w-32 h-48">
                                            <img
                                                src={formData.cover_url}
                                                alt="表紙プレビュー"
                                                className="w-full h-full object-cover rounded-lg border border-gray-200"
                                            />
                                        </div>
                                    )}
                                    <Input
                                        value={formData.cover_url}
                                        onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                                        placeholder="または画像URLを直接入力"
                                        className="text-sm"
                                    />
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
                                <Input
                                    value={formData.amazon_url}
                                    onChange={(e) => setFormData({ ...formData, amazon_url: e.target.value })}
                                    placeholder="https://amazon.co.jp/..."
                                />
                            </div>
                            <div>
                                <Label>楽天ブックス URL</Label>
                                <Input
                                    value={formData.rakuten_url}
                                    onChange={(e) => setFormData({ ...formData, rakuten_url: e.target.value })}
                                    placeholder="https://books.rakuten.co.jp/..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* マーケティング情報 */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">マーケティング情報</h2>
                            <Button
                                onClick={handleGenerateAI}
                                disabled={generating || !formData.title}
                                variant="outline"
                                className="gap-2"
                            >
                                {generating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                AIで生成
                            </Button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <Label>1行で刺さる説明</Label>
                                <Input
                                    value={formData.one_liner}
                                    onChange={(e) => setFormData({ ...formData, one_liner: e.target.value })}
                                    placeholder="30文字程度で心に刺さる説明"
                                />
                            </div>

                            <div>
                                <Label>こんな悩みの人におすすめ *</Label>
                                {formData.pain_points.map((point, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input
                                            value={point}
                                            onChange={(e) => handleArrayChange('pain_points', idx, e.target.value)}
                                            placeholder="悩みや課題"
                                        />
                                        {formData.pain_points.length > 1 && (
                                            <Button
                                                onClick={() => removeArrayItem('pain_points', idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    onClick={() => addArrayItem('pain_points')}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    追加
                                </Button>
                            </div>

                            <div>
                                <Label>読んだ後こうなれる *</Label>
                                {formData.outcomes.map((outcome, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input
                                            value={outcome}
                                            onChange={(e) => handleArrayChange('outcomes', idx, e.target.value)}
                                            placeholder="得られる成果や変化"
                                        />
                                        {formData.outcomes.length > 1 && (
                                            <Button
                                                onClick={() => removeArrayItem('outcomes', idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    onClick={() => addArrayItem('outcomes')}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    追加
                                </Button>
                            </div>

                            <div>
                                <Label>合わないかも（任意）</Label>
                                {formData.not_for.map((note, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input
                                            value={note}
                                            onChange={(e) => handleArrayChange('not_for', idx, e.target.value)}
                                            placeholder="合わない人や注意点"
                                        />
                                        {formData.not_for.length > 1 && (
                                            <Button
                                                onClick={() => removeArrayItem('not_for', idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    onClick={() => addArrayItem('not_for')}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    追加
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button
                            onClick={() => navigate(createPageUrl('AdminBooks'))}
                            variant="outline"
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            保存
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}