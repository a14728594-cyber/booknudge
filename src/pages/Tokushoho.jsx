import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function Tokushoho() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <Link
          to={createPageUrl('landing')}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8">

                    <ArrowLeft className="w-4 h-4" />
                    トップに戻る
                </Link>

                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>
                    
                    <div className="space-y-6 text-gray-700">
                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">販売事業者名</h3>
                            <p className="">河野慎吾
              </p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="">事業責任者</h3>
                            <p className="">河野慎吾</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="text-slate-950 text-base font-normal">住所
              </h3>
                            <p className="">東京都板橋区南町７−８</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">電話番号</h3>
                            <p className="">08046971393</p>
                            <p className="text-sm text-gray-500 mt-1">※お問い合わせはサービス内のお問い合わせフォームをご利用ください</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">メールアドレス</h3>
                            <p className="">momosin0515@icloud.com</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">販売価格</h3>
                            <p>プレミアムプラン：月額1,200円（税込）</p>
                            <p className="text-sm text-gray-500 mt-1">※価格は予告なく変更する場合があります</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">商品代金以外の必要料金</h3>
                            <p>インターネット接続料金、通信料金等はお客様のご負担となります。</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">支払方法</h3>
                            <p>クレジットカード決済（Stripeによる処理）</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">支払時期</h3>
                            <p>サブスクリプション契約時及び毎月の更新時に自動決済されます。</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">商品・サービスの提供時期</h3>
                            <p>決済完了後、即時にサービスをご利用いただけます。</p>
                        </div>

                        <div className="border-b border-gray-200 pb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">返品・キャンセル</h3>
                            <p>デジタルコンテンツの性質上、原則として返品・返金には応じかねます。</p>
                            <p className="text-sm text-gray-500 mt-1">詳細は<Link to={createPageUrl('refund')} className="text-indigo-600 hover:underline">返金・キャンセル・解約ポリシー</Link>をご確認ください。</p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
                            <p>制定日：2026年2月19日</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>);}