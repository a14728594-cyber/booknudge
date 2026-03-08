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

        // 診断セッション結果を取得
        const sessions = await base44.entities.DiagnosisSession.filter({ user_id: user.id, is_latest: true }, '-created_date', 5);
        const latestSession = sessions[0];

        // 本候補を取得（多めに取って絞り込む）
        const bookCandidates = await base44.entities.Book.list('-google_ratings_count', 60);

        if (bookCandidates.length === 0) {
            return Response.json({ recommendations: [] });
        }

        const booksJson = bookCandidates.map(b => ({
            id: b.id,
            title: b.title,
            tags: b.tags,
            description: b.description || '',
            pain_points: b.pain_points || [],
            outcomes: b.outcomes || [],
            not_for: b.not_for || []
        }));

        // 診断結果をテキスト化
        const diagnosisText = latestSession
            ? `ジャンル: ${latestSession.genre || '未設定'}
悩みカテゴリ: ${latestSession.problem || '未設定'}
診断スコア: ${JSON.stringify(latestSession.result_tags || [])}
回答内容: ${(latestSession.answers || []).map(a => a.option_text).join('、')}`
            : '診断未実施';

        const prompt = `あなたは本のレコメンド専門家AIです。

【ユーザーの診断結果】
${diagnosisText}

【ユーザープロフィール】
目標: ${userProfile.goals || '未設定'}
フォーカス領域: ${JSON.stringify(userProfile.focus_domains || [])}

【本候補リスト】
${JSON.stringify(booksJson, null, 2)}

【タスク】
ユーザーの診断結果・悩み・目標と、各本の「pain_points（こんな悩みの人におすすめ）」「outcomes（読んだ後こうなれる）」「description（説明文）」を意味的に照合してください。
文字列の一致ではなく、内容・意味の類似度で判断してください。
また「not_for」に該当するユーザーへの本は除外してください。

最適な10冊を選び、なぜこのユーザーに合うかを具体的に1行で説明してください。

【出力形式（JSON）】
{
  "recommendations": [
    {
      "book_id": "本のID",
      "reason": "おすすめ理由1行（ユーザーの悩みと本のpain_points/outcomesがどう合うかを具体的に）"
    }
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