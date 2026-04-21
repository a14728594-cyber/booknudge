import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { start_date, end_date, utm_sources, device_types } = body;

    let allEvents = await base44.asServiceRole.entities.Event.list('-created_date', 5000);

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

    const headers = ['id', 'created_date', 'event_name', 'anonymous_id', 'user_id', 'session_id', 'page_path', 'utm_source', 'utm_medium', 'utm_campaign', 'device_type', 'referrer_url'];
    const rows = allEvents.map(e =>
        headers.map(h => {
            const v = e[h] ?? '';
            const s = String(v);
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=analytics_${new Date().toISOString().slice(0,10)}.csv`,
        },
    });
});