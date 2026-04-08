"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brain, Lock, Mail, Loader2, ChevronRight, School } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid credentials. Please try again.');
            } else {
                // Redirect based on role logic would ideally happen in middleware or here
                // For simplicity, we'll try to fetch the session and redirect
                router.push('/dashboard/student');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-ui">
            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] size-[40%] bg-primary opacity-[0.03] rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] size-[40%] bg-secondary opacity-[0.03] rounded-full blur-[120px]"></div>

            <div className="z-10 w-full max-w-md px-6">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-white rounded-3xl shadow-xl shadow-primary-glow mb-6 text-primary">
                        <Brain size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-slate-400 font-medium">Empowering the next generation of thinkers.</p>
                </div>

                <div className="glass-card p-10 shadow-2xl border-white border-opacity-60 bg-white bg-opacity-70">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary focus:ring-opacity-5 transition-all outline-none font-bold text-sm"
                                    placeholder="name@school.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                                <button type="button" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Forgot?</button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary focus:ring-opacity-5 transition-all outline-none font-bold text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && <p className="text-xs font-bold text-error text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Sign In <ChevronRight size={20} className="group-hover:translate-x-1 transition-all" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-4">Are you a school administrator?</p>
                        <button className="flex items-center gap-2 mx-auto text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                            <School size={16} /> Register Your District
                        </button>
                    </div>
                </div>

                <p className="text-center mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Protected by 256-bit encryption. AdaptiveMind.ai SSL.
                </p>
            </div>
        </div>
    );
}
