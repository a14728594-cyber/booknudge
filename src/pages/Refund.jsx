import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Refund() {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">返金・キャンセル・解約ポリシー</h1>
                    
                    <div className="space-y-6 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. サブスクリプションの解約</h2>
                            <p className="mb-2">
                                プレミアムプランはいつでも解約可能です。解約方法は以下の通りです：
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>サービス内のプロフィール画面から「サブスクリプション管理」にアクセス</li>
                                <li>「解約する」ボタンをクリック</li>
                                <li>解約は即座に反映され、次回更新日以降は課金されません</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 解約時のサービス利用</h2>
                            <p>
                                解約手続き後も、現在の課金期間終了まではプレミアム機能をご利用いただけます。
                                期間終了後、自動的に無料プランに移行します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 返金について</h2>
                            <p className="mb-2">
                                デジタルコンテンツの性質上、以下の通り対応いたします：
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>原則として、すでにお支払いいただいた料金の返金は行いません</li>
                                <li>日割り計算による返金は行いません</li>
                                <li>技術的な問題で長期間サービスが利用できなかった場合など、特別な事情がある場合のみ個別に対応を検討します</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 自動更新について</h2>
                            <p>
                                プレミアムプランは月額課金の自動更新制です。
                                解約手続きをしない限り、毎月自動的に更新され、登録されたクレジットカードに課金されます。
                                更新日の変更や請求に関するご質問は、お問い合わせフォームからご連絡ください。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 無料トライアル（今後実装予定）</h2>
                            <p>
                                無料トライアル期間中に解約した場合、課金は発生しません。
                                トライアル期間終了までに解約手続きをしない場合、自動的に有料プランに移行します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 規約違反による解約</h2>
                            <p>
                                利用規約に違反した場合、当サービスは予告なくアカウントを停止または削除することがあります。
                                この場合、返金は一切行いません。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. お問い合わせ</h2>
                            <p>
                                解約や返金に関するご質問は、サービス内のお問い合わせフォームからご連絡ください。
                                通常3営業日以内に回答いたします。
                            </p>
                        </section>

                        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
                            <p>制定日：2026年2月19日</p>
                            <p className="mt-1">※本ポリシーは予告なく変更する場合があります</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}