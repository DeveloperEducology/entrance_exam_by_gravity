'use client';

import styles from './PhETSimulation.module.css';

export default function PhETSimulation({
  title,
  src,
  description = '',
  aspectRatio = '16 / 9',
  height,
}) {
  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      <div
        className={styles.frameShell}
        style={{
          aspectRatio: height ? undefined : aspectRatio,
          height: height || undefined,
        }}
      >
        <iframe
          src={src}
          title={title}
          className={styles.frame}
          allowFullScreen
        />
      </div>
    </section>
  );
}
