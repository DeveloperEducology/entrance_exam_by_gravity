"use client";

import React from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, User, MousePointer2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ErrorSpot {
    id: string;
    studentName: string;
    skillName: string;
    errorCount: number;
    lastAttempt: string;
}

export const ErrorCarousel: React.FC<{ spots: ErrorSpot[] }> = ({ spots }) => {
    return (
        <div className="relative group">
            <div className="flex gap-6 overflow-x-auto pb-10 scrollbar-hide px-2">
                {spots.map((spot) => (
                    <div
                        key={spot.id}
                        className="flex-shrink-0 w-80 glass-card p-6 flex flex-col gap-5 border-error border-opacity-10 hover:shadow-xl hover:shadow-error-glow transition-all duration-300 transform group-hover:scale-[1.01]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-error bg-opacity-10 rounded-full flex items-center justify-center text-error shadow-inner">
                                    <User size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{spot.studentName}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3rd Grade</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-error bg-opacity-10 text-error text-[10px] font-bold rounded-full uppercase tracking-tighter flex items-center gap-1">
                                <AlertCircle size={10} /> {spot.errorCount} Errors
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trouble Spot</p>
                            <p className="text-sm font-bold text-slate-700 leading-tight">{spot.skillName}</p>
                        </div>

                        <div className="flex justify-between items-center mt-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last: {spot.lastAttempt}</p>
                            <button className="flex items-center gap-1.5 text-xs font-bold text-error bg-error bg-opacity-5 hover:bg-opacity-10 px-4 py-2 rounded-xl transition-all">
                                <MousePointer2 size={12} fill="currentColor" /> Review Work
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button className="absolute -left-4 top-1/2 -translate-y-1/2 size-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:text-primary">
                <ChevronLeft size={24} />
            </button>
            <button className="absolute -right-4 top-1/2 -translate-y-1/2 size-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:text-primary">
                <ChevronRight size={24} />
            </button>
        </div>
    );
};
