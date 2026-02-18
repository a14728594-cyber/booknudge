import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BookCard from '@/components/common/BookCard';
import DomainBadge from '@/components/common/DomainBadge';
import { Loader2 } from 'lucide-react';

export default function Genre() {
    const { domain } = useParams();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBooks();
    }, [domain]);

    const loadBooks = async () => {
        setLoading(true);
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'genre_view',
                event_value: { domain }
            });

            const genreBooks = await base44.entities.Book.filter(
                { tags: domain },
                '-google_ratings_count',
                50
            );
            setBooks(genreBooks);
        } catch (error) {
            console.error('Error loading genre books:', error);
        } finally {
            setLoading(false);
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
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <h1 className="text-4xl font-bold text-gray-900">ジャンル別</h1>
                    <DomainBadge domain={domain} />
                </div>

                {books.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {books.map(book => (
                            <BookCard key={book.id} book={book} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-600">
                        このジャンルの本が見つかりませんでした
                    </div>
                )}
            </div>
        </div>
    );
}