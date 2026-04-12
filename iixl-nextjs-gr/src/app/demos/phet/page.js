'use client';

import Link from 'next/link';
import PhETSimulation from '@/components/PhETSimulation';
import styles from './page.module.css';

const simUrl =
  'https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_en.html';

export default function PhETDemoPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Interactive Demo</span>
          <h1 className={styles.title}>PhET Simulation in Next.js</h1>
          <p className={styles.lead}>
            This demo embeds the official PhET Fractions Intro simulation inside a
            reusable Next.js component, so we can place guided questions and teacher
            prompts around the simulation instead of relying on static text only.
          </p>

          <div className={styles.actions}>
            <Link href={simUrl} target="_blank" rel="noreferrer" className={styles.primaryAction}>
              Open Simulation Directly
            </Link>
            <code className={styles.routePill}>/demos/phet</code>
          </div>
        </div>

        <aside className={styles.guideCard}>
          <h2>Suggested classroom flow</h2>
          <ol className={styles.guideList}>
            <li>Move the fraction pieces and build one whole.</li>
            <li>Compare two fractions with the same denominator.</li>
            <li>Ask students what changed and what stayed the same.</li>
          </ol>
        </aside>
      </section>

      <section className={styles.simSection}>
        <PhETSimulation
          title="Fractions Intro"
          src={simUrl}
          description="Embedded with an iframe. In production, you can also host a downloaded PhET HTML build inside the Next.js public folder for a fixed version."
        />
      </section>

      <section className={styles.notesGrid}>
        <article className={styles.noteCard}>
          <h2>How this route works</h2>
          <p>
            The page uses a reusable <code>PhETSimulation</code> component that wraps an
            <code>iframe</code>. This keeps the simulation isolated from React state while
            letting the rest of the page stay fully customizable.
          </p>
        </article>

        <article className={styles.noteCard}>
          <h2>Next step for your app</h2>
          <p>
            If you want stable versioning, download the PhET HTML bundle and place it in
            <code>public/phet/fractions-intro/</code>, then swap the iframe source to a local
            path like <code>/phet/fractions-intro/fractions-intro_en.html</code>.
          </p>
        </article>
      </section>
    </main>
  );
}
