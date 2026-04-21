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

  const imageSource = getImageSrc(item.imageUrl || item.content);
  const hasImage = isInlineSvg(imageSource) || isImageUrl(imageSource);
  const imageSize = Number(item.imageWidth || item.image_width || item.width || 54);
  const imageCardHeight = Number.isFinite(imageSize) ? imageSize + 34 : undefined;
  const imageFrameStyle = Number.isFinite(imageSize)
    ? { width: `${imageSize}px`, height: `${imageSize}px` }
    : undefined;
  const labelText = String(item.label || item.text || item.content || '').trim();
  const imageTileStyle = hasImage && Number.isFinite(imageSize)
    ? { width: `${imageSize}px`, height: `${imageCardHeight}px` }
    : undefined;
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
    touchAction: 'none',
    zIndex: isDragging ? 40 : undefined,
    ...(imageTileStyle || {})
  };

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
        ${hasImage ? styles.imageTile : ''}
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

      {hasImage ? (
        <>
          <div className={styles.itemImageFrame} style={imageFrameStyle}>
            {isInlineSvg(imageSource) ? (
              <div className={styles.itemImage} dangerouslySetInnerHTML={{ __html: imageSource }} />
            ) : (
              <SafeImage
                src={imageSource}
                alt={item.content || 'Icon'}
                width={imageSize}
                height={imageSize}
                className={styles.itemImage}
              />
            )}
          </div>
          {labelText ? <div className={styles.itemFooter}>{labelText}</div> : null}
        </>
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

  const getItemsInGroup = (groupId) => dragItems.filter(item => placements[item.id] === String(groupId));
  const bankSlots = useMemo(() => dragItems, [dragItems]);

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
          {/* Item Bank */}
          <div
            className={styles.itemsPool}
            onClick={(e) => {
              e.stopPropagation();
              handleZoneClick(POOL_ID);
            }}
          >
            {bankSlots.map((item) => {
              const isPlaced = !!placements[item.id];
      const imageSource = getImageSrc(item.imageUrl || item.content);
      const isImageItem = isInlineSvg(imageSource) || isImageUrl(imageSource);
      const imageCardSize = Number(item.imageWidth || item.image_width || item.width || 54);
      const imageCardHeight = Number.isFinite(imageCardSize) ? imageCardSize + 34 : 88;
      return (
        <motion.div
          key={`pool-slot-${item.id}`}
          layout
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className={`${styles.poolSlot} ${isImageItem ? styles.poolSlotImage : styles.poolSlotText}`}
          style={isImageItem ? { width: `${imageCardSize}px`, height: `${imageCardHeight}px` } : undefined}
        >
          <div className={`${styles.poolPlaceholder} ${isImageItem ? styles.poolPlaceholderImage : styles.poolPlaceholderText}`} />
          {!isPlaced ? (
            <motion.div
              layout
                      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      className={styles.poolItemWrap}
                    >
                      <DraggableItem
                        id={item.id}
                        item={item}
                        isSelected={selectedId === item.id}
                        onSelect={handleItemSelect}
                        isAnswered={isAnswered}
                        isCorrect={placements[item.id] === item.targetGroupId}
                        disabled={isAnswered}
                      />
                    </motion.div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>

          {/* Target Buckets */}
          <div className={styles.dropGroups} style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(3, dropGroups.length || 3))}, minmax(0, 1fr))` }}>
            {dropGroups.map((group) => (
              <div key={group.id} className={styles.dropGroup}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupLabel}>{group.label}</div>
                </div>
                <div className={styles.groupDivider} />
                  <DropZone
                  id={group.id}
                  className={styles.bucket}
                  isBucket
                  onSlotClick={handleZoneClick}
                  isTarget={!!selectedId}
                  hint={group.hint || `Drop here`}
                  disabled={isAnswered}
                >
                  {getItemsInGroup(group.id).map(item => {
                    const imageSource = getImageSrc(item.imageUrl || item.content);
                    const isImageItem = isInlineSvg(imageSource) || isImageUrl(imageSource);
                    const imageCardSize = Number(item.imageWidth || item.image_width || item.width || 54);
                    const imageCardHeight = Number.isFinite(imageCardSize) ? imageCardSize + 34 : 88;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                        className={`${styles.bucketItemWrap} ${isImageItem ? styles.bucketItemWrapImage : styles.bucketItemWrapText}`}
                        style={isImageItem ? { width: `${imageCardSize}px`, height: `${imageCardHeight}px` } : undefined}
                      >
                        <DraggableItem
                          id={item.id}
                          item={item}
                          isSelected={selectedId === item.id}
                          onSelect={handleItemSelect}
                          isAnswered={isAnswered}
                          isCorrect={placements[item.id] === item.targetGroupId}
                          disabled={isAnswered}
                        />
                      </motion.div>
                    );
                  })}
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
