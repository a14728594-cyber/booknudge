import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { page, referrer } = await req.json();

        // user_idはオプション（未ログインでも記録）
        let userId = 'anonymous';
        try {
            const isAuth = await base44.auth.isAuthenticated();
            if (isAuth) {
                const user = await base44.auth.me();
                if (user) userId = user.id;
            }
        } catch (e) { /* 未ログイン */ }

        await base44.asServiceRole.entities.Event.create({
            user_id: userId,
            event_name: 'landing_view',
            event_value: { page: page || 'landing', referrer: referrer || '' }
        });

        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});