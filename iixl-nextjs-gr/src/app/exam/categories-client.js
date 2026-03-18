"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { EXAM_CATEGORIES } from "./mock-data";

export default function CategoriesClient() {
  return (
    <main className="min-h-screen bg-[#f1f4f9] py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight"
          >
            Exam Categories
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 font-medium"
          >
            Select your target exam and start practicing today.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXAM_CATEGORIES.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link 
                href={`/exam/series/${category.id}`}
                className="group relative flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-white hover:border-slate-200 active:scale-[0.98]"
              >
                <div className={`h-32 bg-gradient-to-br ${category.color} p-8 flex items-end relative overflow-hidden`}>
                  <div className="absolute top-[-20%] right-[-10%] text-white/10 text-9xl font-black scale-150 rotate-12 select-none group-hover:scale-[1.6] group-hover:rotate-6 transition-transform">
                    {category.icon}
                  </div>
                  <div className="relative z-10 text-5xl">{category.icon}</div>
                </div>

                <div className="p-8 flex flex-col flex-1">
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6 flex-1">
                    {category.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Available Tests</span>
                      <span className="text-slate-800 font-black text-lg">{category.testCount}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Enrolled</span>
                      <span className="text-slate-800 font-black text-lg">{category.participants}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden">
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    className={`h-full bg-gradient-to-r ${category.color} origin-left`}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
