'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DragDropRendererV2.module.css';
import QuestionParts from './QuestionParts';
import { getImageSrc, isImageUrl, isInlineSvg } from './contentUtils';
import SafeImage from './SafeImage';

const POOL_ID = '__pool__';

function DraggableItem({ 
  id, 
  item, 
  isSelected, 
  onSelect, 
  isOverlay, 
  isAnswered, 
  isCorrect, 
  disabled 
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id,
    disabled: disabled
  });

  const style = { 
    transform: CSS.Translate.toString(transform),
    touchAction: 'none',
    zIndex: isDragging ? 40 : undefined
  };

  const imageSource = getImageSrc(item.imageUrl || item.content);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!disabled) {
          e.stopPropagation();
          onSelect?.(id);
        }
      }}
      className={`
        ${styles.dragItem}
        ${isDragging ? styles.dragging : ''}
        ${isSelected ? styles.selected : ''}
        ${isAnswered && isCorrect ? styles.correct : ''}
        ${isAnswered && !isCorrect ? styles.incorrect : ''}
      `}
    >
      {isAnswered && (
        <div className={`${styles.statusIcon} ${isCorrect ? styles.correct : styles.incorrect}`}>
          {isCorrect ? '✓' : '✕'}
        </div>
      )}

      {isInlineSvg(imageSource) ? (
        <div className={styles.itemImage} dangerouslySetInnerHTML={{ __html: imageSource }} />
      ) : isImageUrl(imageSource) ? (
        <div className={styles.itemImage}>
          <SafeImage src={imageSource} alt={item.content || 'Icon'} width={100} height={100} />
        </div>
      ) : (
        <span className={styles.itemText}>{item.content}</span>
      )}
    </div>
  );
}

function DropZone({ 
  id, 
  children, 
  isTarget, 
  onSlotClick, 
  hint, 
  className, 
  isBucket = false,
  disabled
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSlotClick?.(id)}
      className={`
        ${className} 
        ${isOver ? styles.isOver : ''} 
        ${isTarget && !React.Children.count(children) ? styles.isTarget : ''}
      `}
    >
      <AnimatePresence>
        {children}
      </AnimatePresence>
      {!React.Children.count(children) && !isOver && hint && (
        <div className={styles.bucketHint}>
          {hint}
        </div>
      )}
    </div>
  );
}

// --- Main Renderer ---

export default function DragDropRendererV2({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Normalize data structures
  const dragItems = useMemo(() => {
    const raw = question.dragItems || question.drag_items || question.items || [];
    return raw.map((item, idx) => ({
      ...item,
      id: String(item.id || `item-${idx}`),
      content: item.content || item.label || item.text || item.value || '',
      targetGroupId: String(item.targetGroupId || item.target_group_id || '')
    }));
  }, [question]);

  const dropGroups = useMemo(() => {
    const raw = question.dropGroups || question.drop_groups || question.groups || [];
    return raw.map((group, idx) => ({
      ...group,
      id: String(group.id || `group-${idx}`),
      label: group.label || group.name || group.title || ''
    }));
  }, [question]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 }
    }),
    useSensor(KeyboardSensor)
  );

  // Map placements: { itemId: groupId }
  const placements = useMemo(() => {
    if (!userAnswer || typeof userAnswer !== 'object') return {};
    return userAnswer;
  }, [userAnswer]);

  const getUnplacedItems = () => dragItems.filter(item => !placements[item.id]);
  const getItemsInGroup = (groupId) => dragItems.filter(item => placements[item.id] === String(groupId));

  useEffect(() => {
    if (selectedId && !dragItems.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [dragItems, selectedId]);

  const handleDragStart = (e) => {
    if (isAnswered) return;
    setActiveId(String(e.active.id));
    setSelectedId(null);
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveId(null);

    if (isAnswered || !over) return;

    const itemId = String(active.id);
    const targetId = String(over.id);
    const isKnownBucket = dropGroups.some((group) => group.id === targetId);

    if (targetId === POOL_ID || targetId.startsWith('slot-')) {
      // Remove from bucket
      if (placements[itemId]) {
        const next = { ...placements };
        delete next[itemId];
        onAnswer(next);
      }
    } else if (isKnownBucket) {
      // Move to bucket
      onAnswer({ ...placements, [itemId]: targetId });
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const handleItemSelect = (id) => {
    if (isAnswered) return;
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleZoneClick = (targetGroupId) => {
    if (isAnswered || !selectedId) return;

    if (targetGroupId === POOL_ID) {
      if (placements[selectedId]) {
        const next = { ...placements };
        delete next[selectedId];
        onAnswer(next);
      }
    } else {
      onAnswer({ ...placements, [selectedId]: targetGroupId });
    }
    setSelectedId(null);
  };

  const activeItem = useMemo(() => 
    dragItems.find(item => item.id === activeId),
    [activeId, dragItems]
  );

  const requiredItemIds = useMemo(() => 
    dragItems.filter(item => item.targetGroupId && item.targetGroupId.trim() !== '').map(item => item.id),
    [dragItems]
  );

  const canSubmit = requiredItemIds.length === 0 || 
    requiredItemIds.every(id => !!placements[id]);

  return (
    <div className={styles.container} onClick={() => setSelectedId(null)}>
      <motion.div 
        className={styles.questionCard}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.header}>
          <div className={styles.badge}>Drag and Drop</div>
        </div>

        <div className={styles.title}>
           <QuestionParts parts={question.parts} />
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart} 
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          {/* Item Bank Slots */}
          <div
            className={styles.itemsPool}
            onClick={(e) => e.stopPropagation()}
          >
            {dragItems.map((item, idx) => {
              const isPlaced = !!placements[item.id];
              return (
                <DropZone 
                  key={`slot-${idx}`} 
                  id={`slot-${idx}`} 
                  className={styles.slot}
                  onSlotClick={() => handleZoneClick(POOL_ID)}
                  isTarget={!!selectedId && placements[selectedId]}
                  disabled={isAnswered}
                >
                  {!isPlaced && (
                    <DraggableItem 
                      id={item.id} 
                      item={item} 
                      isSelected={selectedId === item.id}
                      onSelect={handleItemSelect}
                      isAnswered={isAnswered}
                      isCorrect={placements[item.id] === item.targetGroupId}
                      disabled={isAnswered}
                    />
                  )}
                </DropZone>
              );
            })}
          </div>

          {/* Target Buckets */}
          <div className={styles.dropGroups}>
            {dropGroups.map((group) => (
              <div key={group.id} className={styles.dropGroup}>
                <div className={styles.groupLabel}>{group.label}</div>
                <DropZone 
                  id={group.id} 
                  className={styles.bucket}
                  isBucket
                  onSlotClick={handleZoneClick}
                  isTarget={!!selectedId}
                  hint={group.hint || `Drop here`}
                  disabled={isAnswered}
                >
                  {getItemsInGroup(group.id).map(item => (
                    <div key={item.id} className={styles.bucketItemWrap}>
                      <DraggableItem 
                        id={item.id} 
                        item={item} 
                        isSelected={selectedId === item.id}
                        onSelect={handleItemSelect}
                        isAnswered={isAnswered}
                        isCorrect={placements[item.id] === item.targetGroupId}
                        disabled={isAnswered}
                      />
                    </div>
                  ))}
                </DropZone>
              </div>
            ))}
          </div>

          {!isAnswered ? (
            <div className={styles.instructionPill}>
              Drag items or tap an item, then tap a group.
            </div>
          ) : null}

        </DndContext>

        <div className={styles.footer}>
          {!isAnswered ? (
            <button 
              className={styles.submitButton}
              disabled={!canSubmit}
              onClick={() => onSubmit()}
            >
              Submit Answer
            </button>
          ) : (
            <div className={styles.successOverlay}>
              {placements && Object.keys(placements).length > 0 ? "REVIEW COMPLETE" : "NO ANSWER PROVIDED"}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
