import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import BookCard from '@/components/common/BookCard';
import { Loader2, ArrowRight } from 'lucide-react';

export default function Recommend() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState([]);
    const [books, setBooks] = useState({});

    useEffect(() => {
        loadRecommendations();
    }, []);

    const loadRecommendations = async () => {
        try {
            // イベント記録
            await base44.functions.invoke('trackEvent', {
                event_name: 'recommend_view',
                event_value: {},
                update_last_active: true
            });

            // AIレコメンド取得
            const { data } = await base44.functions.invoke('generateRecommendations', {});
            
            if (data.recommendations && data.recommendations.length > 0) {
                setRecommendations(data.recommendations);
                
                // 本の詳細を取得
                const bookIds = data.recommendations.map(r => r.book_id);
                const bookData = {};
                
                for (const bookId of bookIds) {
                    try {
                        const book = await base44.entities.Book.get(bookId);
                        bookData[bookId] = book;
                    } catch (error) {
                        console.error('Error loading book:', bookId, error);
                    }
                }
                
                setBooks(bookData);
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">あなた専用の本を選んでいます...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        あなたへのおすすめ
                    </h1>
                    <p className="text-lg text-gray-600">
                        診断結果から、あなたに最適な10冊を選びました
                    </p>
                </div>

                {recommendations.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {recommendations.map((rec, index) => {
                            const book = books[rec.book_id];
                            if (!book) return null;
                            
                            return (
                                <BookCard 
                                    key={rec.book_id}
                                    book={book}
                                    reason={rec.reason}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-600">
                            おすすめの本が見つかりませんでした
                        </p>
                    </div>
                )}

                <div className="text-center">
                    <Button
                        size="lg"
                        onClick={() => navigate(createPageUrl('home'))}
                        className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8"
                    >
                        ホームへ
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}