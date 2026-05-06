'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import styles from './DraggablePart.module.css';

export default function DraggablePart({ id, value, children, disabled, selected, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
    data: { value }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 1000 : undefined,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent click if we were dragging
        if (transform) return;
        onClick?.(e);
      }}
      className={`${styles.draggable} ${isDragging ? styles.dragging : ''} ${selected ? styles.selected : ''}`}
    >
      {children}
    </div>
  );
}
