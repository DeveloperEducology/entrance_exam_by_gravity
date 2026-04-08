"use client";

import React from 'react';
import { Target, Zap, Trophy, Flame, ChevronRight, Play } from 'lucide-react';
import { SkillMap } from '@/components/dashboard/SkillMap';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function StudentDashboard() {
    const currentSkills = [
        { id: '1', name: 'Identifying Even and Odd Numbers', status: 'mastered' as const },
        { id: '2', name: 'Comparing Whole Numbers (to 100)', status: 'in-progress' as const, progress: 45 },
        { id: '3', name: 'Addition with Regrouping', status: 'available' as const },
        { id: '4', name: 'Fraction Visualisation (Basics)', status: 'available' as const },
        { id: '5', name: 'Long Multiplication Concepts', status: 'locked' as const },
        { id: '6', name: 'Multi-step Word Problems', status: 'locked' as const },
    ];

    return (
        <div className="dashboard-container min-h-screen bg-[#f8fafc] pb-24">
            {/* Status HUD */}
            <header className="glass-header z-20">
                <div className="section-container flex justify-between h-20 items-center px-6">
                    <div className="flex gap-10 items-center">
                        <div className="logo font-bold text-xl text-primary">AdaptiveMind.ai</div>
                        <div className="h-4 w-[1px] bg-slate-200 hidden md:block"></div>
                        <div className="nav-info hidden md:flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-violet-100 rounded-lg text-primary"><Target size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">Grade 3</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-yellow-100 rounded-lg text-yellow-600"><Zap size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">124 Tokens</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><Flame size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">4 Day Streak</span>
                            </div>
                        </div>
                    </div>
                    <div className="profile flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 leading-tight">John Doe</p>
                            <p className="text-xs text-slate-400 font-medium tracking-tight">Student ID: #8452</p>
                        </div>
                        <div className="size-10 bg-gradient-to-br from-primary to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs ring-4 ring-white shadow-lg shadow-primary-glow">
                            JD
                        </div>
                    </div>
                </div>
            </header>

            <main className="section-container px-6 pt-10">
                {/* Welcome Message */}
                <section className="mb-12">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Welcome back, John! 👋</h1>
                    <p className="text-slate-500 font-medium">You're making great progress in <span className="text-primary font-bold">Mathematics</span>.</p>
                </section>

                {/* Jump Back In Card */}
                <section className="mb-14">
                    <div className="glass-card p-10 flex flex-col md:flex-row justify-between items-center gap-12 border-primary border-opacity-10 bg-primary bg-opacity-[0.02] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-20 bg-primary opacity-[0.03] rounded-full translate-x-1/2 -translate-y-1/2 -rotate-12 transition-all group-hover:scale-110">
                            <Target size={120} />
                        </div>

                        <div className="flex-1 z-10">
                            <span className="text-xs font-bold text-primary px-3 py-1 bg-primary bg-opacity-10 rounded-full uppercase tracking-wider mb-6 inline-block">Recommended for You</span>
                            <h2 className="text-2xl font-extrabold text-slate-800 mb-4 leading-tight max-w-lg">
                                Mastering Multi-digit Comparison <br /> with Number Lines 📈
                            </h2>
                            <div className="flex items-center gap-6 mb-10">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                    <Play size={16} fill="currentColor" /> 12 Minutes Left
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-success">
                                    <Trophy size={16} fill="currentColor" /> Earn 50 Bonus Points
                                </div>
                            </div>
                            <button className="btn-primary text-lg px-12 py-4 flex items-center gap-3 group">
                                Jump Back In <ChevronRight size={22} className="group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center gap-4 z-10 w-full md:w-auto">
                            <div className="size-48 rounded-full border-8 border-slate-100 border-t-primary flex flex-col items-center justify-center bg-white shadow-xl transition-transform duration-700 group-hover:rotate-12">
                                <span className="text-4xl font-extrabold text-slate-800">45%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Current Stage: 2 of 3</p>
                        </div>
                    </div>
                </section>

                {/* Skill Map Section */}
                <section>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Your Skill Journey</h2>
                            <p className="text-sm font-medium text-slate-400">Master the basics to unlock advanced topics.</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-white text-sm font-bold text-slate-600 rounded-xl border border-slate-100 shadow-sm hover:border-primary transition-all">Grade 3</button>
                            <button className="px-4 py-2 bg-white text-sm font-bold text-slate-400 rounded-xl border border-slate-100 shadow-sm opacity-50 cursor-not-allowed">Grade 4</button>
                        </div>
                    </div>

                    <SkillMap skills={currentSkills} />
                </section>
            </main>
        </div>
    );
}
