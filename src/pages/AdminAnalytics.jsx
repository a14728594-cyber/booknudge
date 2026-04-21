import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, RefreshCw, Filter } from 'lucide-react';

const DEVICE_COLORS = { mobile: '#6366f1', desktop: '#10b981', tablet: '#f59e0b', unknown: '#9ca3af' };
const DEVICE_LABELS = { mobile: 'モバイル', desktop: 'デスクトップ', tablet: 'タブレット', unknown: '不明' };

const KPI = ({ label, value, sub }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-indigo-600 mt-1 font-medium">{sub}</p>}
    </div>
);

const SummarySection = ({ data }) => {
    if (!data) return null;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="総訪問数" value={data.visits.toLocaleString()} />
            <KPI label="ユニーク訪問者" value={data.unique_visitors.toLocaleString()} />
            <KPI label="診断開始" value={data.diag_start.toLocaleString()} />
            <KPI label="診断完了" value={data.diag_complete.toLocaleString()} sub={`完了率 ${data.diag_complete_rate}%`} />
            <KPI label="登録の壁表示" value={data.reg_wall.toLocaleString()} />
            <KPI label="登録完了" value={data.reg_complete.toLocaleString()} sub={`転換率 ${data.reg_rate}%`} />
            <KPI label="診断完了率" value={`${data.diag_complete_rate}%`} sub="診断完了 / 開始" />
            <KPI label="登録転換率" value={`${data.reg_rate}%`} sub="登録 / 診断完了" />
        </div>
    );
};

const SourceTable = ({ rows, sortKey = 'reg_rate' }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">流入元</th>
                    <th className="pb-3 font-medium text-right">訪問数</th>
                    <th className="pb-3 font-medium text-right">診断開始</th>
                    <th className="pb-3 font-medium text-right">診断完了</th>
                    <th className="pb-3 font-medium text-right">登録</th>
                    <th className="pb-3 font-medium text-right">登録率</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-800">{r.source ?? r.campaign}</td>
                        <td className="py-3 text-right text-gray-600">{r.visits}</td>
                        <td className="py-3 text-right text-gray-600">{r.diag_start}</td>
                        <td className="py-3 text-right text-gray-600">{r.diag_complete}</td>
                        <td className="py-3 text-right text-gray-600">{r.reg_complete}</td>
                        <td className="py-3 text-right">
                            <span className={`font-bold ${r.reg_rate > 10 ? 'text-green-600' : r.reg_rate > 5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                                {r.reg_rate}%
                            </span>
                        </td>
                    </tr>
                ))}
                {rows.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">データなし</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

const FunnelSection = ({ summary }) => {
    if (!summary) return null;
    const steps = [
        { label: '訪問', value: summary.visits, color: '#6366f1' },
        { label: '診断開始', value: summary.diag_start, color: '#8b5cf6' },
        { label: '診断完了', value: summary.diag_complete, color: '#10b981' },
        { label: '登録の壁表示', value: summary.reg_wall, color: '#f59e0b' },
        { label: '登録完了', value: summary.reg_complete, color: '#ef4444' },
    ];
    const max = steps[0].value || 1;
    return (
        <div className="space-y-3">
            {steps.map((s, i) => {
                const pct = Math.round(s.value / max * 100);
                return (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{s.label}</span>
                            <span className="text-sm text-gray-500">{s.value.toLocaleString()} <span className="text-gray-400">({pct}%)</span></span>
                        </div>
                        <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                                className="h-full rounded-lg transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: s.color }}
                            />
                        </div>
                        {i < steps.length - 1 && (
                            <div className="text-center text-gray-300 text-xs mt-1">↓</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [summaryTab, setSummaryTab] = useState('week');
    const [filters, setFilters] = useState({ start_date: '', end_date: '', utm_sources: [], device_types: [] });
    const [exporting, setExporting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await base44.functions.invoke('getAnalyticsData', {
            start_date: filters.start_date || undefined,
            end_date: filters.end_date || undefined,
            utm_sources: filters.utm_sources.length > 0 ? filters.utm_sources : undefined,
            device_types: filters.device_types.length > 0 ? filters.device_types : undefined,
        });
        setData(res.data);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleExport = async () => {
        setExporting(true);
        const res = await base44.functions.invoke('exportAnalyticsCsv', {
            start_date: filters.start_date || undefined,
            end_date: filters.end_date || undefined,
            utm_sources: filters.utm_sources.length > 0 ? filters.utm_sources : undefined,
            device_types: filters.device_types.length > 0 ? filters.device_types : undefined,
        });
        const csvContent = res.data;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
    };

    const toggleSource = (src) => {
        setFilters(f => ({
            ...f,
            utm_sources: f.utm_sources.includes(src)
                ? f.utm_sources.filter(s => s !== src)
                : [...f.utm_sources, src],
        }));
    };

    const toggleDevice = (d) => {
        setFilters(f => ({
            ...f,
            device_types: f.device_types.includes(d)
                ? f.device_types.filter(x => x !== d)
                : [...f.device_types, d],
        }));
    };

    const deviceData = data ? Object.entries(data.device_breakdown)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: DEVICE_LABELS[k] || k, value: v, key: k })) : [];

    const summaryData = data?.summary?.[summaryTab];

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">流入分析ダッシュボード</h1>
                        <p className="text-sm text-gray-500 mt-1">管理者専用 · {data ? `${data.total_events.toLocaleString()}件のイベントを集計` : '読み込み中...'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            更新
                        </button>
                        <button onClick={handleExport} disabled={exporting || !data} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50">
                            <Download className="w-4 h-4" />
                            {exporting ? 'エクスポート中...' : 'CSVダウンロード'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-700">フィルター</span>
                    </div>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex gap-2 items-center">
                            <label className="text-xs text-gray-500">開始日</label>
                            <input type="date" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="text-xs text-gray-500">終了日</label>
                            <input type="date" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            <span className="text-xs text-gray-500 self-center mr-1">流入元:</span>
                            {(data?.available_sources || []).map(src => (
                                <button key={src} onClick={() => toggleSource(src)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filters.utm_sources.includes(src) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                                    {src}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            <span className="text-xs text-gray-500 self-center mr-1">デバイス:</span>
                            {['mobile', 'desktop', 'tablet'].map(d => (
                                <button key={d} onClick={() => toggleDevice(d)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filters.device_types.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                                    {DEVICE_LABELS[d]}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setFilters({ start_date: '', end_date: '', utm_sources: [], device_types: [] })}
                            className="text-xs text-gray-400 hover:text-gray-600 underline">リセット</button>
                    </div>
                </div>

                {loading && !data && (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                )}

                {data && (
                    <>
                        {/* Section 1: Summary */}
                        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900">📊 サマリー</h2>
                                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                    {[['today', '今日'], ['week', '今週'], ['month', '今月'], ['all', '全期間']].map(([k, label]) => (
                                        <button key={k} onClick={() => setSummaryTab(k)}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${summaryTab === k ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <SummarySection data={summaryData} />
                        </section>

                        {/* Section 6: Funnel */}
                        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-5">🔽 ファネル可視化（{summaryTab === 'today' ? '今日' : summaryTab === 'week' ? '今週' : summaryTab === 'month' ? '今月' : '全期間'}）</h2>
                            <FunnelSection summary={summaryData} />
                        </section>

                        {/* Section 5: Time Series */}
                        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-5">📈 時系列推移（過去30日）</h2>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={data.time_series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip labelFormatter={l => l} />
                                    <Legend formatter={v => ({ visits: '訪問数', diag_complete: '診断完了', reg_complete: '登録' }[v] || v)} />
                                    <Line type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={2} dot={false} name="visits" />
                                    <Line type="monotone" dataKey="diag_complete" stroke="#10b981" strokeWidth={2} dot={false} name="diag_complete" />
                                    <Line type="monotone" dataKey="reg_complete" stroke="#ef4444" strokeWidth={2} dot={false} name="reg_complete" />
                                </LineChart>
                            </ResponsiveContainer>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Section 2: Source */}
                            <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-5">📣 流入元別分析</h2>
                                <SourceTable rows={data.source_breakdown} />
                            </section>

                            {/* Section 4: Device */}
                            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-5">📱 デバイス別</h2>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                                            {deviceData.map((d, i) => (
                                                <Cell key={i} fill={DEVICE_COLORS[d.key] || '#9ca3af'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {deviceData.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEVICE_COLORS[d.key] || '#9ca3af' }} />
                                                <span className="text-gray-700">{d.name}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{d.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {deviceData.find(d => d.key === 'mobile' && (d.value / (deviceData.reduce((s, x) => s + x.value, 0) || 1)) > 0.7) && (
                                        <p className="text-xs text-indigo-600 mt-3 bg-indigo-50 rounded-lg p-2">📱 モバイルが70%超 — モバイル最適化が最優先です</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Section 3: Campaign */}
                        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-5">🎯 キャンペーン別分析（TOP10）</h2>
                            <SourceTable rows={data.campaign_breakdown.map(c => ({ ...c, source: c.campaign }))} />
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}