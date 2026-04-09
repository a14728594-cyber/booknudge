import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { stage, genre, plan } = await req.json();

    const stageLabel = stage === 'cafe' ? 'カフェ' : stage;
    const genreLabel = genre === 'marketing' ? 'マーケティング' : genre;

    const prompt = `
あなたはビジネス企画の審査員です。
以下の${stageLabel}の${genreLabel}企画を、5つの評価軸で採点し、構造化して返してください。

【企画内容】
- ターゲット: ${plan.target}
- 商品・サービス: ${plan.product}
- 価格: ${plan.price}
- 告知・宣伝方法: ${plan.promotion}
- この店ならではの価値: ${plan.unique_value}

【評価軸（各20点満点、合計100点）】
1. target_clarity: ターゲットの明確さ（誰に売るかが具体的か）
2. value_clarity: 価値の伝わりやすさ（何が魅力かが伝わるか）
3. price_reasonability: 価格の納得感（ターゲットに合った価格か）
4. differentiation: 差別化（他と違う点があるか）
5. action_strength: 行動したくなる強さ（買いたい・来たいと思えるか）

【weakness_tagsの候補】
"target_unclear", "target_too_broad", "value_not_clear", "price_too_high", "price_justification_weak", "no_differentiation", "weak_promotion", "unique_value_missing", "action_trigger_weak"

【AI客の反応（10人中）】
ユーザーの企画に対してリアルな客の反応を想定し、何人が入店・立ち止まり・スルーするかを返してください。
total_customers は常に10にしてください。

【strength_hint】
ログイン前に見せる「強みのヒント」を1文で（具体的だが詳細は隠す）。
例：「ターゲット設定はかなり具体的です」

【summary】
全体の一言総評を2〜3文で（ログイン後に表示）。

必ず日本語で返してください。
`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          scores: {
            type: "object",
            properties: {
              target_clarity:      { type: "number" },
              value_clarity:       { type: "number" },
              price_reasonability: { type: "number" },
              differentiation:     { type: "number" },
              action_strength:     { type: "number" }
            }
          },
          strength_hint:       { type: "string" },
          hidden_weakness_tag: { type: "string" },
          weakness_tags:       { type: "array", items: { type: "string" } },
          summary:             { type: "string" },
          customer_reaction: {
            type: "object",
            properties: {
              total_customers: { type: "number" },
              enter:           { type: "number" },
              stop:            { type: "number" },
              pass:            { type: "number" }
            }
          }
        }
      }
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});