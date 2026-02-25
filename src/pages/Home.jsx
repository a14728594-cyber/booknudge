import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BookCard from '@/components/common/BookCard';
import DomainBadge from '@/components/common/DomainBadge';
import { Search, ArrowRight, TrendingUp, ChevronRight } from 'lucide-react';

const domainConfig = {
    'コミュニケーション': {
        label: 'コミュニケーション',
        tags: ['コミュニケーション', '伝える力', 'プレゼン', '言語化', '交渉', '対人スキル']
    },
    '人間関係': {
        label: '人間関係',
        tags: ['人間関係', '自己肯定感', '自己防衛', '感情コントロール', 'ストレス', '立ち回り']
    },
    'マインドセット': {
        label: 'マインドセット',
        tags: ['マインドセット', 'メンタルケア', 'メンタル', '行動力', '思考法']
    },
    '起業': {
        label: '起業・ビジネス',
        tags: ['起業', 'ビジネス', '副業', '職場術', '仕事術']
    },
    '習慣': {
        label: '習慣・生活',
        tags: ['習慣', '生活', 'ライフスタイル', '時間管理']
    }
};

export default function Home() {
    const [searchQuery, setSearchQuery] = useState('');
    const [mainDomain, setMainDomain] = useState('sales');
    const [topBooks, setTopBooks] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        checkCheckoutSuccess();
    }, []);

    const checkCheckoutSuccess = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const checkoutSuccess = urlParams.get('checkout');
        const nextUrl = urlParams.get('next');

        if (checkoutSuccess === 'success') {
            await base44.functions.invoke('trackEvent', {
                event_name: 'checkout_success',
                event_value: { from: 'paywall' }
            });

            // nextUrlがあれば遷移
            if (nextUrl) {
                window.history.replaceState({}, '', window.location.pathname);
                navigate(nextUrl);
            }
        }
    };

    const loadData = async () => {
        try {
            const user = await base44.auth.me();
            
            // イベント記録
            await base44.functions.invoke('trackEvent', {
                event_name: 'home_view',
                event_value: {},
                update_last_active: true
            });

            // 主ジャンル判定
            const recentAnswers = await base44.entities.Answer.filter(
                { user_id: user.id },
                '-created_date',
                30
            );

            // 主ジャンルは最初のカテゴリーに設定
            const firstDomain = Object.keys(domainConfig)[0];
            setMainDomain(firstDomain);

            // 各ジャンルの人気本を取得（タグベースで分類）
            const booksByDomain = {};
            const allBooks = await base44.entities.Book.list('-created_date', 200);
            
            for (const [domain, config] of Object.entries(domainConfig)) {
                const domainBooks = allBooks.filter(book => 
                    book.tags && book.tags.some(bookTag => 
                        config.tags.some(domainTag => 
                            bookTag.toLowerCase().includes(domainTag.toLowerCase()) ||
                            domainTag.toLowerCase().includes(bookTag.toLowerCase())
                        )
                    )
                ).slice(0, 15);
                if (domainBooks.length > 0) {
                    booksByDomain[domain] = domainBooks;
                }
            }
            setTopBooks(booksByDomain);
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = createPageUrl('search') + `?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    const handleBookClick = async (bookId, domain) => {
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'book_card_click',
                event_value: { book_id: bookId, domain }
            });
        } catch (error) {
            console.error('Error tracking book click:', error);
        }
    };

    const handleCarouselScroll = async (domain) => {
        try {
            await base44.functions.invoke('trackEvent', {
                event_name: 'carousel_scroll',
                event_value: { domain }
            });
        } catch (error) {
            console.error('Error tracking carousel scroll:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search */}
                <div className="mb-12">
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                type="text"
                                placeholder="本のタイトル、著者、キーワードで検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-4 py-6 text-lg rounded-2xl border-gray-200 focus:border-indigo-300"
                            />
                        </div>
                    </form>
                </div>

                {/* Main Domain Carousel */}
                {topBooks[mainDomain]?.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-indigo-600" />
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {domainLabels[mainDomain] || mainDomain}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <ChevronRight className="w-4 h-4" />
                                <span>スライドで見る</span>
                            </div>
                        </div>
                        <div 
                            className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing"
                            style={{ 
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}
                            onScroll={() => handleCarouselScroll(mainDomain)}
                            onMouseDown={(e) => {
                                const slider = e.currentTarget;
                                slider.style.cursor = 'grabbing';
                                let startX = e.pageX - slider.offsetLeft;
                                let scrollLeft = slider.scrollLeft;
                                
                                const handleMouseMove = (e) => {
                                    const x = e.pageX - slider.offsetLeft;
                                    const walk = (x - startX) * 2;
                                    slider.scrollLeft = scrollLeft - walk;
                                };
                                
                                const handleMouseUp = () => {
                                    slider.style.cursor = 'grab';
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                        >
                            {topBooks[mainDomain].map(book => (
                                <div 
                                    key={book.id} 
                                    className="flex-shrink-0 w-72 snap-start"
                                    onClick={() => handleBookClick(book.id, mainDomain)}
                                >
                                    <BookCard book={book} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Domains Carousels */}
                {Object.keys(topBooks).map(domain => (
                    domain !== mainDomain && topBooks[domain]?.length > 0 && (
                        <div key={domain} className="mb-16">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {domainLabels[domain] || domain}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <ChevronRight className="w-4 h-4" />
                                    <span>スライドで見る</span>
                                </div>
                            </div>
                            <div 
                                className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing"
                                style={{ 
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}
                                onScroll={() => handleCarouselScroll(domain)}
                                onMouseDown={(e) => {
                                    const slider = e.currentTarget;
                                    slider.style.cursor = 'grabbing';
                                    let startX = e.pageX - slider.offsetLeft;
                                    let scrollLeft = slider.scrollLeft;
                                    
                                    const handleMouseMove = (e) => {
                                        const x = e.pageX - slider.offsetLeft;
                                        const walk = (x - startX) * 2;
                                        slider.scrollLeft = scrollLeft - walk;
                                    };
                                    
                                    const handleMouseUp = () => {
                                        slider.style.cursor = 'grab';
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                }}
                            >
                                {topBooks[domain].map(book => (
                                    <div 
                                        key={book.id} 
                                        className="flex-shrink-0 w-72 snap-start"
                                        onClick={() => handleBookClick(book.id, domain)}
                                    >
                                        <BookCard book={book} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}