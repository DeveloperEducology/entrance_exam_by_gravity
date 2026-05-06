'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import styles from './DroppableInput.module.css';

export default function DroppableInput({ id, children, disabled, onClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `blank-${id}`,
    disabled
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${styles.droppable} ${isOver ? styles.isOver : ''}`}
    >
      {children}
    </div>
  );
}
