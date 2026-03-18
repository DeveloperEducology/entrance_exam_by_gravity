"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { EXAM_CATEGORIES, TEST_SERIES } from "../../mock-data";
import { useEffect, useState } from "react";

export default function SeriesClient({ categoryId }) {
  const category = EXAM_CATEGORIES.find((cat) => cat.id === categoryId);
  const series = TEST_SERIES[categoryId] || [];

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-10">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Category Not Found</h1>
        <Link href="/exam" className="mt-4 text-blue-600 font-bold hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1f4f9] py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/exam" className="inline-flex items-center text-sm font-black text-blue-600 uppercase tracking-widest gap-2 hover:gap-3 transition-all mb-8">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
            All Categories
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className={`h-20 w-20 flex items-center justify-center text-4xl bg-gradient-to-br ${category.color} rounded-3xl shadow-xl shadow-blue-500/20`}>
                 {category.icon}
               </div>
               <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">{category.name}</h1>
                  <p className="text-slate-500 font-medium text-lg mt-1 truncate max-w-md">{category.description}</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-sm border border-white">
               <div className="text-right border-r border-slate-100 pr-6 mr-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available</p>
                 <p className="text-slate-800 font-black text-2xl leading-none">{series.length} <span className="text-sm">Sets</span></p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rank</p>
                 <p className="text-blue-600 font-black text-2xl leading-none">#1 <span className="text-sm font-bold opacity-40">Hot</span></p>
               </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
           {series.map((test, index) => (
             <motion.div
               key={test.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.05 }}
             >
               <Link 
                 href={`/exam/mock/${test.id}`}
                 className="group relative block bg-white rounded-3xl p-6 md:p-8 border border-white hover:border-blue-100 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300"
               >
                 <div className="absolute top-6 right-6">
                   <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                     <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                   </div>
                 </div>

                 <div className="mb-8">
                   <div className="flex items-center gap-3 mb-4">
                     <span className={`h-2 w-2 rounded-full ${index % 2 === 0 ? "bg-emerald-500" : "bg-blue-500"}`} />
                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Mock Preparation</span>
                   </div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight leading-tight">
                     {test.name}
                   </h3>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="bg-slate-50 rounded-2xl p-4 transition-colors group-hover:bg-blue-50/50">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Questions</p>
                       <p className="text-slate-800 font-black text-lg leading-tight">{test.questions}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 transition-colors group-hover:bg-blue-50/50">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Minutes</p>
                       <p className="text-slate-800 font-black text-lg leading-tight">{test.duration}</p>
                    </div>
                 </div>

                 <div className="mt-6 flex items-center justify-between px-1">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ring-1 ${
                      test.difficulty === "Hard" ? "bg-rose-50 text-rose-600 ring-rose-200" : 
                      test.difficulty === "Moderate" ? "bg-amber-50 text-amber-600 ring-amber-200" :
                      "bg-emerald-50 text-emerald-600 ring-emerald-200"
                    }`}>
                      {test.difficulty}
                    </span>
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Free Attempt</span>
                 </div>
               </Link>
             </motion.div>
           ))}
        </div>
      </div>
    </main>
  );
}
