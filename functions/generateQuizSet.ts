import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

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

        const { request_text } = await req.json();

        // ユーザーのプロフィール情報を取得
        const users = await base44.entities.User.filter({ id: user.id });
        const userProfile = users[0]?.profile_json || {};

        // 既存のアクティブなクイズセットを非アクティブ化
        const activeQuizSets = await base44.entities.QuizSet.filter({
            user_id: user.id,
            is_active: true
        });
        for (const quizSet of activeQuizSets) {
            await base44.entities.QuizSet.update(quizSet.id, { is_active: false });
        }

        // GPTプロンプト構築
        const systemPrompt = `あなたはビジネスパーソン向けの学習支援AIです。
ユーザーのプロフィールと希望に基づいて、20問のクイズセットを生成してください。

【形式要件】
- 全問スライダー形式（0-100）
- 半分以上（最低11問）を実際のビジネスケース（ショートケース）にする
- 正解を断定せず、トレードオフや状況依存の判断を促す設計にする
- 各質問には question_text, case_study（ケースの場合）, slider_label_left, slider_label_right を含める

【出力形式】
JSON配列で20個の質問オブジェクトを返してください。
[
  {
    "question_text": "質問文",
    "case_study": "ケーススタディの説明（該当する場合）",
    "slider_label_left": "0の時のラベル",
    "slider_label_right": "100の時のラベル",
    "is_case_study": true/false
  },
  ...
]`;

        let userPrompt = `【ユーザープロフィール】
立場: ${userProfile.position || '未設定'}
将来の目標: ${userProfile.future_goal || '未設定'}
今やっていること: ${userProfile.current_actions || '未設定'}
悩み: ${userProfile.challenges || '未設定'}
好き・得意: ${userProfile.strengths || '未設定'}
嫌い・苦手: ${userProfile.weaknesses || '未設定'}
今年の目標: ${userProfile.yearly_goal || '未設定'}`;

        if (request_text) {
            // 危険なキーワードチェック
            const dangerousKeywords = ['個人情報', '犯罪', '違法', '危険', 'ハック', '攻撃'];
            const isDangerous = dangerousKeywords.some(keyword => request_text.includes(keyword));
            
            if (isDangerous) {
                userPrompt += `\n\n【ユーザーの希望】
安全で建設的な内容のクイズを生成してください。`;
            } else {
                userPrompt += `\n\n【ユーザーの希望】
${request_text}
この希望を最優先で反映してクイズを生成してください。`;
            }
        }

        // GPT呼び出し
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        const parsed = JSON.parse(content);
        const questions = parsed.questions || parsed;

        // 新しいクイズセットを作成
        const quizSet = await base44.entities.QuizSet.create({
            user_id: user.id,
            title: request_text ? `カスタム: ${request_text.substring(0, 30)}` : '初回クイズ',
            request_text: request_text || null,
            is_active: true
        });

        // 質問を保存
        const questionPromises = questions.map((q, index) => 
            base44.entities.QuizQuestion.create({
                quiz_set_id: quizSet.id,
                question_json: q,
                order_index: index
            })
        );
        await Promise.all(questionPromises);

        return Response.json({
            success: true,
            quiz_set_id: quizSet.id,
            question_count: questions.length
        });

    } catch (error) {
        console.error('Quiz generation error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});