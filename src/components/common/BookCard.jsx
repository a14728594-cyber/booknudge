import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Star } from 'lucide-react';

export default function BookCard({ book, reason }) {
    return (
        <Link to={createPageUrl('Book') + '?id=' + book.id}>
            <div className="group bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-xl shadow-sm transition-all duration-300 h-full flex flex-col overflow-hidden">
                {/* Cover area */}
                <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center" style={{ height: '160px' }}>
                    {book.cover_url ? (
                        <img
                            src={book.cover_url}
                            alt={book.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 px-4 text-center">
                            <span className="text-4xl">📚</span>
                        </div>
                    )}
                    {book.google_rating && (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-semibold text-gray-700">{book.google_rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-4">
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 leading-snug text-sm group-hover:text-indigo-700 transition-colors">
                        {book.title}
                    </h3>
                    <p className="text-xs text-gray-400 mb-3 truncate">
                        {book.authors?.join(', ') || '著者不明'}
                    </p>

                    {reason && (
                        <p className="text-xs text-indigo-600 bg-indigo-50 rounded-xl p-2.5 mb-3 leading-relaxed border border-indigo-100">
                            {reason}
                        </p>
                    )}

                    {/* ジャンルパス表示 */}
                    {(book.tags?.length > 0 || book.pain_points?.length > 0) && (
                        <div className="mt-auto pt-2 space-y-1.5">
                            {book.tags?.[0] && (
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{book.tags[0]}</span>
                                    {book.pain_points?.[0] && (
                                        <>
                                            <span className="text-[9px] text-gray-300">›</span>
                                            <span className="text-[10px] font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 leading-tight">{book.pain_points[0]}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}