import React, { useEffect, useState } from 'react';
import styles from './SuccessFeedback.module.css';

const SCORE_BASED_WORDS = {
  vlow: 'Good!',        // 0-20
  low: 'Well done!',    // 21-40
  mid: 'Excellent!',    // 41-60
  high: 'Wonderful!',   // 61-80
  vhigh: 'Fantastic!',  // 81-90
  elite: 'Brilliant!',  // 91-99
  master: 'Mastered!'   // 100
};

export default function SuccessFeedback({ show, onComplete, score = 0 }) {
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      let tier = 'vlow';
      if (score >= 100) tier = 'master';
      else if (score >= 91) tier = 'elite';
      else if (score >= 81) tier = 'vhigh';
      else if (score >= 61) tier = 'high';
      else if (score >= 41) tier = 'mid';
      else if (score >= 21) tier = 'low';
      
      setText(SCORE_BASED_WORDS[tier]);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 500);
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, onComplete]);

  if (!show && !visible) return null;

  return (
    <div className={`${styles.overlay} ${visible ? styles.show : styles.hide}`}>
      <div className={styles.praiseBox}>
        <div className={styles.checkmark}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className={styles.praiseText}>{text}</h2>
      </div>
    </div>
  );
}
