import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { other_user_id } = await req.json();

        if (!other_user_id) {
            return Response.json({ error: 'other_user_id is required' }, { status: 400 });
        }

        // 相互フォローチェック
        const followingCheck = await base44.entities.Follow.filter({
            follower_user_id: user.id,
            following_user_id: other_user_id
        });
        const followerCheck = await base44.entities.Follow.filter({
            follower_user_id: other_user_id,
            following_user_id: user.id
        });

        if (followingCheck.length === 0 || followerCheck.length === 0) {
            return Response.json({ error: 'Mutual follow required' }, { status: 403 });
        }

        // ブロックチェック
        const blocks = await base44.entities.Block.filter({});
        const isBlocked = blocks.some(b => 
            (b.blocker_user_id === user.id && b.blocked_user_id === other_user_id) ||
            (b.blocker_user_id === other_user_id && b.blocked_user_id === user.id)
        );

        if (isBlocked) {
            return Response.json({ error: 'Cannot message blocked user' }, { status: 403 });
        }

        // 既存の会話を探す
        const conversations = await base44.entities.Conversation.filter({});
        const existingConversation = conversations.find(c =>
            (c.user1_id === user.id && c.user2_id === other_user_id) ||
            (c.user1_id === other_user_id && c.user2_id === user.id)
        );

        if (existingConversation) {
            return Response.json({ conversation_id: existingConversation.id });
        }

        // 新規会話を作成
        const newConversation = await base44.entities.Conversation.create({
            user1_id: user.id,
            user2_id: other_user_id,
            last_message_at: new Date().toISOString()
        });

        await base44.functions.invoke('trackEvent', {
            event_name: 'dm_conversation_create',
            event_value: { other_user_id }
        });

        return Response.json({ conversation_id: newConversation.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});