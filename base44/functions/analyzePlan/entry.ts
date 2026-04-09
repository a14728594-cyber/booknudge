import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { stage, genre, plan } = await req.json();

    const stageLabel = stage === 'cafe' ? 'カフェ' : stage;
    const genreLabel = genre === 'marketing' ? 'マーケティング' : genre;

    const prompt = `
あなたは事業・マーケティング・ブランディングの現場を20年以上経験した、辛口の事業プロです。
生半可な企画には高得点を出しません。以下の${stageLabel}の${genreLabel}企画を、5つの評価軸で厳しく採点してください。

【評価姿勢】
- 褒めすぎない。項目が埋まっていても、内容が薄ければ低得点。
- 「それっぽい言葉」「ふんわりした差別化」には点を与えない。
- 80点以上は、現実市場でも十分戦える企画だけに与える。
- 普通の案は50〜65点程度。少し具体的でも70点どまり。
- 差別化・価格の納得感・実際の行動につながる強さには特に厳しくする。
- 「なぜこれを買うのか」「なぜここでなければならないのか」が明確でない企画は必ず減点。

【企画内容】
- ターゲット: ${plan.target}
- 商品・サービス: ${plan.product}
- 価格: ${plan.price}
- 告知・宣伝方法: ${plan.promotion}
- この店ならではの価値: ${plan.unique_value}

【評価軸（各20点満点、合計100点）】
1. target_clarity: ターゲットの解像度（「誰に」が現実の人物像として具体的か。「20代女性」程度では低い）
2. value_clarity: 価値の訴求力（何が魅力かが一瞬で伝わるか。抽象的な言葉は減点）
3. price_reasonability: 価格の納得感（ターゲットの財布感覚・心理的価値と合っているか）
4. differentiation: 差別化の実質（「こだわり」「丁寧」「高品質」は差別化ではない。具体的に他とどう違うか）
5. action_strength: 行動喚起力（「行ってみたい」「買いたい」と思わせるリアルな強さがあるか）

【weakness_tagsの候補】
"target_unclear", "target_too_broad", "value_not_clear", "price_too_high", "price_justification_weak", "no_differentiation", "weak_promotion", "unique_value_missing", "action_trigger_weak"

【想定顧客の反応（10人中）】
この企画を実際の市場に出した場合、想定顧客10人のうち何人が入店・関心を示して立ち止まり・スルーするかを、厳しくリアルに想定して返してください。
甘く見積もらないこと。total_customers は常に10にしてください。

【strength_hint】
ログイン前に見せる「強みのヒント」を1文で（具体的だが詳細は隠す）。
例：「ターゲット設定はかなり具体的です」

【summary】
全体の総評を2〜3文で（ログイン後に表示）。良い点と問題点の両方に触れ、辛口かつ建設的に。

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