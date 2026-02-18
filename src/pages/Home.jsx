import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BookCard from '@/components/common/BookCard';
import DomainBadge from '@/components/common/DomainBadge';
import { Search, ArrowRight, TrendingUp } from 'lucide-react';

const domains = ['sales', 'marketing', 'relationships', 'mindset', 'habits'];

export default function Home() {
    const [searchQuery, setSearchQuery] = useState('');
    const [mainDomain, setMainDomain] = useState('sales');
    const [topBooks, setTopBooks] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

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

            if (recentAnswers.length > 0) {
                const domainCounts = {};
                recentAnswers.forEach(a => {
                    domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
                });
                const mainDom = Object.keys(domainCounts).reduce((a, b) => 
                    domainCounts[a] > domainCounts[b] ? a : b
                );
                setMainDomain(mainDom);
            } else if (user.profile_json?.focus_domains?.length > 0) {
                setMainDomain(user.profile_json.focus_domains[0]);
            }

            // 各ジャンルの人気本を取得
            const booksByDomain = {};
            for (const domain of domains) {
                const domainBooks = await base44.entities.Book.filter(
                    { tags: domain },
                    '-google_ratings_count',
                    6
                );
                booksByDomain[domain] = domainBooks;
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

                {/* Main Domain Top 3 */}
                {!loading && topBooks[mainDomain]?.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-indigo-600" />
                                <h2 className="text-2xl font-bold text-gray-900">
                                    あなたの主ジャンル
                                </h2>
                                <DomainBadge domain={mainDomain} />
                            </div>
                            <Link to={createPageUrl(`genre/${mainDomain}`)}>
                                <Button variant="outline" className="rounded-xl">
                                    もっと見る
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {topBooks[mainDomain].slice(0, 3).map(book => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    </div>
                )}

                {/* All Domains */}
                {domains.map(domain => (
                    topBooks[domain]?.length > 0 && (
                        <div key={domain} className="mb-16">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        ジャンル別人気本
                                    </h2>
                                    <DomainBadge domain={domain} />
                                </div>
                                <Link to={createPageUrl(`genre/${domain}`)}>
                                    <Button variant="outline" className="rounded-xl">
                                        もっと見る
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {topBooks[domain].slice(0, 6).map(book => (
                                    <BookCard key={book.id} book={book} />
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}