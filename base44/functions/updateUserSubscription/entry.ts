import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 冪等なユーザー/サブスクリプション更新の共通関数
 * webhook と verifyCheckoutSession の両方で使用
 * eventId or sessionId で重複処理を防止
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const {
            user_id,
            stripe_customer_id,
            stripe_subscription_id,
            subscription_status,
            event_id,
            session_id
        } = await req.json();

        if (!user_id || !stripe_customer_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // イベントの重複処理チェック
        let processedEventId = null;
        if (event_id) {
            const existing = await base44.asServiceRole.entities.ProcessedEvent.filter({
                stripe_event_id: event_id
            });
            
            if (existing.length > 0) {
                console.log(`[updateUserSubscription] Event ${event_id} already processed`);
                return Response.json({ ok: true, skipped: true, message: 'Event already processed' });
            }
            processedEventId = event_id;
        }

        // サブスクリプション取得
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
            user_id: user_id
        });

        // 更新内容を構築（冪等性保証）
        const subUpdate = {
            stripe_customer_id: stripe_customer_id
        };
        
        if (stripe_subscription_id) {
            subUpdate.stripe_subscription_id = stripe_subscription_id;
        }
        if (subscription_status) {
            subUpdate.status = subscription_status;
        }

        if (existingSubs.length > 0) {
            // 既存サブスクリプション更新
            const sub = existingSubs[0];
            const currentData = {
                status: sub.status,
                stripe_subscription_id: sub.stripe_subscription_id
            };

            // 変更がある場合のみ更新
            if (currentData.status !== subscription_status || 
                (stripe_subscription_id && currentData.stripe_subscription_id !== stripe_subscription_id)) {
                await base44.asServiceRole.entities.Subscription.update(sub.id, subUpdate);
                console.log(`[updateUserSubscription] Subscription updated: ${sub.id}`);
            } else {
                console.log(`[updateUserSubscription] Subscription unchanged: ${sub.id}`);
            }
        } else if (stripe_subscription_id) {
            // 新規サブスクリプション作成
            await base44.asServiceRole.entities.Subscription.create({
                user_id: user_id,
                stripe_customer_id: stripe_customer_id,
                stripe_subscription_id: stripe_subscription_id,
                status: subscription_status || 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            console.log(`[updateUserSubscription] Subscription created for user: ${user_id}`);
        }

        // ユーザー更新（冪等）
        const userUpdate = {
            stripe_customer_id: stripe_customer_id
        };
        
        if (subscription_status) {
            userUpdate.subscription_status = subscription_status;
            if (subscription_status === 'active') {
                userUpdate.plan = 'premium';
            }
        }

        const user = await base44.asServiceRole.entities.User.get(user_id);
        if (user.stripe_customer_id !== stripe_customer_id || user.subscription_status !== subscription_status) {
            await base44.asServiceRole.entities.User.update(user_id, userUpdate);
            console.log(`[updateUserSubscription] User updated: ${user_id}`);
        } else {
            console.log(`[updateUserSubscription] User unchanged: ${user_id}`);
        }

        // イベント記録（重複防止）
        if (processedEventId) {
            await base44.asServiceRole.entities.ProcessedEvent.create({
                stripe_event_id: processedEventId,
                event_type: 'user_subscription_update',
                user_id: user_id,
                processed_at: new Date().toISOString(),
                status: 'success'
            });
        }

        return Response.json({ ok: true, message: 'User subscription updated' });
    } catch (error) {
        console.error('[updateUserSubscription] Error:', error.message);
        return Response.json({ 
            ok: false, 
            error: error.message 
        }, { status: 500 });
    }
});