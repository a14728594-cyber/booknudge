import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import Card from '@/components/common/Card';
import DomainBadge from '@/components/common/DomainBadge';
import { ArrowLeft, Heart, Star, ExternalLink, Loader2 } from 'lucide-react';

export default function BookDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = await base44.auth.me();
            setUser(userData);

            // 本の取得
            const books = await base44.entities.Book.filter({ id });
            if (books.length === 0) {
                setBook(null);
                setLoading(false);
                return;
            }
            setBook(books[0]);

            // お気に入り状態の確認
            if (userData) {
                const favorites = await base44.entities.Favorite.filter({
                    user_id: userData.id,
                    book_id: id
                });
                setIsFavorite(favorites.length > 0);
            }

            // book_viewイベント記録
            await base44.functions.invoke('trackEvent', {
                event_name: 'book_view',
                event_value: { book_id: id }
            });
        } catch (error) {
            console.error('Failed to load book:', error);
            setBook(null);
        }
        setLoading(false);
    };

    const toggleFavorite = async () => {
        if (!user) {
            base44.auth.redirectToLogin();
            return;
        }

        try {
            if (isFavorite) {
                // お気に入り解除
                const favorites = await base44.entities.Favorite.filter({
                    user_id: user.id,
                    book_id: id
                });
                if (favorites.length > 0) {
                    await base44.entities.Favorite.delete(favorites[0].id);
                }
                setIsFavorite(false);

                // イベント記録
                await base44.functions.invoke('trackEvent', {
                    event_name: 'book_like_toggle',
                    event_value: { book_id: id, action: 'off' }
                });
            } else {
                // お気に入り追加
                await base44.entities.Favorite.create({
                    user_id: user.id,
                    book_id: id
                });
                setIsFavorite(true);

                // イベント記録
                await base44.functions.invoke('trackEvent', {
                    event_name: 'book_like_toggle',
                    event_value: { book_id: id, action: 'on' }
                });
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    const handlePurchaseClick = async (store) => {
        // イベント記録
        await base44.functions.invoke('trackEvent', {
            event_name: 'purchase_click',
            event_value: { book_id: id, store }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <Card className="text-center py-12">
                    <p className="text-gray-600 text-lg mb-6">本が見つかりません</p>
                    <Button onClick={() => navigate(createPageUrl('home'))}>
                        ホームへ戻る
                    </Button>
                </Card>
            </div>
        );
    }

    // ドメインの抽出（tagsから）
    const domains = ['sales', 'marketing', 'relationships', 'mindset', 'habits'];
    const bookDomains = book.tags?.filter(tag => domains.includes(tag)) || [];

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            {/* 戻るボタン */}
            <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
            </Button>

            <Card className="space-y-6">
                {/* カバー画像 */}
                {book.cover_url && (
                    <div className="flex justify-center">
                        <img
                            src={book.cover_url}
                            alt={book.title}
                            className="max-w-xs rounded-lg shadow-md"
                        />
                    </div>
                )}

                {/* タイトルと著者 */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
                    {book.authors && book.authors.length > 0 && (
                        <p className="text-lg text-gray-600">
                            {book.authors.join(', ')}
                        </p>
                    )}
                </div>

                {/* ドメインとタグ */}
                <div className="flex flex-wrap gap-2">
                    {bookDomains.map(domain => (
                        <DomainBadge key={domain} domain={domain} />
                    ))}
                    {book.tags?.filter(tag => !domains.includes(tag)).map(tag => (
                        <span
                            key={tag}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* 評価 */}
                {book.google_rating && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-gray-900">
                                {book.google_rating.toFixed(1)}
                            </span>
                        </div>
                        {book.google_ratings_count && (
                            <span className="text-gray-500 text-sm">
                                ({book.google_ratings_count.toLocaleString()}件)
                            </span>
                        )}
                    </div>
                )}

                {/* 説明 */}
                {book.description && (
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-900">概要</h2>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {book.description}
                        </p>
                    </div>
                )}

                {/* ワンライナー */}
                {book.one_liner && (
                    <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded">
                        <p className="text-indigo-900 font-medium italic">
                            {book.one_liner}
                        </p>
                    </div>
                )}

                {/* こんな悩みの人におすすめ */}
                {book.pain_points && book.pain_points.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-900">
                            こんな悩みの人におすすめ
                        </h2>
                        <ul className="space-y-2">
                            {book.pain_points.map((point, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 text-gray-700"
                                >
                                    <span className="text-indigo-600 mt-1">✓</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 読んだ後こうなれる */}
                {book.outcomes && book.outcomes.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-900">
                            読んだ後こうなれる
                        </h2>
                        <ul className="space-y-2">
                            {book.outcomes.map((outcome, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 text-gray-700"
                                >
                                    <span className="text-green-600 mt-1">★</span>
                                    <span>{outcome}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 合わない人/注意点 */}
                {book.not_for && book.not_for.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-900">
                            合わない人・注意点
                        </h2>
                        <ul className="space-y-2">
                            {book.not_for.map((point, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 text-gray-600"
                                >
                                    <span className="text-gray-400 mt-1">•</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* アクションボタン */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                    {/* いいねボタン */}
                    <Button
                        variant={isFavorite ? "default" : "outline"}
                        onClick={toggleFavorite}
                        className="flex-1 min-w-[200px]"
                    >
                        <Heart
                            className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-current' : ''}`}
                        />
                        {isFavorite ? 'お気に入り済み' : 'お気に入りに追加'}
                    </Button>

                    {/* 購入ボタン */}
                    {book.amazon_url && (
                        <Button
                            variant="default"
                            className="flex-1 min-w-[200px] bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handlePurchaseClick('amazon')}
                            asChild
                        >
                            <a
                                href={book.amazon_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                本を購入
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}