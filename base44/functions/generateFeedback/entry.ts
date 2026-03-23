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

        const { question_text, slider_value, reason_text, label_left, label_right } = await req.json();

        const prompt = `あなたはビジネス学習アプリのフィードバック生成AIです。

【問題】
${question_text}
0側: ${label_left}
100側: ${label_right}

【ユーザーの回答】
スライダー値: ${slider_value}/100
理由: ${reason_text || 'なし'}

【フィードバックルール】
1. 正解は断定しない。どちらも正義のトレードオフとして扱う
2. 回答から「型」を診断する（型名1単語＋説明1行）
3. 0寄り（${label_left}）が強い条件3つ、100寄り（${label_right}）が強い条件3つを列挙
4. この回答の強み1行、落とし穴1行
5. 次の一手（5〜15分でできる具体的アクション1行）
6. 任意：その場の一言（マイクロスクリプト1行）

【出力形式（JSON）】
{
  "type_name": "型名（例: バランサー、攻めの戦略家）",
  "type_explain": "型の説明1行",
  "conditions_left": ["条件1", "条件2", "条件3"],
  "conditions_right": ["条件1", "条件2", "条件3"],
  "strength": "この回答の強み1行",
  "pitfall": "この回答の落とし穴1行",
  "next_action": "次の一手1行",
  "micro_script": "任意：その場の一言1行（なければ空文字）"
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "あなたはビジネスフィードバックの専門家です。必ずJSON形式で返してください。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const result = JSON.parse(response.choices[0].message.content);

        return Response.json(result);
    } catch (error) {
        console.error('Error generating feedback:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});