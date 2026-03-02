import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Card from '@/components/common/Card';

export default function AdminQuizForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('id');

  const [loading, setLoading] = useState(!!quizId);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    min_label: '',
    max_label: '',
    genre: 'sales',
    book_id: '',
    is_active: true
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const checkAdmin = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        navigate(createPageUrl('home'));
      }
    } catch (error) {
      navigate(createPageUrl('landing'));
    }
  };

  const loadQuiz = async () => {
    try {
      const quiz = await base44.entities.Quiz.get(quizId);
      setFormData({
        title: quiz.title,
        prompt: quiz.prompt,
        min_label: quiz.min_label,
        max_label: quiz.max_label,
        genre: quiz.genre,
        book_id: quiz.book_id || '',
        is_active: quiz.is_active
      });
    } catch (error) {
      console.error('Failed to load quiz:', error);
      alert('クイズの読み込みに失敗しました');
      navigate(createPageUrl('AdminQuizzes'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.prompt || !formData.min_label || !formData.max_label) {
      alert('必須項目を入力してください');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        title: formData.title,
        prompt: formData.prompt,
        min_label: formData.min_label,
        max_label: formData.max_label,
        genre: formData.genre,
        is_active: formData.is_active
      };

      if (formData.book_id) {
        submitData.book_id = formData.book_id;
      }

      if (quizId) {
        await base44.entities.Quiz.update(quizId, submitData);
        alert('クイズを更新しました');
      } else {
        await base44.entities.Quiz.create(submitData);
        alert('クイズを作成しました');
      }

      navigate(createPageUrl('AdminQuizzes'));
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(createPageUrl('AdminQuizzes'))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {quizId ? 'クイズを編集' : '新規クイズを作成'}
          </h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル <span className="text-red-600">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例：あなたの優先はどっち？"
                required
              />
            </div>

            {/* 質問文 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                質問文 <span className="text-red-600">*</span>
              </label>
              <Textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="ユーザーに提示する質問を入力してください"
                rows={4}
                required
              />
            </div>

            {/* スライダーラベル */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  左側ラベル（0側） <span className="text-red-600">*</span>
                </label>
                <Input
                  value={formData.min_label}
                  onChange={(e) => setFormData({ ...formData, min_label: e.target.value })}
                  placeholder="例：短期"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  右側ラベル（100側） <span className="text-red-600">*</span>
                </label>
                <Input
                  value={formData.max_label}
                  onChange={(e) => setFormData({ ...formData, max_label: e.target.value })}
                  placeholder="例：長期"
                  required
                />
              </div>
            </div>

            {/* ジャンル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ジャンル <span className="text-red-600">*</span>
              </label>
              <Select value={formData.genre} onValueChange={(value) => setFormData({ ...formData, genre: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">営業</SelectItem>
                  <SelectItem value="marketing">マーケティング</SelectItem>
                  <SelectItem value="relationships">人間関係</SelectItem>
                  <SelectItem value="mindset">思考法</SelectItem>
                  <SelectItem value="habits">習慣</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 本ID（任意） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                本ID（任意）
              </label>
              <Input
                value={formData.book_id}
                onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                placeholder="本に紐づける場合、本のIDを入力"
              />
              <p className="text-xs text-gray-500 mt-1">
                将来的に本ごとにクイズを配信する場合に使用します
              </p>
            </div>

            {/* 配信状態 */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  配信を有効にする
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  オフの場合、このクイズはユーザーには表示されません
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('AdminQuizzes'))}
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}