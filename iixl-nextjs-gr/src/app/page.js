import Hero from '@/components/Hero';
import GradeCard from '@/components/GradeCard';
import HomeAuthStatus from '@/components/HomeAuthStatus';
import styles from './page.module.css';
import { Suspense } from 'react';
import Link from 'next/link';
import GradesDisplay, { GradesSkeleton } from '@/components/home/GradesDisplay';
import StudentAssignments from '@/components/home/StudentAssignments';

export const metadata = {
  title: 'Home',
  description: 'Browse grades and start adaptive practice skills in math, science, and english.',
  alternates: {
    canonical: '/',
  },
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoText}>WEXLS</span>
          </div>
          <nav className={styles.nav}>
            <a href="#" className={styles.navLink}>Learning</a>
            <Link href="/analytics" className={styles.navLink}>Analytics</Link>
            <Link href="/admin" className={styles.navLink}>Admin</Link>
          </nav>
          <div className={styles.authButtons}>
            <HomeAuthStatus />
          </div>
        </div>
      </header>

      <Hero />

      <Suspense fallback={null}>
        <StudentAssignments />
      </Suspense>

      <section className={styles.gradesSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>
            Choose your grade level
          </h2>
          <p className={styles.sectionSubtitle}>
            Start your personalized learning journey today
          </p>

          <Suspense fallback={<GradesSkeleton />}>
            <GradesDisplay />
          </Suspense>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>© 2026 WEXLS Learning. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
