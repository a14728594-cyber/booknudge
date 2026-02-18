import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Star, Users } from 'lucide-react';

export default function BookCard({ book, reason }) {
    return (
        <Link to={createPageUrl(`book/${book.id}`)}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 h-full flex flex-col">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {book.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        {book.authors?.join(', ') || '著者不明'}
                    </p>
                    
                    {reason && (
                        <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg p-3 mb-3">
                            {reason}
                        </p>
                    )}
                    
                    {book.tags && book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {book.tags.slice(0, 3).map((tag, idx) => (
                                <span 
                                    key={idx}
                                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                    {book.google_rating && (
                        <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{book.google_rating.toFixed(1)}</span>
                        </div>
                    )}
                    {book.google_ratings_count && (
                        <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{book.google_ratings_count.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}