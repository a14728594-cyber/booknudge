import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      event_name,
      anonymous_id,
      session_id,
      page_path,
      referrer_url,
      user_agent,
      utm_source,
      utm_medium,
      utm_campaign,
      device_type,
      event_value,
    } = body;

    // ログイン済みユーザーのIDを取得（未ログインでもOK）
    let user_id = undefined;
    try {
      const user = await base44.auth.me();
      if (user) {
        user_id = user.id;

        // ログイン時にanonymous_idを紐付け（まだ保存されていない場合）
        if (anonymous_id && !user.anonymous_id) {
          base44.auth.updateMe({ anonymous_id }).catch(() => {});
        }
      }
    } catch {
      // 未ログインは正常
    }

    // イベント記録（サービスロールで書き込み）
    await base44.asServiceRole.entities.Event.create({
      event_name,
      user_id,
      anonymous_id,
      session_id,
      page_path,
      referrer_url,
      user_agent,
      utm_source,
      utm_medium,
      utm_campaign,
      device_type,
      event_value: event_value || {},
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('trackAnonymousEvent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});