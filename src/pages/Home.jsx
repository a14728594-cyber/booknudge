import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BookCard from '@/components/common/BookCard';
import DomainBadge from '@/components/common/DomainBadge';
import { Search, ArrowRight, TrendingUp, ChevronRight, Building2 } from 'lucide-react';
import PullToRefresh from '@/components/common/PullToRefresh';

const domainConfig = {
    'マーケティング': {
        label: 'マーケティング',
        tags: ['マーケティング', 'marketing', 'セールス', '集客', '広告', 'ブランディング']
    },
    '人間関係': {
        label: '人間関係・コミュニケーション',
        tags: ['人間関係', 'コミュニケーション', '伝える力', 'プレゼン', '言語化', '交渉', '対人スキル', '自己肯定感', '自己防衛', '感情コントロール', 'ストレス', '立ち回り']
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
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [mainDomain, setMainDomain] = useState('sales');
    const [topBooks, setTopBooks] = useState({});
    const [recommendedBooks, setRecommendedBooks] = useState([]);
    const [caseStudies, setCaseStudies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        checkCheckoutSuccess();
        base44.entities.CaseStudy.filter({ is_published: true }, 'order', 6).then(setCaseStudies).catch(() => {});
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
            // 本一覧は認証不要で取得（最重要）
            const allBooks = await base44.entities.Book.list('-created_date', 200);
            console.log('[Home] 全本取得件数:', allBooks.length);

            // 各ジャンルの本を分類
            const booksByDomain = {};
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
            console.log('[Home] ジャンル別本数:', Object.fromEntries(Object.entries(booksByDomain).map(([k,v]) => [k, v.length])));

            // タグ分類で一件もなければ全本をマーケティングに入れてフォールバック
            if (Object.keys(booksByDomain).length === 0 && allBooks.length > 0) {
                console.log('[Home] タグ分類0件のためフォールバック: 全本を表示');
                booksByDomain['すべての本'] = allBooks.slice(0, 15);
            }
            setTopBooks(booksByDomain);
            setMainDomain(Object.keys(booksByDomain)[0] || Object.keys(domainConfig)[0]);

            // ログインユーザーのみの処理
            try {
                const user = await base44.auth.me();
                base44.functions.invoke('trackEvent', {
                    event_name: 'home_view',
                    event_value: {},
                    update_last_active: true
                }).catch(() => {});

                // 深掘り診断の最新セッションを取得
                const latestSessions = await base44.entities.DiagnosisSession.filter(
                    { user_id: user.id, is_latest: true },
                    '-created_date',
                    1
                );
                const latestSession = latestSessions[0] || null;
                console.log('[Home] 最新診断セッション:', latestSession ? latestSession.main_type : 'なし');

                // おすすめ本のスコアリング
                if ((user?.onboarding_completed && user?.profile_json) || latestSession) {
                    const scoredBooks = allBooks.map(book => {
                        let score = 0;
                        const bookTagsStr = (book.tags || []).join(' ').toLowerCase();
                        const painStr = (book.pain_points || []).join(' ').toLowerCase();
                        const outcomeStr = (book.outcomes || []).join(' ').toLowerCase();

                        if (user?.profile_json) {
                            const profile = user.profile_json;
                            const profileKeywords = [
                                profile.future_goal,
                                profile.challenges,
                                profile.position,
                                ...(profile.current_actions || [])
                            ].filter(Boolean);
                            profileKeywords.forEach(keyword => {
                                const kw = keyword.toLowerCase();
                                if (bookTagsStr.includes(kw)) score += 3;
                                if (painStr.includes(kw)) score += 2;
                                if (outcomeStr.includes(kw)) score += 1;
                            });
                        }

                        if (latestSession?.result_tags) {
                            latestSession.result_tags.forEach(({ tag, score: tagScore }) => {
                                const t = tag.toLowerCase();
                                if (bookTagsStr.includes(t)) score += (tagScore || 1) * 4;
                                if (painStr.includes(t)) score += (tagScore || 1) * 2;
                                if (outcomeStr.includes(t)) score += (tagScore || 1);
                            });
                            if (latestSession.genre && bookTagsStr.includes(latestSession.genre.toLowerCase())) score += 5;
                            if (latestSession.problem && painStr.includes(latestSession.problem.toLowerCase())) score += 3;
                        }

                        return { book, score };
                    });

                    const topRec = scoredBooks
                        .filter(s => s.score > 0)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10)
                        .map(s => s.book);
                    console.log('[Home] おすすめ本件数:', topRec.length);
                    setRecommendedBooks(topRec);
                }
            } catch (authError) {
                // 未ログインは正常（本一覧はすでに表示済み）
                console.log('[Home] 未ログインユーザー（本一覧は表示）');
            }
        } catch (error) {
            console.error('[Home] 本取得エラー:', error);
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
        // Track event without blocking navigation
        base44.functions.invoke('trackEvent', {
            event_name: 'book_view',
            event_value: { book_id: bookId, domain }
        }).catch(() => {}); // Silently fail
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

    const dragScroll = (e) => {
        const slider = e.currentTarget;
        slider.style.cursor = 'grabbing';
        let startX = e.pageX - slider.offsetLeft;
        let scrollLeft = slider.scrollLeft;
        const handleMouseMove = (ev) => {
            const x = ev.pageX - slider.offsetLeft;
            slider.scrollLeft = scrollLeft - (x - startX) * 2;
        };
        const handleMouseUp = () => {
            slider.style.cursor = 'grab';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <PullToRefresh onRefresh={loadData}>
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Search + Diagnosis hero */}
                <div className="mb-10 max-w-3xl mx-auto space-y-4">
                    <form onSubmit={handleSearch}>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                type="text"
                                placeholder="タイトル、著者、キーワードで探す..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-20 h-14 text-base rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:ring-indigo-400 focus-visible:border-indigo-400"
                            />
                            {searchQuery && (
                                <button
                                    type="submit"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors"
                                >
                                    検索
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Diagnosis CTA */}
                    <Link to={createPageUrl('DeepDiagnosis')}>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-5 text-white hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                            {/* subtle pattern */}
                            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
                            <div className="relative flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl flex-shrink-0">
                                        🎯
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-0.5">AI診断</div>
                                        <h3 className="text-base font-bold leading-tight">深掘り診断で本を見つける</h3>
                                        <p className="text-indigo-100 text-xs mt-0.5">悩みに合わせた本を厳選してご紹介します</p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* 診断結果ベースのおすすめ（ビジネス書） */}
                {recommendedBooks.filter(b => b.book_category !== 'novel_essay').length > 0 && (
                    <section className="mb-14">
                        <div className="flex items-end justify-between mb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">✨</span>
                                    <h2 className="text-xl font-bold text-gray-900">あなたへのおすすめ</h2>
                                </div>
                                <p className="text-xs text-gray-400 ml-7">診断結果から厳選｜ビジネス書</p>
                            </div>
                            </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {recommendedBooks.filter(b => b.book_category !== 'novel_essay').map(book => (
                                <div key={book.id} onClick={() => handleBookClick(book.id, 'recommend')}>
                                    <BookCard book={book} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 診断結果ベースのおすすめ（小説・エッセイ） */}
                {recommendedBooks.filter(b => b.book_category === 'novel_essay').length > 0 && (
                    <section className="mb-14">
                        <div className="flex items-end justify-between mb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">📖</span>
                                    <h2 className="text-xl font-bold text-gray-900">小説・エッセイのおすすめ</h2>
                                </div>
                                <p className="text-xs text-gray-400 ml-7">診断結果から厳選｜読み物・インスピレーション</p>
                            </div>
                            </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {recommendedBooks.filter(b => b.book_category === 'novel_essay').map(book => (
                                <div key={book.id} onClick={() => handleBookClick(book.id, 'recommend')}>
                                    <BookCard book={book} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Main Domain Carousel */}
                {topBooks[mainDomain]?.length > 0 && (
                    <section className="mb-14">
                        <div className="flex items-end justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                                <h2 className="text-xl font-bold text-gray-900">
                                    {domainConfig[mainDomain]?.label || mainDomain}
                                </h2>
                            </div>
                            <span className="text-xs text-gray-400 hidden sm:block">← スライド →</span>
                        </div>
                        <div
                            className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory cursor-grab active:cursor-grabbing"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onMouseDown={dragScroll}
                        >
                            {topBooks[mainDomain].map(book => (
                                <div
                                    key={book.id}
                                    className="flex-shrink-0 w-52 snap-start"
                                    onClick={() => handleBookClick(book.id, mainDomain)}
                                >
                                    <BookCard book={book} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* All Domains Carousels */}
                {Object.keys(topBooks).map(domain => (
                    domain !== mainDomain && topBooks[domain]?.length > 0 && (
                        <section key={domain} className="mb-14">
                            <div className="flex items-end justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-6 bg-purple-400 rounded-full" />
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {domainConfig[domain]?.label || domain}
                                    </h2>
                                </div>
                                <span className="text-xs text-gray-400 hidden sm:block">← スライド →</span>
                            </div>
                            <div
                                className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory cursor-grab active:cursor-grabbing"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                onMouseDown={dragScroll}
                            >
                                {topBooks[domain].map(book => (
                                    <div
                                        key={book.id}
                                        className="flex-shrink-0 w-52 snap-start"
                                        onClick={() => handleBookClick(book.id, domain)}
                                    >
                                        <BookCard book={book} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                ))}

                {/* 事例から学ぶ */}
                {caseStudies.length > 0 && (
                    <section className="mb-14">
                        <div className="flex items-end justify-between mb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Building2 className="w-5 h-5 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-gray-900">事例から学ぶ</h2>
                                </div>
                                <p className="text-xs text-gray-400">有名企業や人気サービスの"うまくいってる理由"を分解</p>
                            </div>
                            <Link to={createPageUrl('CaseStudies')} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                                もっと見る <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {caseStudies.map(c => (
                                <Link key={c.id} to={createPageUrl('CaseStudyDetail') + `?id=${c.id}`}
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    {c.thumbnail_url && (
                                        <div className="h-32 overflow-hidden">
                                            <img src={c.thumbnail_url} alt={c.company_name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <p className="text-xs text-emerald-600 font-semibold mb-1">{c.company_name}</p>
                                        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{c.title}</h3>
                                        {c.short_description && (
                                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{c.short_description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1">
                                            {[...(c.industry_tags || []), ...(c.learning_tags || [])].slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* 本が0件のとき */}
                {Object.keys(topBooks).length === 0 && !loading && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <div className="text-4xl mb-4">📚</div>
                        <p className="text-gray-600 font-medium mb-2">まだ本が登録されていません</p>
                        <p className="text-gray-400 text-sm mb-6">管理者が本を追加するまでお待ちください</p>
                        <Link to={createPageUrl('DeepDiagnosis')} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
                            深掘り診断を試す
                        </Link>
                    </div>
                )}
            </div>
        </div>
        </PullToRefresh>
    );
}