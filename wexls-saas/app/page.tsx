"use client";

import React from 'react';
import Link from 'next/link';
import { Brain, BarChart3, Gamepad2, Users, CheckCircle, ChevronRight, PlayCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="home-wrapper">
      {/* Navigation */}
      <nav className="glass-header">
        <div className="section-container flex justify-between items-center py-4">
          <div className="logo text-gradient font-extrabold text-2xl tracking-tight">AdaptiveMind.ai</div>
          <div className="nav-links flex gap-8 items-center">
            <Link href="#features" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Pricing</Link>
            <Link href="/login" className="btn-primary py-2 px-6">Login</Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="hero py-24 section-container text-center relative overflow-hidden">
          <div className="animate-fade-in max-w-4xl mx-auto flex flex-col items-center">
            <span className="badge mb-6 px-4 py-1.5 glass-card text-primary text-xs font-bold uppercase tracking-widest bg-violet-50">The Future of Education</span>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight leading-tight">
              Empower Every Student with <br />
              <span className="text-gradient">Neural Adaptation</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 font-medium">
              The world's first classroom-first learning platform that personalises every question
              in real-time, providing teachers with actionable pedagogical insights.
            </p>
            <div className="flex gap-4 flex-wrap justify-center">
              <button className="btn-primary text-lg px-10 py-4">Start Your School's Free Trial</button>
              <button className="btn-secondary glass-card px-10 py-4 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
                <PlayCircle size={18} /> Watch Demo
              </button>
            </div>
          </div>

          <div className="mt-20 flex justify-center w-full px-4">
            <div className="glass-card p-1 max-w-5xl w-full h-[300px] md:h-[450px] flex items-center justify-center relative bg-gradient-to-br from-violet-50 to-white overflow-hidden shadow-2xl">
              <div className="absolute -top-20 -right-20 p-40 bg-primary opacity-5 blur-3xl rounded-full"></div>
              <div className="z-10 flex flex-col items-center justify-center h-full">
                <div className="flex gap-8 items-center flex-wrap justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center text-white shadow-lg shadow-success/30 font-bold text-xl animate-bounce">1</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage 1</span>
                  </div>
                  <div className="h-1 w-20 bg-slate-200 rounded-full hidden sm:block"></div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30 font-bold text-xl">2</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage 2</span>
                  </div>
                  <div className="h-1 w-20 bg-slate-200 rounded-full hidden sm:block"></div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-300 font-bold text-xl">3</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage 3</span>
                  </div>
                </div>
                <p className="mt-12 text-sm font-extrabold text-slate-400 uppercase tracking-widest bg-white/50 px-6 py-2 rounded-full border border-white">Student Mastery Journey</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 bg-surface bg-opacity-30">
          <div className="section-container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-10 glow-on-hover transition-all flex flex-col items-center text-center">
                <div className="p-4 bg-violet-100 rounded-3xl mb-8 text-primary">
                  <Brain size={32} />
                </div>
                <h3 className="text-xl font-extrabold mb-4 text-slate-800">Neural Adaptation</h3>
                <p className="text-slate-500 font-medium">Our engine uses state-machine logic to perfectly calibrate question difficulty for every single student.</p>
              </div>
              <div className="glass-card p-10 glow-on-hover transition-all flex flex-col items-center text-center">
                <div className="p-4 bg-blue-100 rounded-3xl mb-8 text-secondary">
                  <BarChart3 size={32} />
                </div>
                <h3 className="text-xl font-extrabold mb-4 text-slate-800">Intervention AI</h3>
                <p className="text-slate-500 font-medium">Identify student trouble spots instantly. Teachers get actionable data to facilitate small-group instruction.</p>
              </div>
              <div className="glass-card p-10 glow-on-hover transition-all flex flex-col items-center text-center">
                <div className="p-4 bg-green-100 rounded-3xl mb-8 text-success">
                  <Gamepad2 size={32} />
                </div>
                <h3 className="text-xl font-extrabold mb-4 text-slate-800">Gamified Mastery</h3>
                <p className="text-slate-500 font-medium">Students earn tokens and badges as they progress through skill stages, keeping engagement high.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 section-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">Simple Pricing for Schools</h2>
            <p className="text-slate-400 font-medium">From single classrooms to entire school districts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Tier 1 */}
            <div className="glass-card p-10 flex flex-col bg-white hover:border-slate-300 transition-all" style={{ padding: '2.5rem', paddingTop: '6rem' }}>
              <h3 className="text-lg font-bold mb-2 text-slate-700">Starter</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold">$49</span>
                <span className="text-slate-400 font-bold">/mo</span>
              </div>
              <ul className="flex flex-col gap-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <CheckCircle size={18} className="text-success" /> Up to 35 Students
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <CheckCircle size={18} className="text-success" /> Core Adaptive Engine
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <CheckCircle size={18} className="text-success" /> Basic Teacher Reports
                </li>
              </ul>
              <button className="py-4 font-bold glass-card border-slate-100 hover:bg-slate-50 transition-all">Start Free Trial</button>
            </div>

            {/* Tier 2 */}
            <div className="glass-card p-10 flex flex-col border-primary border-2 relative overflow-hidden bg-white shadow-2xl shadow-primary/10" style={{ paddingTop: '6rem' }}>
              <div className="absolute top-8 right--35 bg-primary text-white text-[9px] font-bold py-1 w-140 text-center rotate-45 uppercase tracking-widest shadow-lg">Popular</div>
              <h3 className="text-lg font-bold mb-2 text-primary">Professional</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold">$199</span>
                <span className="text-slate-400 font-bold">/mo</span>
              </div>
              <ul className="flex flex-col gap-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <CheckCircle size={18} className="text-success" /> Up to 150 Students
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <CheckCircle size={18} className="text-success" /> Advanced AI Insights
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <CheckCircle size={18} className="text-success" /> Parent Reports
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <CheckCircle size={18} className="text-success" /> Priority Support
                </li>
              </ul>
              <button className="btn-primary py-4 text-lg">Select Plan</button>
            </div>

            {/* Tier 3 */}
            <div className="glass-card p-10 flex flex-col bg-white hover:border-slate-300 transition-all" style={{ padding: '2.5rem', paddingTop: '6rem' }}>
              <h3 className="text-lg font-bold mb-2 text-slate-700">District</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold">Custom</span>
              </div>
              <ul className="flex flex-col gap-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <CheckCircle size={18} className="text-success" /> Unlimited Students
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <CheckCircle size={18} className="text-success" /> White-label Branding
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <CheckCircle size={18} className="text-success" /> Dedicated Manager
                </li>
              </ul>
              <button className="py-4 font-bold glass-card border-slate-100 hover:bg-slate-50 transition-all">Contact Sales</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-white border-t border-slate-50 mt-20">
        <div className="section-container flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm font-bold text-slate-400">© 2024 AdaptiveMind.ai. All rights reserved.</p>
          <div className="flex gap-8">
            <Link href="#" className="text-xs font-bold text-slate-400 hover:text-primary uppercase tracking-widest">Privacy Policy</Link>
            <Link href="#" className="text-xs font-bold text-slate-400 hover:text-primary uppercase tracking-widest">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
