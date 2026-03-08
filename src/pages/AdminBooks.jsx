import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Card from '@/components/common/Card';
import { BookOpen, Plus, Search, Loader2, Edit, Trash2 } from 'lucide-react';

export default function AdminBooks() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [duplicates, setDuplicates] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState('すべて');

    const GENRES = ['すべて', 'マーケティング', '営業', 'アイデア', '人間関係', '習慣', 'マインドセット'];

    useEffect(() => {
        checkAdminAndLoad();
    }, []);

    const checkAdminAndLoad = async () => {
        try {
            const user = await base44.auth.me();
            if (user.role !== 'admin') {
                navigate(createPageUrl('home'));
                return;
            }
            await loadBooks();
        } catch (error) {
            console.error('Error:', error);
            navigate(createPageUrl('landing'));
        }
    };

    const loadBooks = async () => {
        setLoading(true);
        try {
            const allBooks = await base44.entities.Book.list('-created_date');
            setBooks(allBooks);
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (bookId) => {
        if (!confirm('この本を削除しますか？')) return;
        try {
            await base44.entities.Book.delete(bookId);
            await loadBooks();
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('削除に失敗しました');
        }
    };

    const checkDuplicates = () => {
        const duplicateIds = [];
        const seen = new Map();

        books.forEach(book => {
            const key = `${book.title}|||${(book.authors || []).join(',')}`;
            if (seen.has(key)) {
                duplicateIds.push(book.id);
                duplicateIds.push(seen.get(key));
            } else {
                seen.set(key, book.id);
            }
        });

        setDuplicates([...new Set(duplicateIds)]);
        if (duplicateIds.length === 0) {
            alert('重複はありません');
        }
    };

    const filteredBooks = books.filter(book => {
        const query = searchQuery.toLowerCase();
        return (
            book.title?.toLowerCase().includes(query) ||
            book.authors?.some(author => author.toLowerCase().includes(query)) ||
            book.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">本管理</h1>
                            <p className="text-sm text-gray-600 mt-1">全{books.length}冊</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={checkDuplicates}
                            variant="outline"
                            className="gap-2"
                        >
                            重複チェック
                        </Button>
                        <Button
                            onClick={() => navigate(createPageUrl('AdminBookEdit') + '?bookId=new')}
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            新規登録
                        </Button>
                    </div>
                </div>

                <Card className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="タイトル、著者、タグで検索..."
                            className="pl-10"
                        />
                    </div>
                </Card>

                <div className="space-y-4">
                    {filteredBooks.map(book => (
                        <Card 
                            key={book.id} 
                            className={`hover:shadow-lg transition-shadow ${duplicates.includes(book.id) ? 'border-2 border-red-500 bg-red-50' : ''}`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        {book.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {book.authors?.join(', ') || '著者不明'}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {book.tags?.slice(0, 5).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-4 text-xs text-gray-500">
                                        <span>
                                            悩み: {book.pain_points?.length || 0}個
                                        </span>
                                        <span>
                                            成果: {book.outcomes?.length || 0}個
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => navigate(createPageUrl('AdminBookEdit') + `?bookId=${book.id}`)}
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        編集
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(book.id)}
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        削除
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {filteredBooks.length === 0 && (
                        <Card className="text-center py-12">
                            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                                {searchQuery ? '検索結果が見つかりません' : '本が登録されていません'}
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}