import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[${requestId}] createCustomerPortalSession started`);
    
    try {
        const mode = 'test';
        const isLive = false;

        const STRIPE_SECRET_KEY = isLive
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!STRIPE_SECRET_KEY) {
            return Response.json({ ok: false, message: 'Stripe設定が完了していません。' }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.log(`[${requestId}] Auth failed - no user`);
            return Response.json({ ok: false, message: 'ログインが必要です。' }, { status: 401 });
        }

        console.log(`[${requestId}] User authenticated: ${user.id} (${user.email})`);

        const { return_url } = await req.json();

        const customerIdField = isLive ? 'stripe_customer_id_live' : 'stripe_customer_id_test';
        const customerId = user[customerIdField];

        if (!customerId) {
            console.log(`[${requestId}] No customer ID found for user ${user.id}`);
            return Response.json({ ok: false, message: 'Stripe顧客情報が見つかりません。' }, { status: 400 });
        }

        console.log(`[${requestId}] Creating portal session for customer: ${customerId}`);

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: return_url || `${req.headers.get('origin')}/profile`
        });

        console.log(`[${requestId}] Portal session created: ${session.id}`);
        return Response.json({ ok: true, url: session.url });
    } catch (error) {
        console.error(`[${requestId}] ERROR:`, error.message, error.stack);
        return Response.json({ ok: false, message: '請求管理ページの作成に失敗しました。', details: error.message }, { status: 500 });
    }
});