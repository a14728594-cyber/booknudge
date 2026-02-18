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

        const userProfile = user.profile_json || {};

        // 本候補を取得（20〜30冊程度）
        const bookCandidates = await base44.entities.Book.list('-google_ratings_count', 30);

        if (bookCandidates.length === 0) {
            return Response.json({ recommendations: [] });
        }

        const booksJson = bookCandidates.map(b => ({
            id: b.id,
            title: b.title,
            authors: b.authors,
            tags: b.tags,
            description: b.description
        }));

        const prompt = `あなたは本のレコメンドAIです。

【ユーザー情報】
目標: ${userProfile.goals || '未設定'}
制約: ${userProfile.constraints || '未設定'}
フォーカス領域: ${JSON.stringify(userProfile.focus_domains || [])}
ステージ: ${userProfile.stage || '未設定'}

【本候補】
${JSON.stringify(booksJson, null, 2)}

【タスク】
上記の本候補から、このユーザーに最適な10冊を選び、各本に短い理由（1行）をつけてください。

【出力形式（JSON）】
{
  "recommendations": [
    {
      "book_id": "本のID",
      "reason": "おすすめ理由1行"
    },
    ...（10冊）
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "あなたは本のレコメンド専門家です。必ずJSON形式で返してください。"
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
        console.error('Error generating recommendations:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});