import React from 'react';
import styles from './AreaModelStep.module.css';

export default function AreaModelStep({ columns, rows, cells }) {
  // columns: [{val: "600", flex: 3}, {val: "20", flex: 2}, {val: "8", flex: 1}]
  // rows: [{val: "5", flex: 1}] or [{val:"50", flex:2}, {val:"2", flex:1}]
  // cells: 2D array [[{val: "3,000", color: "cyan"}, {val: "100", color: "orange"}...]] 

  return (
    <div className={styles.container}>
      {/* Top Labels */}
      <div className={styles.topLabelsRow}>
        <div className={styles.cornerLabel}></div>
        {columns.map((col, i) => (
          <div key={i} className={styles.topLabel} style={{ flexGrow: col.flex || 1 }}>
            {col.val}
          </div>
        ))}
      </div>
      
      {/* Grid */}
      <div className={styles.gridArea}>
        {rows.map((row, rIdx) => (
          <div key={rIdx} className={styles.gridRow} style={{ flexGrow: row.flex || 1 }}>
            <div className={styles.leftLabel}>
              {row.val}
            </div>
            
            {cells[rIdx] && cells[rIdx].map((cell, cIdx) => {
               const colorClass = cell.color ? styles[`bg_${cell.color}`] || '' : '';
               return (
                 <div key={cIdx} className={`${styles.cell} ${colorClass}`} style={{ flexGrow: columns[cIdx]?.flex || 1 }}>
                    {cell.val && <span className={styles.cellValue}>{cell.val}</span>}
                 </div>
               );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
