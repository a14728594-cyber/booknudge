import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const mode = Deno.env.get('STRIPE_MODE') || 'test';
    const isLive = mode === 'live';

    const secretKey = isLive
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');
    const webhookSecret = isLive
      ? Deno.env.get('STRIPE_WEBHOOK_SECRET_LIVE')
      : Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
    const priceId = isLive
      ? Deno.env.get('STRIPE_PRICE_ID_LIVE')
      : Deno.env.get('STRIPE_PRICE_ID_TEST');

    // prefix only - never expose full keys
    const secretKeyPrefix = secretKey ? secretKey.substring(0, 14) + '...' : 'NOT_SET';
    const webhookPrefix = webhookSecret ? webhookSecret.substring(0, 12) + '...' : 'NOT_SET';

    // 最新checkout event (session_id持ち)
    const allEvents = await base44.asServiceRole.entities.Event.filter(
      { event_name: 'subscribe' },
      '-created_date',
      1
    ).catch(() => []);
    const lastCheckoutEvent = allEvents[0] || null;

    // 最新webhook受信履歴 (ProcessedEvent)
    const webhookHistory = await base44.asServiceRole.entities.ProcessedEvent.list(
      '-created_date',
      10
    ).catch(() => []);

    // DB有料ユーザー数
    const allSubs = await base44.asServiceRole.entities.Subscription.filter(
      { status: 'active' }
    ).catch(() => []);

    // 直近のverify試行 (checkout_success event)
    const verifyEvents = await base44.asServiceRole.entities.Event.filter(
      { event_name: 'checkout_success' },
      '-created_date',
      1
    ).catch(() => []);
    const lastVerifyEvent = verifyEvents[0] || null;

    return Response.json({
      stripe_mode: mode,
      secret_key_prefix: secretKeyPrefix,
      webhook_secret_prefix: webhookPrefix,
      price_id: priceId || 'NOT_SET',
      last_checkout_session_id: lastCheckoutEvent?.event_value?.session_id || null,
      last_checkout_at: lastCheckoutEvent?.created_date || null,
      last_verify: lastVerifyEvent ? {
        ok: true,
        timestamp: lastVerifyEvent.created_date,
        reason: 'checkout_success event found'
      } : {
        ok: false,
        timestamp: null,
        reason: 'No checkout_success event found'
      },
      webhook_history: webhookHistory.map(e => ({
        id: e.id,
        stripe_event_id: e.stripe_event_id,
        event_type: e.event_type,
        status: e.status,
        error_message: e.error_message || null,
        timestamp: e.created_date
      })),
      active_subscriptions_count: allSubs.length,
    });
  } catch (error) {
    console.error('[adminBillingStatus] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});