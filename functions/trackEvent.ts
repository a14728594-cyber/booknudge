import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event_name, event_value, update_last_active } = await req.json();

        // イベント記録
        await base44.entities.Event.create({
            user_id: user.id,
            event_name,
            event_value: event_value || {}
        });

        // last_active_at更新
        if (update_last_active) {
            await base44.auth.updateMe({
                last_active_at: new Date().toISOString()
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error tracking event:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});