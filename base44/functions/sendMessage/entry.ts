import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversation_id, content } = await req.json();

        if (!conversation_id || !content) {
            return Response.json({ error: 'conversation_id and content are required' }, { status: 400 });
        }

        // 文字数チェック
        if (content.length < 1 || content.length > 300) {
            return Response.json({ error: 'Content must be 1-300 characters' }, { status: 400 });
        }

        // 会話の取得
        const conversations = await base44.entities.Conversation.filter({ id: conversation_id });
        if (conversations.length === 0) {
            return Response.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const conversation = conversations[0];
        const other_user_id = conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id;

        // ブロックチェック
        const blocks = await base44.entities.Block.filter({});
        const isBlocked = blocks.some(b => 
            (b.blocker_user_id === user.id && b.blocked_user_id === other_user_id) ||
            (b.blocker_user_id === other_user_id && b.blocked_user_id === user.id)
        );

        if (isBlocked) {
            return Response.json({ error: 'Cannot message blocked user' }, { status: 403 });
        }

        // メッセージ作成
        const message = await base44.entities.Message.create({
            conversation_id,
            sender_id: user.id,
            content: content.trim()
        });

        // 会話の最終メッセージ時刻を更新
        await base44.entities.Conversation.update(conversation_id, {
            last_message_at: new Date().toISOString()
        });

        await base44.functions.invoke('trackEvent', {
            event_name: 'dm_send',
            event_value: { conversation_id, other_user_id }
        });

        return Response.json({ message });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});