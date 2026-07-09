import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Loader2 } from 'lucide-react';

export default function Home() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('all');

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            const allBooks = await base44.entities.Book.list('-created_date', 500);
            setBooks(allBooks);
        } catch (error) {
            console.error('Failed to load books:', error);
        } finally {
            setLoading(false);
        }
    };

    const genres = useMemo(() => {
        const set = new Set(books.map(b => b.book_category).filter(Boolean));
        return ['all', ...Array.from(set)];
    }, [books]);

    const filteredBooks = useMemo(() => {
        return books.filter(book => {
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch = !q ||
                (book.title || '').toLowerCase().includes(q) ||
                (book.authors || []).some(a => a.toLowerCase().includes(q));
            const matchesGenre = selectedGenre === 'all' || book.book_category === selectedGenre;
            return matchesSearch && matchesGenre;
        });
    }, [books, searchQuery, selectedGenre]);

    const genreLabel = (g) => {
        if (g === 'all') return 'すべて';
        if (g === 'business') return 'ビジネス';
        if (g === 'novel_essay') return '小説・エッセイ';
        return g;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        要約マンガライブラリ
                    </h1>
                    <p className="text-gray-500 text-sm">本をタップして要約マンガを読む</p>
                </div>

                {/* Search + Genre filter */}
                <div className="mb-8 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="タイトル・著者で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-14 text-base rounded-2xl border-gray-200 bg-white shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {genres.map(g => (
                            <button
                                key={g}
                                onClick={() => setSelectedGenre(g)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    selectedGenre === g
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {genreLabel(g)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Book grid */}
                {filteredBooks.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredBooks.map(book => (
                            <Link
                                key={book.id}
                                to={createPageUrl('BookDetail') + `?id=${book.id}`}
                                className="group"
                            >
                                <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                                    {book.cover_url ? (
                                        <img
                                            src={book.cover_url}
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BookOpen className="w-8 h-8 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                    {book.title}
                                </h3>
                                <p className="text-xs text-gray-500 line-clamp-1">
                                    {book.authors?.join(', ') || ''}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <div className="text-4xl mb-4">📚</div>
                        <p className="text-gray-600 font-medium mb-1">
                            {searchQuery || selectedGenre !== 'all' ? '該当する本が見つかりません' : 'まだ本が登録されていません'}
                        </p>
                        <p className="text-gray-400 text-sm">
                            {searchQuery || selectedGenre !== 'all' ? '検索条件を変えてみてください' : '管理者が本を追加するまでお待ちください'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}