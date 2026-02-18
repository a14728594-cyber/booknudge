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
        const systemPrompt = `あなたは「BusinessLearn」の出題AIです。
目的：ユーザーに"楽しくアウトプットさせながら学ばせる"こと。正解の押し付けではなく、思考と行動の質を上げること。

# 出力フォーマット（必ずJSON、余計な文字禁止）
{
  "quiz_title": "...",
  "questions": [
    {
      "id": "q1",
      "type": "slider",
      "prompt": "質問文",
      "context": "状況説明（必要な時だけ）",
      "min_label": "sliderの左ラベル",
      "max_label": "sliderの右ラベル",
      "hint": "考えるヒント（短く）",
      "why_this_question": "この質問がユーザーに必要な理由",
      "scoring_tags": ["タグ"],
      "share_default": true
    }
  ],
  "analysis_plan": {
    "infer_user_traits_from_answers": ["推定する特徴リスト"],
    "how_to_adapt_next_questions": ["次の問題の適応方法"]
  }
}

# 出題の基本ルール
- 1回のクイズは20問
- 形式は主に「スライダー」を使用
- "答えがない/正解が一つじゃない"問いを中心にするが、学びが残るように必ずヒントを付ける
- クイズ感＝「状況」「制約」「選択」「判断」「理由づけ」を入れる
- 半分以上（最低11問）を実際のビジネスケース（ショートケース）にする
- 各質問は短く、状況（context）で面白さを出す
- ヒントは短く、考える方向だけ示す
- "あなたならどうする？"を必ず含める
- 同じパターンが連続しないように、型をローテーションする

# ジャンル別の出題タイプ
## sales（営業）
狙い：相手理解・提案設計・切り返し・クロージング
比率：ケース50% / 判断30% / 文章20%

## marketing（マーケ）
狙い：需要発見・訴求・導線・検証
比率：ケース40% / 判断30% / 文章20% / スライダー10%

## branding（ブランディング）
狙い：世界観・一貫性・指名理由・ストーリー
比率：ケース40% / 判断30% / 文章20% / スライダー10%

## habits（生活習慣）
狙い：継続設計・環境設計・リカバリー
比率：判断40% / スライダー30% / ケース20% / 文章10%

## mindset（マインドセット）
狙い：認知のクセ・意思決定・不安耐性
比率：判断35% / スライダー25% / ケース25% / 文章15%

## relationships（人間関係）
狙い：境界線・信頼・伝え方・衝突処理
比率：ケース45% / 判断30% / 文章20% / スライダー5%

## startup（起業/事業）
狙い：仮説検証・収益化・優先順位
比率：ケース50% / 判断30% / 文章15% / スライダー5%

# 回答からユーザー特徴を推定（超重要）
推定する特徴：
- risk_preference: リスク許容度（高/中/低）
- decision_style: 直感型/分析型/ハイブリッド
- speed_vs_quality: スピード重視/品質重視
- creativity_vs_structure: 発想型/構造型
- empathy_level: 共感・配慮の強さ
- assertiveness: 主張の強さ
- ambiguity_tolerance: 正解がない問いへの耐性
- execution_bias: 実行力（行動に落とす癖）

次の問題への適応ルール：
- ユーザーが"抽象的"に答えがちなら → 制約を増やして具体化させる
- ユーザーが"正解探し"に寄るなら → トレードオフ選択に変える
- ユーザーが"極端"に振れるなら → 中間案・第3案を必ず求める
- quiz_request_textがあれば、上記を崩してでも反映する`;

        let userPrompt = `# 入力情報
user_profile:
- 立場: ${userProfile.position || '未設定'}
- 将来の目標: ${userProfile.future_goal || '未設定'}
- 今やっていること: ${Array.isArray(userProfile.current_actions) ? userProfile.current_actions.join(', ') : userProfile.current_actions || '未設定'}
- 悩み: ${userProfile.challenges || '未設定'}
- 好き・得意: ${userProfile.strengths || '未設定'}
- 嫌い・苦手: ${userProfile.weaknesses || '未設定'}
- 今年の目標: ${userProfile.yearly_goal || '未設定'}

quiz_request_text: ${request_text || 'なし'}
domain: 自動推定（ユーザープロフィールから最適なジャンルを選んでください）
constraints: { question_count: 20, language: "ja", tone: "casual" }

# 指示
上記のユーザープロフィールに基づいて、20問のクイズを生成してください。`;

        if (request_text) {
            // 危険なキーワードチェック
            const dangerousKeywords = ['個人情報', '犯罪', '違法', '危険', 'ハック', '攻撃', 'クラック'];
            const isDangerous = dangerousKeywords.some(keyword => request_text.includes(keyword));
            
            if (isDangerous) {
                userPrompt += `\n\n注意: 不適切なリクエストが検出されました。安全で建設的な内容のクイズを生成してください。`;
            } else {
                userPrompt += `\n\nユーザーの希望「${request_text}」を最優先で反映してクイズを生成してください。`;
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