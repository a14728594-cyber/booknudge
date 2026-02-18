import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import BookCard from '@/components/common/BookCard';
import { Search as SearchIcon, Loader2 } from 'lucide-react';

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
            setQuery(q);
            performSearch(q);
        }
    }, []);

    const performSearch = async (searchQuery) => {
        setLoading(true);
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'search',
                event_value: { query: searchQuery }
            });

            // 簡易検索（タイトル・著者・タグ）
            const allBooks = await base44.entities.Book.list('', 200);
            const filtered = allBooks.filter(book => {
                const lowerQuery = searchQuery.toLowerCase();
                return (
                    book.title?.toLowerCase().includes(lowerQuery) ||
                    book.authors?.some(a => a.toLowerCase().includes(lowerQuery)) ||
                    book.tags?.some(t => t.toLowerCase().includes(lowerQuery))
                );
            });
            setResults(filtered);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            performSearch(query);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                type="text"
                                placeholder="本のタイトル、著者、キーワードで検索..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-12 pr-4 py-6 text-lg rounded-2xl border-gray-200 focus:border-indigo-300"
                            />
                        </div>
                    </form>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <p className="text-gray-600 mb-6">
                            {results.length}件の結果
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {results.map(book => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    </>
                ) : query ? (
                    <div className="text-center py-12 text-gray-600">
                        「{query}」の検索結果が見つかりませんでした
                    </div>
                ) : null}
            </div>
        </div>
    );
}