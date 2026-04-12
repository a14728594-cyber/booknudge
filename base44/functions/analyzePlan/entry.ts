import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { stage, genre, plan } = await req.json();

    const stageLabel = stage === 'cafe' ? 'カフェ' : stage;
    const genreLabel = genre === 'marketing' ? 'マーケティング' : genre;

    const prompt = `
あなたは事業・マーケティング・ブランディングの現場で20年以上、幾多の失敗企画を見てきた辛口のプロです。
甘い採点は一切しません。以下の${stageLabel}の${genreLabel}企画を、現実市場の目線で容赦なく採点してください。

【絶対に守る採点原則】
① 無難・当たり障りのない回答は30点以下。「なんとなく良さそう」は0点に等しい。
② 「子育て中の女性」「近隣の会社員」「健康意識の高い人」など曖昧なターゲットは target_clarity を3点以下にする。
   具体的な人物像（年齢・職業・状況・悩み・行動パターン）が書かれていない限り加点しない。
③ 「こだわり」「丁寧」「高品質」「本格的」「癒し」「コスパ最高」は差別化ではない。differentiation は2点以下。
④ AIが生成したような綺麗にまとまった文章・ビジネス書的な定型文は全軸で-2点。
⑤ 具体的な数字（価格・頻度・人数・時間・距離・比率）が1つも出てこない企画はスコア合計40点以下にすること。
⑥ 高得点（70点以上）を取るには：独自の切り口、競合にない具体的な仕組み、数字の裏付け、の3つ全部が必要。
⑦ 「誰もが思いつく答え」「一般論を並べただけ」は各軸5点以下。
⑧ スコアは忖度なし。社交辞令的な加点は厳禁。100点中平均40〜55点が正常な分布。

【企画内容】
- ターゲット: ${plan.target}
- 商品・サービス: ${plan.product}
- 価格: ${plan.price}
- 告知・宣伝方法: ${plan.promotion}
- この店ならではの価値: ${plan.unique_value}

【評価軸（各20点満点、合計100点）】
1. target_clarity: ターゲットの解像度
   - 0〜4点：「女性」「会社員」「健康志向」など属性を並べただけ
   - 5〜9点：年代と職業程度はある。しかしその人の「今の悩み」「行動パターン」がない
   - 10〜14点：具体的な状況や悩みがあるが、なぜそこに来るかの必然性が弱い
   - 15〜20点：実在する特定の人物像、行動パターン、その人がここを選ぶ理由が明確

2. value_clarity: 価値の訴求力
   - 0〜4点：「おいしい」「癒される」「居心地いい」などふんわりした表現のみ
   - 5〜9点：他の店でも言えることしか書いていない
   - 10〜14点：差別化につながる要素はあるが伝わり方が弱い
   - 15〜20点：ここだけの価値が一言で刺さる言葉・仕組みとして表現されている

3. price_reasonability: 価格の納得感
   - 0〜4点：価格の記載なし、または相場から大きくズレていて根拠が不明
   - 5〜9点：価格はあるが根拠・心理的価値が伝わらない
   - 10〜14点：ある程度妥当だが、価格を正当化するストーリーが弱い
   - 15〜20点：価格とターゲットの財布感覚・提供価値が見事にマッチしており納得感がある

4. differentiation: 差別化の実質
   - 0〜4点：「こだわり」「丁寧」「高品質」「本格的」のみ
   - 5〜9点：差別化の意図はわかるが競合でもできること
   - 10〜14点：一定の独自性はあるが模倣しやすい
   - 15〜20点：競合が簡単に真似できない仕組み・資源・ストーリーに基づく差別化

5. action_strength: 行動喚起力
   - 0〜4点：「来てね」「SNS発信します」レベル
   - 5〜9点：告知手段はあるが「今すぐ行きたい」と思わせる仕掛けがない
   - 10〜14点：行動に繋がりそうな要素はあるが強さが弱い
   - 15〜20点：ターゲットが「これは自分のことだ」と感じすぐ行動できるトリガーがある

【weakness_tagsの候補（該当するもの全部選ぶ）】
"target_unclear", "target_too_broad", "value_not_clear", "price_too_high", "price_justification_weak", "no_differentiation", "weak_promotion", "unique_value_missing", "action_trigger_weak"

【想定顧客の反応（100人中）】
enter の人数 ≈ スコア合計点（例：合計45点なら enter=45）。甘く見積もらないこと。
total_customers は常に100にしてください。

【strength_hint】
ログイン前に見せる「強みのヒント」を1文で。良い点がなければ正直に「惜しい部分あり」と書く。

【one_line_comment】
辛口の一言コメントを15字以内で（例：「ターゲットが全員になってる」「価格だけが取り柄」）。

【summary】
全体の総評を2〜3文で。問題点を先に、良い点を後に。辛口かつ建設的に。

【recommended_books】
この企画の採点結果・弱点・得点レベルに応じて、実在するビジネス書・マーケティング書を3冊推薦してください。
- スコアが低い（〜49点）ほど基礎的な本（マーケティング入門、顧客理解の基礎など）
- 中程度（50〜69点）は実践的な本（ポジショニング戦略、ターゲット設定の実践など）
- 高得点（70点以上）は応用・専門的な本（差別化戦略の深化、ブランド構築の高度理論など）
各冊について：title（書名）、author（著者名）、why（なぜ今のあなたにこの本が必要か・20字以内）を返してください。
実在する本のみ。架空の本は絶対に出さないこと。著者名も正確に。

【recommended_cases】
入力された業種・ターゲット・企画内容に近い実在のビジネス成功事例を2件 + 失敗事例1件、計3件を返してください。
各事例について：
- company: 企業名またはサービス名（実在するもの）
- title: 事例の一言タイトル
- similarity: この企画と「どこが似ているか」（1文）
- lesson: 「何を参考にすべきか」または失敗事例は「何をやったら死ぬか」（1文・辛口で）
- is_failure: true=失敗事例 / false=成功事例
成功事例は参考になるリアルな事例、失敗事例は同じ業種・ターゲットで実際に起きた失敗を選んでください。

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
          one_line_comment:    { type: "string" },
          summary:             { type: "string" },
          customer_reaction: {
            type: "object",
            properties: {
              total_customers: { type: "number" },
              enter:           { type: "number" },
              stop:            { type: "number" },
              pass:            { type: "number" }
            }
          },
          recommended_books: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title:  { type: "string" },
                author: { type: "string" },
                why:    { type: "string" }
              }
            }
          },
          recommended_cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company:    { type: "string" },
                title:      { type: "string" },
                similarity: { type: "string" },
                lesson:     { type: "string" },
                is_failure: { type: "boolean" }
              }
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