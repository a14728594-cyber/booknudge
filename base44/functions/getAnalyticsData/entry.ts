import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { start_date, end_date, utm_sources, device_types } = body;

    // Fetch all events (up to 5000)
    let allEvents = await base44.asServiceRole.entities.Event.list('-created_date', 5000);

    // Date filter
    const startMs = start_date ? new Date(start_date).getTime() : null;
    const endMs = end_date ? new Date(end_date + 'T23:59:59').getTime() : null;
    if (startMs || endMs) {
        allEvents = allEvents.filter(e => {
            const t = new Date(e.created_date).getTime();
            if (startMs && t < startMs) return false;
            if (endMs && t > endMs) return false;
            return true;
        });
    }
    if (utm_sources && utm_sources.length > 0) {
        allEvents = allEvents.filter(e => utm_sources.includes(e.utm_source || ''));
    }
    if (device_types && device_types.length > 0) {
        allEvents = allEvents.filter(e => device_types.includes(e.device_type || ''));
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = (() => {
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    })();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const computeSummary = (events) => {
        const visits = events.filter(e => e.event_name === 'landing_visit');
        const diagStart = events.filter(e => e.event_name === 'diagnosis_start');
        const diagComplete = events.filter(e => e.event_name === 'diagnosis_complete');
        const regWall = events.filter(e => e.event_name === 'registration_wall_view');
        const regComplete = events.filter(e => e.event_name === 'registration_complete');
        const uniqueVisitors = new Set(visits.map(e => e.anonymous_id).filter(Boolean)).size;
        const diagCompleteRate = diagStart.length > 0 ? Math.round(diagComplete.length / diagStart.length * 1000) / 10 : 0;
        const regRate = diagComplete.length > 0 ? Math.round(regComplete.length / diagComplete.length * 1000) / 10 : 0;
        return {
            visits: visits.length,
            unique_visitors: uniqueVisitors,
            diag_start: diagStart.length,
            diag_complete: diagComplete.length,
            reg_wall: regWall.length,
            reg_complete: regComplete.length,
            diag_complete_rate: diagCompleteRate,
            reg_rate: regRate,
        };
    };

    const filterByTime = (events, since) => events.filter(e => new Date(e.created_date).getTime() >= since);

    const summary = {
        today: computeSummary(filterByTime(allEvents, todayStart)),
        week: computeSummary(filterByTime(allEvents, weekStart)),
        month: computeSummary(filterByTime(allEvents, monthStart)),
        all: computeSummary(allEvents),
    };

    // UTM source breakdown
    const KNOWN_SOURCES = ['x', 'tiktok', 'instagram', 'youtube', 'google', 'profile', 'direct'];
    const sourceMap = {};
    for (const e of allEvents) {
        let src = e.utm_source || '';
        if (!src) src = '(direct)';
        else if (!KNOWN_SOURCES.includes(src)) src = src; // keep as-is
        if (!sourceMap[src]) sourceMap[src] = { source: src, visits: 0, diag_start: 0, diag_complete: 0, reg_complete: 0 };
        if (e.event_name === 'landing_visit') sourceMap[src].visits++;
        if (e.event_name === 'diagnosis_start') sourceMap[src].diag_start++;
        if (e.event_name === 'diagnosis_complete') sourceMap[src].diag_complete++;
        if (e.event_name === 'registration_complete') sourceMap[src].reg_complete++;
    }
    const sourceBreakdown = Object.values(sourceMap).map(s => ({
        ...s,
        reg_rate: s.diag_complete > 0 ? Math.round(s.reg_complete / s.diag_complete * 1000) / 10 : 0,
    })).sort((a, b) => b.reg_rate - a.reg_rate);

    // Campaign breakdown (top 10)
    const campaignMap = {};
    for (const e of allEvents) {
        const camp = e.utm_campaign || '(none)';
        if (!campaignMap[camp]) campaignMap[camp] = { campaign: camp, visits: 0, diag_start: 0, diag_complete: 0, reg_complete: 0 };
        if (e.event_name === 'landing_visit') campaignMap[camp].visits++;
        if (e.event_name === 'diagnosis_start') campaignMap[camp].diag_start++;
        if (e.event_name === 'diagnosis_complete') campaignMap[camp].diag_complete++;
        if (e.event_name === 'registration_complete') campaignMap[camp].reg_complete++;
    }
    const campaignBreakdown = Object.values(campaignMap).map(c => ({
        ...c,
        reg_rate: c.diag_complete > 0 ? Math.round(c.reg_complete / c.diag_complete * 1000) / 10 : 0,
    })).sort((a, b) => b.visits - a.visits).slice(0, 10);

    // Device breakdown
    const deviceMap = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
    for (const e of allEvents) {
        if (e.event_name !== 'landing_visit') continue;
        const d = e.device_type || 'unknown';
        deviceMap[d] = (deviceMap[d] || 0) + 1;
    }

    // Time series: past 30 days
    const days = 30;
    const timeSeriesMap = {};
    for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().slice(0, 10);
        timeSeriesMap[key] = { date: key, visits: 0, diag_complete: 0, reg_complete: 0 };
    }
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
    for (const e of allEvents) {
        const t = new Date(e.created_date);
        if (t < thirtyDaysAgo) continue;
        const key = t.toISOString().slice(0, 10);
        if (!timeSeriesMap[key]) continue;
        if (e.event_name === 'landing_visit') timeSeriesMap[key].visits++;
        if (e.event_name === 'diagnosis_complete') timeSeriesMap[key].diag_complete++;
        if (e.event_name === 'registration_complete') timeSeriesMap[key].reg_complete++;
    }
    const timeSeries = Object.values(timeSeriesMap);

    // All unique utm_sources for filter
    const allSources = [...new Set(allEvents.map(e => e.utm_source || '').filter(Boolean))];

    return Response.json({
        summary,
        source_breakdown: sourceBreakdown,
        campaign_breakdown: campaignBreakdown,
        device_breakdown: deviceMap,
        time_series: timeSeries,
        available_sources: allSources,
        total_events: allEvents.length,
    });
});