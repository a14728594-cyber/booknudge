import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.25.0';

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[${requestId}] verifyCheckoutSession started`);
    
    try {
        const stripeMode = Deno.env.get('STRIPE_MODE') || 'test';
        const isLive = stripeMode === 'live';

        const STRIPE_SECRET_KEY = isLive
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!STRIPE_SECRET_KEY) {
            console.error(`[${requestId}] Stripe key missing`);
            return Response.json({ ok: false, message: 'Stripe設定が完了していません' }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

        // bodyを先に読み取る（SDKがbodyを消費する前に）
        const body = await req.json();
        const { session_id } = body;

        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            console.log(`[${requestId}] Auth failed`);
            return Response.json({ ok: false, message: 'ログインが必要です' }, { status: 401 });
        }
        
        if (!session_id) {
            console.log(`[${requestId}] session_id missing`);
            return Response.json({ ok: false, message: 'session_idが必要です' }, { status: 400 });
        }

        console.log(`[${requestId}] Retrieving session ${session_id} from Stripe`);
        const session = await stripe.checkout.sessions.retrieve(session_id);

        console.log(`[${requestId}] Session retrieved - payment_status: ${session.payment_status}, customer: ${session.customer}, subscription: ${session.subscription}, customer_email: ${session.customer_email}, status: ${session.status}`);

        // セッションが有効で支払い完了している場合
        if (session.payment_status === 'paid' && session.customer) {
            const userId = session.metadata?.user_id || session.client_reference_id;
            
            if (userId !== user.id) {
                console.warn(`[${requestId}] User mismatch - session user: ${userId}, current user: ${user.id}`);
                return Response.json({ ok: false, message: 'セッションが無効です' }, { status: 403 });
            }

            console.log(`[${requestId}] Verifying DB state for user ${userId}`);

            // WebhookがDB更新の責務を持つため、このVerify関数はUX確認のみ
            // （webhook処理が未完了の可能性があるため、pollして待つはUXアプリケーション層の責務）
            console.log(`[${requestId}] Verification: session confirmed paid. DB update is handled by webhook`);

            return Response.json({ 
                ok: true, 
                subscription_active: true,
                message: 'サブスクリプションが有効になりました'
            });
        } else {
            console.log(`[${requestId}] Payment not completed - payment_status: ${session.payment_status}`);
            return Response.json({ 
                ok: true, 
                subscription_active: false,
                message: '決済がまだ完了していません'
            });
        }
    } catch (error) {
        console.error(`[${requestId}] ERROR:`, error.message, error.stack);
        return Response.json({ ok: false, message: 'セッションの検証に失敗しました', details: error.message }, { status: 500 });
    }
});