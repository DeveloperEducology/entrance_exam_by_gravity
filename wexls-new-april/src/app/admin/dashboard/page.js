"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, BookOpen, Database, Settings, HelpCircle, Plus, RefreshCw, Layers, Zap, Info, ChevronRight, Activity } from 'lucide-react';
import { backendUrl } from '@/lib/backend/url';
import styles from './admin.module.css';

/**
 * SUPER ADMIN DASHBOARD
 * Central administrative hub for curriculum management and question generation.
 * Integrates directly with the specialized Node.js Express service on port 4000.
 */
export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ questions: 0, subjects: 0 });
  const [questions, setQuestions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // FETCH CORE DATA FROM EXPRESS BACKEND (Port 4000)
  const syncStats = async () => {
    setIsSyncing(true);
    try {
      // Direct call to port 4000 via url utility
      const res = await fetch(backendUrl('/api/adaptive/stats'));
      const data = await res.json();
      setStats({ questions: data.grades || 1420, subjects: data.subjects || 42 }); // Using fallback if mock
      
      // Mocking fetch existing questions for demo
      setQuestions([
        { id: 'q1', type: 'MCQ', text: 'Rounding to the nearest 100', status: 'Active' },
        { id: 'q2', type: 'Base-10', text: 'Place value units', status: 'Active' },
        { id: 'q3', type: 'Fractions', text: 'Shading 2/5 of a circle', status: 'Developing' },
      ]);
    } catch (err) {
      console.error("Express Sync Error:", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  useEffect(() => {
    syncStats();
  }, []);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>WEXLS <b>Admin</b></div>
        
        <nav className={styles.nav}>
           <div className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('dashboard')}><LayoutDashboard size={20} /> Dashboard</div>
           <div className={`${styles.navItem} ${activeTab === 'curriculum' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('curriculum')}><Layers size={20} /> Curriculum</div>
           <div className={`${styles.navItem} ${activeTab === 'database' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('database')}><Database size={20} /> Question Pool</div>
           <div className={`${styles.navItem} ${activeTab === 'settings' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('settings')}><Settings size={20} /> Engine Settings</div>
        </nav>

        <div style={{ marginTop: 'auto' }} className={styles.navItem}>
           <HelpCircle size={20} /> Documentation
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
           <div className={styles.title}>
              <h1>Platform Overview</h1>
              <p>System health monitoring and curriculum analytics.</p>
           </div>
           <button className={styles.btnPrimary} onClick={syncStats} disabled={isSyncing}>
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Sync Cloud Engine
           </button>
        </header>

        <section className={styles.statsGrid}>
           <StatCard label="Total Questions" value={stats.questions} icon={<Database />} />
           <StatCard label="Active Subjects" value={stats.subjects} icon={<BookOpen />} />
           <StatCard label="Live Microskills" value="1,240" icon={<Zap />} color="#f59e0b" />
           <StatCard label="Avg Mastery" value="82%" icon={<Activity />} color="#10b981" />
        </section>

        <div className={styles.actionSection}>
           <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                 <h3>Recent Curriculum Additions</h3>
                 <button className={styles.btnSecondary}><Plus size={16} /> New Question</button>
              </div>

              <div className={styles.questionList}>
                 {questions.map(q => (
                   <div key={q.id} className={styles.questionItem}>
                      <div className={styles.qDetails}>
                         <h4>{q.text}</h4>
                         <p>Type: {q.type} • ID: {q.id}</p>
                      </div>
                      <div className={styles.qBadge}>{q.status}</div>
                   </div>
                 ))}
              </div>
           </div>

           <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                 <h3><Info size={16} /> Engine Status</h3>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                 Adapative Engine service is healthy and currently routing to Node port 4000.
              </p>
              <div className={styles.statusList}>
                 <StatusItem label="API Node" status="Healthy" color="#10b981" />
                 <StatusItem label="Cache Cluster" status="Warning" color="#f59e0b" />
                 <StatusItem label="Drip-feed Scheduler" status="Healthy" color="#10b981" />
                 <StatusItem label="Latex Renderer" status="Healthy" color="#10b981" />
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color = '#3b82f6' }) {
  return (
    <div className={styles.statCard}>
       <div className={styles.statInfo}>
          <h4>{label}</h4>
          <p>{value}</p>
       </div>
       <div className={styles.statIcon} style={{ color }}>{icon}</div>
    </div>
  );
}

function StatusItem({ label, status, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
       <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</span>
       <span style={{ color, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{status}</span>
    </div>
  );
}
