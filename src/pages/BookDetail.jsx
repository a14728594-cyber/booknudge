import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2, ExternalLink } from 'lucide-react';

export default function BookDetail() {
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    useEffect(() => {
        loadBook();
    }, [id]);

    const loadBook = async () => {
        try {
            const books = await base44.entities.Book.filter({ id });
            if (books.length > 0) {
                setBook(books[0]);
            }
        } catch (error) {
            console.error('Failed to load book:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12 text-center">
                <p className="text-gray-600 mb-6">本が見つかりません</p>
                <Link to={createPageUrl('home')}>
                    <Button>ライブラリへ戻る</Button>
                </Link>
            </div>
        );
    }

    const mangaPages = book.manga_pages || [];
    const genreLabel = book.book_category === 'business' ? 'ビジネス' :
                       book.book_category === 'novel_essay' ? '小説・エッセイ' : '';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Link to={createPageUrl('home')}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            戻る
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold text-gray-900 truncate">{book.title}</h1>
                        <p className="text-xs text-gray-500 truncate">
                            {book.authors?.join(', ') || '著者不明'}
                            {genreLabel && ` ・ ${genreLabel}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Manga viewer (vertical scroll) */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {mangaPages.length > 0 ? (
                    <div className="space-y-2">
                        {mangaPages.map((url, idx) => (
                            <div key={idx} className="relative aspect-[9/16] bg-white rounded-xl overflow-hidden shadow-sm">
                                <img
                                    src={url}
                                    alt={`page ${idx + 1}`}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium mb-1">要約マンガがまだありません</p>
                        <p className="text-gray-400 text-sm">制作をお待ちください</p>
                    </div>
                )}

                {/* Purchase link */}
                {book.amazon_url && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <a
                            href={book.amazon_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            本を購入する
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}