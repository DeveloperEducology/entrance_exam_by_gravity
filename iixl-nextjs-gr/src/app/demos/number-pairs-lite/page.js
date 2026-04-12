'use client';

import Link from 'next/link';
import NumberPairsLite from '@/components/simulations/NumberPairsLite';
import styles from './page.module.css';

export default function NumberPairsLitePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.kicker}>Custom Simulation Demo</span>
          <h1 className={styles.title}>Number Pairs Lite</h1>
          <p className={styles.lead}>
            This version recreates the core idea with plain HTML drag and drop: students drag
            two number tiles into slots to make a target sum. It is intentionally simple so we
            can extend it step by step.
          </p>
          <div className={styles.actions}>
            <code className={styles.routePill}>/demos/number-pairs-lite</code>
            <Link href="/demos/phet" className={styles.secondaryLink}>
              View PhET iframe demo
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.demoArea}>
        <NumberPairsLite />
      </section>
    </main>
  );
}
