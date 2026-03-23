import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';
import * as Sentry from 'npm:@sentry/node@7.108.0';

Deno.serve(async (req) => {
    const webhookId = crypto.randomUUID().substring(0, 8);
    
    // Sentry初期化（一度だけ）
    if (!Sentry.getClient()) {
        Sentry.init({
            dsn: Deno.env.get('SENTRY_DSN'),
            environment: Deno.env.get('SENTRY_ENVIRONMENT') || 'test',
            tracesSampleRate: 1.0,
            sendDefaultPii: false
        });
    }
    
    console.log(`[${webhookId}] Webhook received`);
    
    try {
        const stripeMode = Deno.env.get('STRIPE_MODE') || 'test';
        const isLive = stripeMode === 'live';

        const STRIPE_SECRET_KEY = isLive
            ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
            : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        const STRIPE_WEBHOOK_SECRET = isLive
            ? Deno.env.get('STRIPE_WEBHOOK_SECRET_LIVE')
            : Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2024-12-18.acacia',
        });

        const base44 = createClientFromRequest(req);
        
        const signature = req.headers.get('stripe-signature');
        const body = await req.text();
        
        if (!signature) {
            return Response.json({ error: 'No signature' }, { status: 400 });
        }

        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );

        console.log(`[${webhookId}] Event type: ${event.type}, event_id: ${event.id}, timestamp: ${new Date().toISOString()}`);

        // イベント重複チェック
        const existingEvent = await base44.asServiceRole.entities.ProcessedEvent.filter({
            stripe_event_id: event.id
        });

        if (existingEvent.length > 0) {
            console.log(`[${webhookId}] Event ${event.id} already processed - skipping`);
            return Response.json({ received: true, skipped: true });
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.user_id || session.client_reference_id;
                const customerId = session.customer;

                console.log(`[${webhookId}] checkout.session.completed - session_id: ${session.id}, user_id: ${userId}, customer_id: ${customerId}, subscription_id: ${session.subscription}`);

                if (userId && customerId) {
                    // 共通の更新関数を呼び出し
                    const result = await base44.functions.invoke('updateUserSubscription', {
                        user_id: userId,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: session.subscription,
                        subscription_status: 'active',
                        event_id: event.id
                    });
                    console.log(`[${webhookId}] updateUserSubscription result:`, result);
                } else {
                    console.warn(`[${webhookId}] Missing userId or customerId`);
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                
                console.log(`[${webhookId}] invoice.paid - invoice_id: ${invoice.id}, customer_id: ${customerId}`);
                
                const subs = await base44.asServiceRole.entities.Subscription.filter({
                    stripe_customer_id: customerId
                });
                
                if (subs.length > 0) {
                    const sub = subs[0];
                    await base44.functions.invoke('updateUserSubscription', {
                        user_id: sub.user_id,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: sub.stripe_subscription_id,
                        subscription_status: 'active',
                        event_id: event.id
                    });
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.created': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                
                console.log(`[${webhookId}] ${event.type} - subscription_id: ${subscription.id}, customer_id: ${customerId}, status: ${subscription.status}`);
                
                const subs = await base44.asServiceRole.entities.Subscription.filter({
                    stripe_customer_id: customerId
                });
                
                let userId = null;
                if (subs.length > 0) {
                    userId = subs[0].user_id;
                } else {
                    userId = subscription.metadata?.user_id;
                }

                if (userId) {
                    // ステータスマッピング
                    let userStatus = subscription.status === 'active' ? 'active' : subscription.status;
                    
                    await base44.functions.invoke('updateUserSubscription', {
                        user_id: userId,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscription.id,
                        subscription_status: userStatus,
                        event_id: event.id
                    });

                    if (subscription.status === 'active') {
                        await base44.asServiceRole.entities.Event.create({
                            user_id: userId,
                            event_name: 'subscribe',
                            event_value: { subscription_id: subscription.id }
                        });
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                
                console.log(`[${webhookId}] customer.subscription.deleted - subscription_id: ${subscription.id}, customer_id: ${customerId}`);
                
                const subs = await base44.asServiceRole.entities.Subscription.filter({
                    stripe_customer_id: customerId
                });
                
                if (subs.length > 0) {
                    const sub = subs[0];
                    
                    await base44.functions.invoke('updateUserSubscription', {
                        user_id: sub.user_id,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscription.id,
                        subscription_status: 'canceled',
                        event_id: event.id
                    });
                    
                    await base44.asServiceRole.entities.Event.create({
                        user_id: sub.user_id,
                        event_name: 'cancel',
                        event_value: { subscription_id: subscription.id }
                    });
                }
                break;
            }
        }

        console.log(`[${webhookId}] Webhook processed successfully`);
        return Response.json({ received: true });
    } catch (error) {
        console.error(`[${webhookId}] Webhook error:`, error.message, error.stack);
        
        Sentry.captureException(error, {
            tags: {
                function: 'stripeWebhook',
                webhook_id: webhookId,
                error_type: 'webhook_processing'
            },
            extra: {
                webhook_id: webhookId,
                error_message: error.message
            }
        });
        
        await Sentry.flush(2000);
        
        return Response.json({ error: error.message }, { status: 400 });
    }
});