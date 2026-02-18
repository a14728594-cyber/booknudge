import React from 'react';
import { cn } from "@/lib/utils";

export default function Card({ children, className, ...props }) {
    return (
        <div 
            className={cn(
                "bg-white rounded-2xl shadow-sm border border-gray-100 p-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}