import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import DomainBadge from '@/components/common/DomainBadge';
import { Star, Users, ArrowLeft, Loader2, Heart, ShoppingCart, ExternalLink } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function BookDetail() {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [purchaseSheetOpen, setPurchaseSheetOpen] = useState(false);

    useEffect(() => {
        loadBook();
    }, [id]);

    const loadBook = async () => {
        try {
            const user = await base44.auth.me();
            
            await base44.functions.invoke('trackEvent', {
                event_name: 'book_view',
                event_value: { book_id: id }
            });

            const bookData = await base44.entities.Book.get(id);
            setBook(bookData);

            // お気に入りチェック
            const favs = await base44.entities.Favorite.filter({
                user_id: user.id,
                book_id: id
            });
            setIsFavorite(favs.length > 0);
        } catch (error) {
            console.error('Error loading book:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFavoriteToggle = async () => {
        setFavoriteLoading(true);
        try {
            const user = await base44.auth.me();
            
            if (isFavorite) {
                const favs = await base44.entities.Favorite.filter({
                    user_id: user.id,
                    book_id: id
                });
                if (favs.length > 0) {
                    await base44.entities.Favorite.delete(favs[0].id);
                }
                setIsFavorite(false);
                
                await base44.functions.invoke('trackEvent', {
                    event_name: 'favorite_remove',
                    event_value: { book_id: id },
                    update_last_active: true
                });
            } else {
                await base44.entities.Favorite.create({
                    user_id: user.id,
                    book_id: id
                });
                setIsFavorite(true);
                
                await base44.functions.invoke('trackEvent', {
                    event_name: 'favorite_add',
                    event_value: { book_id: id },
                    update_last_active: true
                });
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setFavoriteLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">本が見つかりませんでした</p>
                    <Link to={createPageUrl('home')}>
                        <Button variant="outline" className="rounded-xl">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            ホームへ戻る
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <Link to={createPageUrl('home')}>
                    <Button variant="outline" className="rounded-xl mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        戻る
                    </Button>
                </Link>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
                    <div className="flex items-start justify-between mb-4">
                        <h1 className="text-4xl font-bold text-gray-900 flex-1">
                            {book.title}
                        </h1>
                        <Button
                            onClick={handleFavoriteToggle}
                            disabled={favoriteLoading}
                            variant={isFavorite ? 'default' : 'outline'}
                            size="lg"
                            className={`rounded-xl ${isFavorite ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                        >
                            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`} />
                        </Button>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-6">
                        {book.authors?.join(', ') || '著者不明'}
                    </p>

                    {book.tags && book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {book.tags.map((tag, idx) => (
                                <DomainBadge key={idx} domain={tag} />
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                        {book.google_rating && (
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                <span className="text-lg font-semibold">{book.google_rating.toFixed(1)}</span>
                            </div>
                        )}
                        {book.google_ratings_count && (
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-600">
                                    {book.google_ratings_count.toLocaleString()}件の評価
                                </span>
                            </div>
                        )}
                    </div>

                    {book.description && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                この本について
                            </h2>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {book.description}
                            </p>
                        </div>
                    )}

                    {book.isbn && (
                        <div className="text-sm text-gray-500">
                            ISBN: {book.isbn}
                        </div>
                    )}

                    {/* 購入ボタン */}
                    {book.amazon_url && (
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <Sheet open={purchaseSheetOpen} onOpenChange={setPurchaseSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button 
                                        size="lg" 
                                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                                    >
                                        <ShoppingCart className="w-5 h-5 mr-2" />
                                        本を購入する
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="rounded-t-3xl">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="text-2xl">購入先を選択</SheetTitle>
                                        <SheetDescription>
                                            {book.title}
                                        </SheetDescription>
                                    </SheetHeader>
                                    <div className="grid gap-3 pb-6">
                                        {book.amazon_url && (
                                            <a
                                                href={book.amazon_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                                onClick={() => setPurchaseSheetOpen(false)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                                        <ShoppingCart className="w-5 h-5 text-orange-600" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">Amazon</span>
                                                </div>
                                                <ExternalLink className="w-5 h-5 text-gray-400" />
                                            </a>
                                        )}
                                        {book.rakuten_url && (
                                            <a
                                                href={book.rakuten_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                                onClick={() => setPurchaseSheetOpen(false)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                        <ShoppingCart className="w-5 h-5 text-red-600" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">楽天ブックス</span>
                                                </div>
                                                <ExternalLink className="w-5 h-5 text-gray-400" />
                                            </a>
                                        )}
                                        {book.ehon_url && (
                                            <a
                                                href={book.ehon_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                                onClick={() => setPurchaseSheetOpen(false)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">e-hon</span>
                                                </div>
                                                <ExternalLink className="w-5 h-5 text-gray-400" />
                                            </a>
                                        )}
                                        {book.honyaclub_url && (
                                            <a
                                                href={book.honyaclub_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                                onClick={() => setPurchaseSheetOpen(false)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <ShoppingCart className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">honyaclub</span>
                                                </div>
                                                <ExternalLink className="w-5 h-5 text-gray-400" />
                                            </a>
                                        )}
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}