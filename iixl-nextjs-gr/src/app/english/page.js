'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LESSONS } from '@/lib/practice/generators/english/speech';
import { Mic2, ArrowRight, Star, Sparkles, BookOpen } from 'lucide-react';

export default function EnglishHomePage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            {/* Hero Section */}
            <header style={{ 
                padding: '4rem 2rem', 
                textAlign: 'center', 
                background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ marginBottom: '1.5rem' }}
                >
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        background: '#6366f1', 
                        borderRadius: '24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto',
                        boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)'
                    }}>
                        <Mic2 size={40} color="white" />
                    </div>
                </motion.div>
                
                <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Speak English Confidently
                </h1>
                <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
                    Interactive speech practice for kids. Master pronunciation through fun lessons and real-time feedback.
                </p>
            </header>

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {Object.entries(LESSONS).map(([id, lesson], index) => (
                        <motion.div
                            key={id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/practice/speech-demo?category=${id}`} style={{ textDecoration: 'none' }}>
                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.03)', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                                    borderRadius: '24px', 
                                    padding: '2rem',
                                    height: '100%',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = '#6366f1';
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                                >
                                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>{lesson.icon}</div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: 'white' }}>{lesson.title}</h3>
                                    <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '2rem' }}>{lesson.description}</p>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', fontWeight: '600' }}>
                                        Start Lesson <ArrowRight size={18} />
                                    </div>

                                    {/* Decorative elements */}
                                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                                        <Star size={100} />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <section style={{ marginTop: '6rem', textAlign: 'center', padding: '4rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '32px', border: '1px dashed rgba(99, 102, 241, 0.2)' }}>
                    <Sparkles size={32} color="#6366f1" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Coming Soon: Word Challenge</h2>
                    <p style={{ color: '#94a3b8' }}>Collect badges and unlock new levels as you improve your reading skills!</p>
                </section>
            </main>

            <footer style={{ padding: '4rem 2rem', textAlign: 'center', color: '#475569', fontSize: '0.875rem' }}>
                &copy; 2026 English Speech Lab. Powered by Web Speech API.
            </footer>
        </div>
    );
}
