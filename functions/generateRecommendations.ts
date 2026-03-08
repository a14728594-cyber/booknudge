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
            tags: b.tags || [],
            description: b.description || '',
            one_liner: b.one_liner || '',
            pain_points: b.pain_points || [],
            outcomes: b.outcomes || [],
            not_for: b.not_for || []
        }));

        // 診断の回答テキストを取得
        const answerTexts = latestSession ? (latestSession.answers || []).map(a => a.option_text) : [];

        // 診断結果をテキスト化
        const diagnosisText = latestSession
            ? `ジャンル: ${latestSession.genre || '未設定'}
悩みカテゴリ: ${latestSession.problem || '未設定'}
回答した選択肢（ユーザーの悩みの具体的な内容）:
${answerTexts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`
            : '診断未実施';

        const prompt = `あなたは本のレコメンド専門家AIです。

【ユーザーが診断で選んだ回答（＝ユーザーの具体的な悩み）】
${diagnosisText}

【本候補リスト】
${JSON.stringify(booksJson, null, 2)}

【マッチングルール】
1. ユーザーの「回答した選択肢」のテキストと、各本の「pain_points（こんな悩みの人におすすめ）」を意味的に照合する。内容が近い本を優先する。
2. 次に「outcomes（読んだ後こうなれる）」がユーザーの悩みの解決につながるかを確認する。
3. 「description」「one_liner」も参考にして総合的に判断する。
4. 「not_for」にユーザーの状況が当てはまる本は除外する。
5. 文字列の完全一致ではなく、意味・文脈の類似度で判断する。

最もマッチ度の高い10冊を順番に選び、「ユーザーのどの回答（悩み）」と「本のどのpain_points」が合致したかを具体的に1行で説明してください。

【出力形式（JSON）】
{
  "recommendations": [
    {
      "book_id": "本のID",
      "reason": "おすすめ理由1行（例：「〇〇〇という悩みに対して、この本は△△△という観点で直接応えています」）"
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