import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import KPICard from '@/components/admin/KPICard';
import Card from '@/components/common/Card';
import { Users, UserPlus, Activity, CreditCard, TrendingUp, BarChart3, Eye } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({
        totalUsers: 0,
        newUsers7d: 0,
        dau: 0,
        wau: 0,
        paidUsers: 0,
        mrr: 0,
        pageViews7d: 0,
        pageViewsToday: 0
    });
    const [charts, setCharts] = useState({
        signups: [],
        quizAnswers: [],
        subscribes: []
    });
    const [topDomains, setTopDomains] = useState([]);
    const [funnel, setFunnel] = useState([]);

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        try {
            const user = await base44.auth.me();
            if (user.role !== 'admin') {
                navigate(createPageUrl('home'));
                return;
            }
            loadDashboardData();
        } catch (error) {
            navigate(createPageUrl('landing'));
        }
    };

    const loadDashboardData = async () => {
        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Total Users
            const allUsers = await base44.entities.User.list('', 10000);
            const totalUsers = allUsers.length;

            // New Users (7d)
            const newUsers = allUsers.filter(u => 
                new Date(u.created_date) >= sevenDaysAgo
            );

            // DAU (today's active users)
            const todayEvents = await base44.entities.Event.filter({
                created_date: { $gte: todayStart.toISOString() }
            }, '-created_date', 10000);
            const dauUserIds = new Set(todayEvents.map(e => e.user_id));

            // WAU (7d active users)
            const weekEvents = await base44.entities.Event.filter({
                created_date: { $gte: sevenDaysAgo.toISOString() }
            }, '-created_date', 10000);
            const wauUserIds = new Set(weekEvents.map(e => e.user_id));

            // Paid Users
            const paidUsers = allUsers.filter(u => u.plan_status === 'paid');

            // MRR (仮: 1200円 × 有料ユーザー数)
            const mrr = paidUsers.length * 1200;

            // Page views (landing / home visits including non-logged-in)
            const pageViewsToday = todayEvents.filter(e =>
                e.event_name === 'home_view' || e.event_name === 'recommend_view' || e.event_name === 'landing_view'
            ).length;
            const pageViews7d = weekEvents.filter(e =>
                e.event_name === 'home_view' || e.event_name === 'recommend_view' || e.event_name === 'landing_view'
            ).length;

            setKpis({
                totalUsers,
                newUsers7d: newUsers.length,
                dau: dauUserIds.size,
                wau: wauUserIds.size,
                paidUsers: paidUsers.length,
                mrr,
                pageViews7d,
                pageViewsToday
            });

            // Charts (7日分)
            const chartData = { signups: [], quizAnswers: [], subscribes: [] };
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

                const dayEvents = await base44.entities.Event.filter({
                    created_date: { 
                        $gte: dateStart.toISOString(),
                        $lt: dateEnd.toISOString()
                    }
                });

                chartData.signups.push({
                    date: dateStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
                    count: dayEvents.filter(e => e.event_name === 'signup').length
                });
                chartData.quizAnswers.push({
                    date: dateStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
                    count: dayEvents.filter(e => e.event_name === 'quiz_answer').length
                });
                chartData.subscribes.push({
                    date: dateStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
                    count: dayEvents.filter(e => e.event_name === 'subscribe').length
                });
            }
            setCharts(chartData);

            // Top Domains
            const allAnswers = await base44.entities.Answer.list('', 1000);
            const domainCounts = {};
            allAnswers.forEach(a => {
                domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
            });
            const sortedDomains = Object.entries(domainCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            setTopDomains(sortedDomains);

            // Funnel (7d)
            const weekEventsAll = await base44.entities.Event.filter({
                created_date: { $gte: sevenDaysAgo.toISOString() }
            });
            
            const signupUsers = new Set(weekEventsAll.filter(e => e.event_name === 'signup').map(e => e.user_id));
            const onboardingUsers = new Set(weekEventsAll.filter(e => e.event_name === 'onboarding_complete').map(e => e.user_id));
            const recommendUsers = new Set(weekEventsAll.filter(e => e.event_name === 'recommend_view').map(e => e.user_id));
            const quizUsers = new Set(weekEventsAll.filter(e => e.event_name === 'quiz_answer').map(e => e.user_id));
            const subscribeUsers = new Set(weekEventsAll.filter(e => e.event_name === 'subscribe').map(e => e.user_id));

            setFunnel([
                { step: 'signup', count: signupUsers.size, pct: 100 },
                { step: 'onboarding', count: onboardingUsers.size, pct: signupUsers.size > 0 ? Math.round((onboardingUsers.size / signupUsers.size) * 100) : 0 },
                { step: 'recommend', count: recommendUsers.size, pct: signupUsers.size > 0 ? Math.round((recommendUsers.size / signupUsers.size) * 100) : 0 },
                { step: 'quiz_answer', count: quizUsers.size, pct: signupUsers.size > 0 ? Math.round((quizUsers.size / signupUsers.size) * 100) : 0 },
                { step: 'subscribe', count: subscribeUsers.size, pct: signupUsers.size > 0 ? Math.round((subscribeUsers.size / signupUsers.size) * 100) : 0 }
            ]);

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    管理ダッシュボード
                </h1>

                {/* KPIs */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <KPICard
                        title="総ユーザー数"
                        value={kpis.totalUsers.toLocaleString()}
                        icon={Users}
                        colorClass="text-indigo-600"
                    />
                    <KPICard
                        title="新規ユーザー（7日間）"
                        value={kpis.newUsers7d.toLocaleString()}
                        icon={UserPlus}
                        colorClass="text-green-600"
                    />
                    <KPICard
                        title="DAU（今日）"
                        value={kpis.dau.toLocaleString()}
                        icon={Activity}
                        colorClass="text-blue-600"
                    />
                    <KPICard
                        title="WAU（7日間）"
                        value={kpis.wau.toLocaleString()}
                        icon={TrendingUp}
                        colorClass="text-purple-600"
                    />
                    <KPICard
                        title="有料ユーザー"
                        value={kpis.paidUsers.toLocaleString()}
                        icon={CreditCard}
                        colorClass="text-amber-600"
                    />
                    <KPICard
                        title="MRR"
                        value={`¥${kpis.mrr.toLocaleString()}`}
                        icon={BarChart3}
                        colorClass="text-rose-600"
                    />
                    <KPICard
                        title="ページ訪問（今日）"
                        value={kpis.pageViewsToday.toLocaleString()}
                        icon={Eye}
                        colorClass="text-teal-600"
                    />
                    <KPICard
                        title="ページ訪問（7日間）"
                        value={kpis.pageViews7d.toLocaleString()}
                        icon={Eye}
                        colorClass="text-cyan-600"
                    />
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">新規登録（7日間）</h3>
                        <div className="space-y-2">
                            {charts.signups.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 w-16">{item.date}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                                        <div 
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{ width: `${item.count > 0 ? (item.count / Math.max(...charts.signups.map(s => s.count))) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-900 w-8 text-right">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">問題回答（7日間）</h3>
                        <div className="space-y-2">
                            {charts.quizAnswers.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 w-16">{item.date}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                                        <div 
                                            className="bg-purple-600 h-2 rounded-full"
                                            style={{ width: `${item.count > 0 ? (item.count / Math.max(...charts.quizAnswers.map(s => s.count))) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-900 w-8 text-right">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">課金（7日間）</h3>
                        <div className="space-y-2">
                            {charts.subscribes.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 w-16">{item.date}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                                        <div 
                                            className="bg-green-600 h-2 rounded-full"
                                            style={{ width: `${item.count > 0 ? (item.count / Math.max(...charts.subscribes.map(s => s.count))) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-900 w-8 text-right">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Top Domains & Funnel */}
                <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">人気ジャンル TOP5</h3>
                        <div className="space-y-3">
                            {topDomains.map(([domain, count], idx) => (
                                <div key={domain} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                                        <span className="font-medium text-gray-900">{domain}</span>
                                    </div>
                                    <span className="text-gray-600">{count}回答</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">ファネル（7日間）</h3>
                        <div className="space-y-3">
                            {funnel.map((step, idx) => (
                                <div key={step.step}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700">{step.step}</span>
                                        <span className="text-sm text-gray-600">{step.count}人 ({step.pct}%)</span>
                                    </div>
                                    <div className="bg-gray-100 rounded-full h-2">
                                        <div 
                                            className="bg-indigo-600 h-2 rounded-full transition-all"
                                            style={{ width: `${step.pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}