import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import BookCard from '@/components/common/BookCard';
import { Search, ArrowRight, ChevronRight, Building2 } from 'lucide-react';
import PullToRefresh from '@/components/common/PullToRefresh';

export default function Home() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Data
    const [allBooks, setAllBooks] = useState([]);
    const [caseStudies, setCaseStudies] = useState([]);
    const [recommendedBooks, setRecommendedBooks] = useState([]);

    const checkCheckoutSuccess = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('checkout') === 'success') {
            await base44.functions.invoke('trackEvent', { event_name: 'checkout_success', event_value: { from: 'paywall' } });
            const nextUrl = urlParams.get('next');
            if (nextUrl) {
                window.history.replaceState({}, '', window.location.pathname);
                navigate(nextUrl);
            }
        }
    };

    const loadData = async () => {
        try {
            const [books, cases] = await Promise.all([
                base44.entities.Book.list('-created_date', 200),
                base44.entities.CaseStudy.filter({ is_published: true }, 'order', 6),
            ]);
            setAllBooks(books);
            setCaseStudies(cases);

            // Recommended books for logged-in users
            try {
                const user = await base44.auth.me();
                base44.functions.invoke('trackEvent', { event_name: 'home_view', event_value: {}, update_last_active: true }).catch(() => {});
                const latestSessions = await base44.entities.DiagnosisSession.filter({ user_id: user.id, is_latest: true }, '-created_date', 1);
                const latestSession = latestSessions[0] || null;
                if ((user?.onboarding_completed && user?.profile_json) || latestSession) {
                    const scored = books.map(book => {
                        let score = 0;
                        const tagsStr = (book.tags || []).join(' ').toLowerCase();
                        const painStr = (book.pain_points || []).join(' ').toLowerCase();
                        if (user?.profile_json) {
                            const kws = [user.profile_json.future_goal, user.profile_json.challenges, user.profile_json.position, ...(user.profile_json.current_actions || [])].filter(Boolean);
                            kws.forEach(kw => { if (tagsStr.includes(kw.toLowerCase())) score += 3; if (painStr.includes(kw.toLowerCase())) score += 2; });
                        }
                        if (latestSession?.result_tags) {
                            latestSession.result_tags.forEach(({ tag, score: ts }) => { if (tagsStr.includes(tag.toLowerCase())) score += (ts || 1) * 4; });
                        }
                        return { book, score };
                    });
                    setRecommendedBooks(scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map(s => s.book));
                }
            } catch {
                // 未ログイン
            }
        } catch (error) {
            console.error('[Home] データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) window.location.href = createPageUrl('search') + `?q=${encodeURIComponent(searchQuery)}`;
    };

    const handleBookClick = (bookId) => {
        base44.functions.invoke('trackEvent', { event_name: 'book_view', event_value: { book_id: bookId } }).catch(() => {});
    };

    const dragScroll = (e) => {
        const slider = e.currentTarget;
        slider.style.cursor = 'grabbing';
        let startX = e.pageX - slider.offsetLeft;
        let scrollLeft = slider.scrollLeft;
        const onMove = (ev) => { slider.scrollLeft = scrollLeft - (ev.pageX - slider.offsetLeft - startX) * 2; };
        const onUp = () => { slider.style.cursor = 'grab'; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };



    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <PullToRefresh onRefresh={loadData}>
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Search */}
                <div className="mb-6 max-w-3xl mx-auto space-y-4">
                    <form onSubmit={handleSearch}>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                type="text"
                                placeholder="タイトル、著者、キーワードで探す..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-20 h-14 text-base rounded-2xl border-gray-200 bg-white shadow-sm focus-visible:ring-indigo-400"
                            />
                            {searchQuery && (
                                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors">
                                    検索
                                </button>
                            )}
                        </div>
                    </form>

                    {/* CTAs */}
                    <Link to={createPageUrl('DeepDiagnosis')}>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-5 text-white hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
                            <div className="relative flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🎯</div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-0.5">AI診断</div>
                                        <h3 className="text-base font-bold leading-tight">深掘り診断で本を見つける</h3>
                                        <p className="text-indigo-100 text-xs mt-0.5">悩みに合わせた本を厳選してご紹介します</p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 bg-white/20 rounded-xl p-2"><ArrowRight className="w-5 h-5" /></div>
                            </div>
                        </div>
                    </Link>

                    <Link to="/game">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 text-white hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 30% 60%, white 1px, transparent 1px)', backgroundSize: '36px 36px'}} />
                            <div className="relative flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🏪</div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-amber-100 mb-0.5">ビジネスゲーム</div>
                                        <h3 className="text-base font-bold leading-tight">プランを立てて、AIに評価してもらう</h3>
                                        <p className="text-amber-100 text-xs mt-0.5">マーケティングプランをAIがスコアリング</p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 bg-white/20 rounded-xl p-2"><ArrowRight className="w-5 h-5" /></div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* おすすめ（ログイン時） */}
                {recommendedBooks.length > 0 && (



                {/* 本一覧 */}
                <section className="mb-14">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">すべての本</h2>
                        <span className="text-sm text-gray-400">{allBooks.length}冊</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory cursor-grab active:cursor-grabbing" style={{ scrollbarWidth: 'none' }} onMouseDown={dragScroll}>
                        {allBooks.map(book => (
                            <div key={book.id} className="flex-shrink-0 w-52 snap-start" onClick={() => handleBookClick(book.id)}>
                                <BookCard book={book} />
                            </div>
                        ))}
                    </div>
                </section>

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
                                        {c.short_description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{c.short_description}</p>}
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
            </div>
        </div>
        </PullToRefresh>
    );
}