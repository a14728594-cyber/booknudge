import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[${requestId}] verifyCheckoutSession started`);
    
    try {
        const mode = 'test';
        const isLive = false;

        const STRIPE_SECRET_KEY = isLive
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!STRIPE_SECRET_KEY) {
            console.error(`[${requestId}] Stripe key missing`);
            return Response.json({ ok: false, message: 'Stripe設定が完了していません' }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            console.log(`[${requestId}] Auth failed`);
            return Response.json({ ok: false, message: 'ログインが必要です' }, { status: 401 });
        }

        const { session_id } = await req.json();
        
        if (!session_id) {
            console.log(`[${requestId}] session_id missing`);
            return Response.json({ ok: false, message: 'session_idが必要です' }, { status: 400 });
        }

        console.log(`[${requestId}] Retrieving session ${session_id} from Stripe`);
        const session = await stripe.checkout.sessions.retrieve(session_id);

        console.log(`[${requestId}] Session retrieved - payment_status: ${session.payment_status}, customer: ${session.customer}, subscription: ${session.subscription}`);

        // セッションが有効で支払い完了している場合
        if (session.payment_status === 'paid' && session.customer) {
            const userId = session.metadata?.user_id || session.client_reference_id;
            
            if (userId !== user.id) {
                console.warn(`[${requestId}] User mismatch - session user: ${userId}, current user: ${user.id}`);
                return Response.json({ ok: false, message: 'セッションが無効です' }, { status: 403 });
            }

            console.log(`[${requestId}] Verifying DB state for user ${userId}`);

            // DBの状態を確認
            const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
                user_id: userId
            });

            // Subscriptionがまだ作成されていない場合、即座に作成
            if (existingSubs.length === 0 && session.subscription) {
                console.log(`[${requestId}] Creating subscription record immediately`);
                await base44.asServiceRole.entities.Subscription.create({
                    user_id: userId,
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
            }

            // Userエンティティを即座に更新
            console.log(`[${requestId}] Updating user entitlement immediately`);
            await base44.asServiceRole.entities.User.update(userId, {
                stripe_customer_id: session.customer,
                subscription_status: 'active',
                plan: 'premium'
            });

            console.log(`[${requestId}] Verification complete - user now has premium access`);

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
        return Response.json({ 
            ok: false, 
            message: 'セッションの検証に失敗しました',
            details: error.message 
        }, { status: 500 });
    }
});