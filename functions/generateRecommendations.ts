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

        // 本を多めに取得
        const allBooks = await base44.entities.Book.list('-google_ratings_count', 300);

        if (allBooks.length === 0) {
            return Response.json({ recommendations: [] });
        }

        // pain_pointsがある本を優先、なければ全体から使う
        const booksWithPainPoints = allBooks.filter(b => b.pain_points?.length > 0);
        const bookPool = booksWithPainPoints.length >= 20 ? booksWithPainPoints : allBooks;

        // 診断の回答テキストを取得
        const answerTexts = latestSession ? (latestSession.answers || []).map(a => a.option_text) : [];
        const genre = latestSession?.genre || '';
        const problem = latestSession?.problem || '';

        // 診断結果をテキスト化
        const diagnosisText = latestSession
            ? `ジャンル: ${genre}
悩みカテゴリ: ${problem}
回答した選択肢（ユーザーの具体的な悩み・状況）:
${answerTexts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`
            : '診断未実施';

        // トークン節約のため各本のデータを必要最小限に絞る
        const booksJson = bookPool.map(b => ({
            id: b.id,
            title: b.title,
            tags: b.tags || [],
            one_liner: b.one_liner || '',
            pain_points: b.pain_points || [],
            outcomes: b.outcomes || [],
            not_for: b.not_for || []
        }));

        const prompt = `あなたは本のレコメンド専門家AIです。

【ユーザーが診断で選んだ回答（＝ユーザーの具体的な悩み・状況）】
${diagnosisText}

【本候補リスト（${booksJson.length}冊）】
${JSON.stringify(booksJson, null, 2)}

【マッチングルール】
1. ユーザーの「回答した選択肢」のテキストと、各本の「pain_points（こんな悩みの人におすすめ）」を意味的に照合する。内容が近い本を優先する。
2. 「outcomes（読んだ後こうなれる）」がユーザーの悩みの解決につながるかを確認する。
3. 「one_liner」「tags」も参考にして総合的に判断する。
4. 「not_for」にユーザーの状況が当てはまる本は除外する。
5. ジャンル「${genre}」に無関係な本は優先度を下げる。
6. 文字列の完全一致ではなく、意味・文脈の類似度で判断する。

最もマッチ度の高い10冊を順番に選び、「ユーザーのどの回答（悩み）」と「本のどのpain_points」が合致したかを具体的に1行で日本語で説明してください。

【出力形式（JSON）】
{
  "recommendations": [
    {
      "book_id": "本のID",
      "reason": "おすすめ理由1行（ユーザーの具体的な悩みと、この本がどう応えるかを明確に）"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
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