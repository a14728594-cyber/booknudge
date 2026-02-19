import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>
                    
                    <div className="space-y-6 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第1条（適用）</h2>
                            <p>
                                本規約は、BookFit（以下「当サービス」）の利用に関する条件を定めるものです。
                                ユーザーは、本規約に同意した上で当サービスを利用するものとします。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第2条（利用登録）</h2>
                            <p>
                                利用希望者は、本規約に同意の上、所定の方法で利用登録を申請し、当サービスがこれを承認することで利用登録が完了します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第3条（禁止事項）</h2>
                            <p className="mb-2">ユーザーは、以下の行為をしてはなりません：</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>法令または公序良俗に違反する行為</li>
                                <li>犯罪行為に関連する行為</li>
                                <li>他のユーザーまたは第三者の権利を侵害する行為</li>
                                <li>当サービスの運営を妨害する行為</li>
                                <li>不正アクセスまたはこれを試みる行為</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第4条（知的財産権）</h2>
                            <p>
                                当サービスに関する一切の知的財産権は、当サービスまたは正当な権利を有する第三者に帰属します。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第5条（免責事項）</h2>
                            <p>
                                当サービスは、サービスの内容について、その正確性、完全性、有用性等について一切保証いたしません。
                                また、当サービスの利用に関連してユーザーが被った損害について、一切の責任を負いません。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第6条（規約の変更）</h2>
                            <p>
                                当サービスは、ユーザーの事前の承諾を得ることなく、本規約を変更できるものとします。
                                変更後の規約は、当サービス上に掲載した時点で効力を生じます。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">第7条（準拠法・管轄裁判所）</h2>
                            <p>
                                本規約は日本法に準拠し、本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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