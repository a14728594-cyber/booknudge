import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import Card from '@/components/common/Card';

export default function AdminQuizzes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [filterGenre, setFilterGenre] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showActive, setShowActive] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        navigate(createPageUrl('home'));
        return;
      }
      loadQuizzes();
    } catch (error) {
      navigate(createPageUrl('landing'));
    }
  };

  const loadQuizzes = async () => {
    try {
      const allQuizzes = await base44.entities.Quiz.list('-created_date', 100);
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchGenre = filterGenre === 'all' || quiz.genre === filterGenre;
    const matchText = searchText === '' || 
      quiz.title.toLowerCase().includes(searchText.toLowerCase()) ||
      quiz.prompt.toLowerCase().includes(searchText.toLowerCase());
    const matchActive = showActive ? quiz.is_active : !quiz.is_active;
    return matchGenre && matchText && matchActive;
  });

  const handleToggleActive = async (quiz) => {
    try {
      await base44.entities.Quiz.update(quiz.id, {
        is_active: !quiz.is_active
      });
      await loadQuizzes();
    } catch (error) {
      console.error('Failed to toggle quiz:', error);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('このクイズを削除しますか？')) return;
    
    setDeleting(quizId);
    try {
      await base44.entities.Quiz.delete(quizId);
      await loadQuizzes();
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    } finally {
      setDeleting(null);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">クイズ管理</h1>
          <Button 
            onClick={() => navigate(createPageUrl('AdminQuizForm'))}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </Button>
        </div>

        {/* フィルタ */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                ジャンル
              </label>
              <Select value={filterGenre} onValueChange={setFilterGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="sales">営業</SelectItem>
                  <SelectItem value="marketing">マーケティング</SelectItem>
                  <SelectItem value="relationships">人間関係</SelectItem>
                  <SelectItem value="mindset">思考法</SelectItem>
                  <SelectItem value="habits">習慣</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                キーワード検索
              </label>
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="タイトル、質問文から検索"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant={showActive ? 'default' : 'outline'}
                onClick={() => setShowActive(true)}
                className="flex-1"
              >
                配信中
              </Button>
              <Button
                variant={!showActive ? 'default' : 'outline'}
                onClick={() => setShowActive(false)}
                className="flex-1"
              >
                停止中
              </Button>
            </div>
          </div>
        </Card>

        {/* クイズ一覧 */}
        <div className="space-y-3">
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map(quiz => (
              <Card key={quiz.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {['sales', 'marketing', 'relationships', 'mindset', 'habits'].includes(quiz.genre) 
                        ? { sales: '営業', marketing: 'マーケティング', relationships: '人間関係', mindset: '思考法', habits: '習慣' }[quiz.genre]
                        : quiz.genre
                      }
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{quiz.prompt}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    {quiz.min_label} ← → {quiz.max_label}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(quiz)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
                  >
                    {quiz.is_active ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(createPageUrl('AdminQuizForm') + `?id=${quiz.id}`)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(quiz.id)}
                    disabled={deleting === quiz.id}
                  >
                    {deleting === quiz.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <p className="text-gray-600">
                {quizzes.length === 0 ? 'クイズがまだありません' : 'フィルタに該当するクイズがありません'}
              </p>
            </Card>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          全 {quizzes.length} 件中 {filteredQuizzes.length} 件を表示
        </div>
      </div>
    </div>
  );
}