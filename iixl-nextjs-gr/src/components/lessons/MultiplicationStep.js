import React from 'react';
import styles from './MultiplicationStep.module.css';

export default function MultiplicationStep({ topNumber, bottomNumber, regroups, results, explanations }) {
  // Pad arrays so they align to the right side (longest string is usually max 5-6 digits total width)
  // Actually, we don't need to pad if we render them in flex-end containers, but we want the 'columns' to align perfectly.
  // Using fixed width cells with flex-end alignment on rows naturally aligns the columns.

  const renderCell = (cellData, i) => {
    if (!cellData) return <div key={i} className={styles.cell} />;
    
    // Support either an object { val, color, bold } or just a string "3"
    const isObj = typeof cellData === 'object';
    const val = isObj ? cellData.val : cellData;
    const colorClass = isObj && cellData.color ? styles[cellData.color] || '' : '';
    const weightClass = isObj && cellData.bold ? styles.fwBold : styles.fwNormal;
    
    return (
      <div key={i} className={`${styles.cell} ${colorClass} ${weightClass}`}>
        {val}
      </div>
    );
  };

  const renderRegroupCell = (cellData, i) => {
    if (!cellData) return <div key={i} className={styles.regroupCell} />;
    
    const isObj = typeof cellData === 'object';
    const val = isObj ? cellData.val : cellData;
    const colorClass = isObj && cellData.color ? styles[cellData.color] || '' : '';
    const weightClass = isObj && cellData.bold ? styles.fwBold : styles.fwNormal;
    
    return (
      <div key={i} className={`${styles.regroupCell} ${colorClass} ${weightClass}`}>
        {val}
      </div>
    );
  };

  return (
    <div className={styles.stepContainer}>
      <div className={styles.mathGrid}>
        
        {/* Regroups (Tiny numbers above) */}
        {regroups && regroups.length > 0 && (
          <div className={styles.regroupRow}>
            {/* The rightmost element must align with rightmost digits. */}
            {regroups.map((r, i) => renderRegroupCell(r, i))}
          </div>
        )}

        {/* Top Number */}
        <div className={styles.row}>
          {topNumber.map((c, i) => renderCell(c, i))}
        </div>

        {/* Operator Layout (leftmost operator + Bottom Number) */}
        <div className={styles.row}>
          <div className={styles.operatorCell}>&times;</div>
          {bottomNumber.map((c, i) => renderCell(c, i))}
        </div>

        <div className={styles.divider} />

        {/* Results (Partial products or final sum) */}
        {results && results.map((resultRow, rowIndex) => {
           if (resultRow === 'divider') {
             return <div key={rowIndex} className={styles.divider} />;
           }
           if (resultRow.isAddRow) {
             return (
               <div key={rowIndex} className={styles.row}>
                 <div className={styles.operatorCell}>+</div>
                 {resultRow.cells.map((c, i) => renderCell(c, i))}
               </div>
             );
           }
           return (
             <div key={rowIndex} className={styles.row}>
               {resultRow.map((c, i) => renderCell(c, i))}
             </div>
           );
        })}
      </div>

      <div className={styles.explanationArea}>
        {explanations && explanations.map((htmlStr, i) => (
           <div key={i} dangerouslySetInnerHTML={{ __html: htmlStr }} />
        ))}
      </div>
    </div>
  );
}
