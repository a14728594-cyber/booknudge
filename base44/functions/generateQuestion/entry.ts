import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.52.0';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { domain } = await req.json();

        if (!domain || !['sales', 'marketing', 'relationships', 'mindset', 'habits'].includes(domain)) {
            return Response.json({ error: 'Invalid domain' }, { status: 400 });
        }

        // ユーザープロフィールと直近の回答を取得
        const userProfile = user.profile_json || {};
        const recentAnswers = await base44.entities.Answer.filter(
            { user_id: user.id },
            '-created_date',
            5
        );

        const prompt = `あなたはビジネス学習アプリの問題作成AIです。

【ジャンル】${domain}
【ユーザー情報】
目標: ${userProfile.goals || '未設定'}
制約: ${userProfile.constraints || '未設定'}
フォーカス領域: ${JSON.stringify(userProfile.focus_domains || [])}
ステージ: ${userProfile.stage || '未設定'}

【直近の回答履歴】
${recentAnswers.map(a => `Q: ${a.question_text}\n回答: ${a.slider_value}/100 (${a.reason_text || ''})`).join('\n\n')}

【出題ルール】
1. スライダー形式（0〜100）で、0側と100側は必ず「どちらも正義」のトレードオフにする
2. 正解は存在しない。どちらを選んでも強みと落とし穴がある
3. 問題文は最大3行、具体的なシチュエーション
4. ユーザープロフィールまたは直近回答を必ず1つ以上反映させて「あなた専用」感を出す

【出力形式（JSON）】
{
  "question_id": "ユニークID（例: sales_001）",
  "question_text": "問題文（最大3行）",
  "label_left": "0側のラベル（例: 短期で売上）",
  "label_right": "100側のラベル（例: 長期で信頼）",
  "domain": "${domain}"
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "あなたはビジネス問題作成の専門家です。必ずJSON形式で返してください。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const result = JSON.parse(response.choices[0].message.content);

        return Response.json(result);
    } catch (error) {
        console.error('Error generating question:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});