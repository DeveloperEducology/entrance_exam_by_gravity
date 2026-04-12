'use client';

import Link from 'next/link';
import GeometryAngleBuilder from '@/components/simulations/GeometryAngleBuilder';
import styles from './page.module.css';

export default function GeometryAngleBuilderPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.kicker}>Custom Simulation Demo</span>
          <h1 className={styles.title}>Geometry Angle Builder</h1>
          <p className={styles.lead}>
            This route shows how to build your own PhET-style learning interaction in
            Next.js using React state, SVG, and direct manipulation. Students can drag
            the ray, watch the angle update, and explore acute, right, obtuse, and
            straight angles.
          </p>
          <div className={styles.actions}>
            <code className={styles.routePill}>/demos/geometry-angle-builder</code>
            <Link href="/demos/phet" className={styles.secondaryLink}>
              View PhET iframe demo
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.demoArea}>
        <GeometryAngleBuilder />
      </section>
    </main>
  );
}
