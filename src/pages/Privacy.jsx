import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <Link 
                    to={createPageUrl('landing')}
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    トップに戻る
                </Link>

                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>
                    
                    <div className="space-y-6 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 収集する情報</h2>
                            <p className="mb-2">当サービスは、以下の情報を収集します：</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>メールアドレス、氏名などの登録情報</li>
                                <li>クイズの回答データ、プロフィール情報</li>
                                <li>サービス利用履歴、アクセスログ</li>
                                <li>決済情報（Stripeを通じて処理）</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 情報の利用目的</h2>
                            <p className="mb-2">収集した情報は以下の目的で利用します：</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>サービスの提供・運営</li>
                                <li>パーソナライズされた推薦・マッチング機能の提供</li>
                                <li>ユーザーサポート対応</li>
                                <li>サービス改善のための分析</li>
                                <li>規約違反への対応</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 情報の共有</h2>
                            <p>
                                当サービスは、法令に基づく場合を除き、ユーザーの同意なく第三者に個人情報を提供しません。
                                ただし、サービス提供に必要な範囲で、以下のサービスと情報を共有します：
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                                <li>Stripe（決済処理）</li>
                                <li>OpenAI（AIクイズ生成）</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cookie・トラッキング</h2>
                            <p>
                                当サービスは、ユーザー体験の向上とサービス分析のためにCookieを使用します。
                                ブラウザの設定でCookieを無効化できますが、一部機能が利用できなくなる場合があります。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. データの保護</h2>
                            <p>
                                当サービスは、適切な技術的・組織的対策を講じて、個人情報の紛失、破壊、改ざん、漏洩などを防止します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. ユーザーの権利</h2>
                            <p className="mb-2">ユーザーは以下の権利を有します：</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>自身の個人情報の開示請求</li>
                                <li>個人情報の訂正・削除の要求</li>
                                <li>サービス利用の停止・退会</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. お問い合わせ</h2>
                            <p>
                                個人情報の取り扱いに関するご質問は、サービス内のお問い合わせフォームからご連絡ください。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. プライバシーポリシーの変更</h2>
                            <p>
                                当サービスは、必要に応じて本ポリシーを変更することがあります。
                                変更後のポリシーは、当サービス上に掲載した時点で効力を生じます。
                            </p>
                        </section>

                        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
                            <p>制定日：2026年2月19日</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}