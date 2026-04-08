"use client";

import React from 'react';
import { SkillRadarCard } from '@/components/dashboard/SkillRadarCard';
import {
    Users,
    GraduationCap,
    TrendingUp,
    Search,
    Calendar,
    MoreVertical,
    AlertTriangle,
    ArrowUpRight,
    Brain,
    Sparkles,
    ChevronDown
} from 'lucide-react';
import { ErrorCarousel } from '@/components/dashboard/ErrorCarousel';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function TeacherDashboard() {
    const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>('1');

    const errorSpots = [
        { id: '1', studentName: 'Emma Watson', skillName: 'Fraction Equivalence', errorCount: 5, lastAttempt: '2m ago' },
        { id: '2', studentName: 'Lucas Grey', skillName: 'Long Division', errorCount: 3, lastAttempt: '15m ago' },
        { id: '3', studentName: 'Sophia Lin', skillName: 'Word Problems: Time', errorCount: 4, lastAttempt: '1h ago' },
        { id: '4', studentName: 'James Bond', skillName: 'Comparing Decimals', errorCount: 6, lastAttempt: '3h ago' },
    ];

    const students = [
        { id: '1', name: 'Emma Watson', accuracy: 42, tokens: 120, status: 'Critical Need', insight: 'Emma struggles with carrying digits but excels at mental math. Recommend one-on-one for regrouping concepts.' },
        { id: '2', name: 'Lucas Grey', accuracy: 58, tokens: 245, status: 'Needs Support', insight: 'Lucas has shown 12% growth over the last week but remains slow in division. Practice focuses on speed.' },
        { id: '3', name: 'Sophia Lin', accuracy: 89, tokens: 512, status: 'On Track', insight: 'Consistent high performer. Ready for challenging word problems with multi-step operations.' },
        { id: '4', name: 'John Doe', accuracy: 94, tokens: 845, status: 'Excelling', insight: 'Mastered all current grade 3 curriculum units. Potential for grade 4 early enrollment.' },
    ];

    const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];

    return (
        <div className="dashboard-container min-h-screen bg-[#f8fafc] pb-24 font-ui">
            {/* Sidebar/Nav Placeholder */}
            <header className="glass-header z-20">
                <div className="section-container flex justify-between h-20 items-center px-6">
                    <div className="flex gap-10 items-center">
                        <div className="logo font-bold text-xl text-primary">AdaptiveMind.ai</div>
                        <div className="h-4 w-[1px] bg-slate-200"></div>
                        <div className="nav-info flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary bg-opacity-10 rounded-lg text-primary"><Users size={18} /></div>
                                <span className="text-sm font-bold text-slate-700 font-ui">Class 3B</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary bg-opacity-10 rounded-lg text-primary"><Calendar size={18} /></div>
                                <span className="text-sm font-bold text-slate-400 font-ui">Term 2: Week 8</span>
                            </div>
                        </div>
                    </div>
                    <div className="profile flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-800 leading-tight font-ui">Mrs. Robinson</p>
                            <p className="text-xs text-slate-400 font-medium tracking-tight font-ui">Lead Educator</p>
                        </div>
                        <div className="size-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs ring-4 ring-white shadow-lg overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=Robinson&background=7C3AED&color=fff`} alt="Profile" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="section-container px-6 pt-10">
                {/* KPI Tiles */}
                <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="glass-card p-6 border-slate-100 border-opacity-40 hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-violet-100 rounded-2xl text-primary"><GraduationCap size={24} /></div>
                            <span className="text-[10px] font-bold text-success flex items-center gap-1 bg-success bg-opacity-5 px-3 py-1 rounded-full"><TrendingUp size={10} /> +12%</span>
                        </div>
                        <h3 className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Mastery Growth</h3>
                        <p className="text-2xl font-extrabold text-slate-800 tracking-tight">72.4%</p>
                    </div>
                    <div className="glass-card p-6 border-slate-100 border-opacity-40 hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 rounded-2xl text-secondary"><Users size={24} /></div>
                        </div>
                        <h3 className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Active Students</h3>
                        <p className="text-2xl font-extrabold text-slate-800 tracking-tight">32 / 35</p>
                    </div>
                    <div className="glass-card p-6 border-slate-100 border-opacity-40 hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-100 rounded-2xl text-success"><TrendingUp size={24} /></div>
                        </div>
                        <h3 className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Avg. Accuracy</h3>
                        <p className="text-2xl font-extrabold text-slate-800 tracking-tight">84.2%</p>
                    </div>
                    <div className="glass-card p-6 border-slate-100 border-opacity-40 hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><AlertTriangle size={24} /></div>
                        </div>
                        <h3 className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Open Trouble Spots</h3>
                        <p className="text-2xl font-extrabold text-slate-800 tracking-tight">4</p>
                    </div>
                </section>

                {/* Drill-down Section for AI Insights and Radar Charts */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">
                    <div className="lg:col-span-2">
                        <div className="glass-card p-10 flex flex-col md:flex-row items-center gap-10 border-primary border-opacity-5 relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 p-12 bg-primary bg-opacity-5 rounded-full translate-x-1/2 -translate-y-1/2">
                                <Sparkles size={120} />
                            </div>
                            <div className="flex-grow z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-violet-100 rounded-2xl text-primary"><Brain size={24} /></div>
                                    <h3 className="text-xl font-bold text-slate-800">AI Deep Learning Insights</h3>
                                </div>
                                <p className="text-slate-500 font-medium leading-relaxed max-w-lg mb-8 italic">
                                    "{currentStudent.insight}"
                                </p>
                                <div className="flex gap-10">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Growth Index</p>
                                        <p className="text-xl font-bold text-success">+18%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Response Time</p>
                                        <p className="text-xl font-bold text-slate-800">4.2s / Avg</p>
                                    </div>
                                </div>
                            </div>
                            <div className="md:w-64 z-10">
                                <div className="p-6 bg-white bg-opacity-40 backdrop-blur-md rounded-3xl border border-white shadow-xl flex flex-col items-center">
                                    <div className="size-24 rounded-full bg-gradient-to-br from-primary to-indigo-600 border-8 border-white shadow-lg flex items-center justify-center text-white text-3xl font-extrabold mb-4">
                                        {currentStudent.accuracy}%
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">Current Accuracy</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <SkillRadarCard />
                    </div>
                </section>

                {/* Intervention Carousel Section */}
                <section className="mb-14">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Intervention Dashboard</h2>
                            <p className="text-sm font-medium text-slate-400">Review student errors in real-time and provide targeted support.</p>
                        </div>
                        <button className="text-sm font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">View All Troublespots <ArrowUpRight size={16} /></button>
                    </div>
                    <ErrorCarousel spots={errorSpots} />
                </section>

                {/* Student Performance Table */}
                <section>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Student Performance</h2>
                        <div className="flex gap-4 w-full md:w-auto">
                            <div className="relative flex-grow md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm font-bold text-xs" placeholder="Search students..." />
                            </div>
                            <button className="px-6 py-2 bg-white text-xs font-bold text-slate-600 rounded-xl border border-slate-100 shadow-sm hover:border-primary transition-all">Export Report</button>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accuracy</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mastery Level</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr
                                        key={student.id}
                                        className={cn(
                                            "border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group cursor-pointer",
                                            selectedStudentId === student.id ? "bg-primary bg-opacity-[0.02]" : ""
                                        )}
                                        onClick={() => setSelectedStudentId(student.id)}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary bg-opacity-5 rounded-lg text-primary text-xs font-bold group-hover:scale-110 transition-transform">{student.name.charAt(0)}</div>
                                                <span className="text-sm font-bold text-slate-700">{student.name}</span>
                                                {selectedStudentId === student.id && <ChevronDown size={14} className="text-primary ml-1" />}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-grow h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn(
                                                        "h-full rounded-full",
                                                        student.accuracy < 50 ? "bg-error" : student.accuracy < 75 ? "bg-warning" : "bg-success"
                                                    )} style={{ width: `${student.accuracy}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">{student.accuracy}%</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase inline-block",
                                                student.status === 'Critical Need' ? "bg-error bg-opacity-10 text-error" :
                                                    student.status === 'Needs Support' ? "bg-warning bg-opacity-10 text-warning" : "bg-success bg-opacity-10 text-success"
                                            )}>
                                                {student.status}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><MoreVertical size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
