'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  DragOverlay,
  rectIntersection,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import styles from './DragDropRenderer.module.css';
import QuestionParts from './QuestionParts';
import { getImageSrc, isImageUrl, isInlineSvg } from './contentUtils';
import SafeImage from './SafeImage';

const POOL_ID = '__pool__';

const dropAnimationConfig = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

function DroppableArea({ id, className, onClick, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? styles.activeDropTarget : ''}`.trim()}
      data-drop-id={id}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function DraggableItem({ item, disabled, isDragging, isAnswered, isCorrect, isSelected, onClick, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: activeDragging,
  } = useDraggable({
    id: String(item.id),
    disabled,
  });

  const hasImage = useMemo(() => {
    const contentText = String(item.content ?? '');
    const imageSource = getImageSrc(item.imageUrl || contentText);
    return isImageUrl(imageSource) || isInlineSvg(imageSource);
  }, [item]);

  const stateClass = isAnswered 
    ? (isCorrect ? styles.correct : styles.incorrect) 
    : isSelected ? styles.selected : '';
  
  const typeClass = hasImage ? styles.imageItem : styles.textItem;

  return (
    <motion.div
      layout
      layoutId={`item-${item.id}`}
      ref={setNodeRef}
      className={`${styles.dragItem} ${activeDragging ? styles.dragging : ''} ${stateClass} ${typeClass}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!disabled && onClick) {
          e.stopPropagation();
          onClick(item.id);
        }
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: isSelected ? 1.05 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        layout: { duration: 0.2 }
      }}
    >
      {isAnswered && (
        <div className={isCorrect ? styles.correctBadge : styles.incorrectBadge}>
          {isCorrect ? '✓' : '✕'}
        </div>
      )}
      {children}
    </motion.div>
  );
}

function ItemVisual({ item }) {
  const contentText = String(item.content ?? '');
  const imageSource = getImageSrc(item.imageUrl || contentText);

  const hasVisualContent =
    isInlineSvg(contentText) ||
    isImageUrl(contentText) ||
    isInlineSvg(item.imageUrl) ||
    isImageUrl(item.imageUrl);

  if (isInlineSvg(imageSource)) {
    return <div className={styles.itemImage} dangerouslySetInnerHTML={{ __html: imageSource }} />;
  }

  if (isImageUrl(imageSource)) {
    return (
      <div className={styles.itemImage}>
        <SafeImage
          src={imageSource}
          alt={item.content || 'Drag item'}
          className={styles.image}
          width={120}
          height={120}
          sizes="(max-width: 768px) 26vw, 120px"
        />
      </div>
    );
  }

  return hasVisualContent ? null : <div className={styles.itemLabel}>{contentText}</div>;
}

export default function DragDropRenderer({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const placements = useMemo(() => {
    if (!userAnswer || typeof userAnswer !== 'object') return {};
    return userAnswer;
  }, [userAnswer]);

  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const q = useMemo(() => {
    if (!question) return {};
    let base = question;
    if (typeof question === 'string') {
      try { base = JSON.parse(question); } catch (e) { base = { questionText: question }; }
    }
    
    const normalized = { ...base };
    if (typeof normalized.parts === 'string') {
      try { normalized.parts = JSON.parse(normalized.parts); } catch (e) { normalized.parts = []; }
    }
    return normalized;
  }, [question]);

  const dragItems = useMemo(() => {
    // 1. Direct match (Root)
    let raw = q.dragItems || q.drag_items || q.items || q.options;
    
    // 2. Nested match
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      const nested = q.question || q.content || q.data || q.payload;
      if (nested && typeof nested === 'object') {
        raw = nested.dragItems || nested.drag_items || nested.items || nested.options;
      }
    }

    // 3. Search in Parts
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      const parts = Array.isArray(q.parts) ? q.parts : [];
      for (const p of parts) {
        if (p.dragItems || p.drag_items) {
          raw = p.dragItems || p.drag_items;
          break;
        }
      }
    }

    // 4. Fallback for Demo Questions
    const text = (String(q.questionText || q.question_text || '') + 
                 (Array.isArray(q.parts) ? q.parts.map(p => String(p.content || '')).join(' ') : '')).toLowerCase();
    
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      if (text.includes('independent') && text.includes('dependent')) {
        raw = [
          { id: 'item-1', content: 'the weight of the wheels', targetGroupId: 'independent' },
          { id: 'item-2', content: 'the amount of time it took to reach the bottom', targetGroupId: 'dependent' }
        ];
      } else if (text.includes('prime') && text.includes('composite')) {
        raw = [
          { id: '1', content: '13', targetGroupId: 'prime' },
          { id: '2', content: '21', targetGroupId: 'composite' },
          { id: '3', content: '2', targetGroupId: 'prime' },
          { id: '4', content: '9', targetGroupId: 'composite' }
        ];
      }
    }

    return (Array.isArray(raw) ? raw : []).map((item, idx) => ({
      ...item,
      id: String(item.id || item.value || `item-${idx}`),
      content: item.content || item.label || item.text || item.value || '',
      targetGroupId: String(item.targetGroupId || item.target_group_id || item.targetId || item.target_id || item.category || item.group || '')
    }));
  }, [q]);

  const dropGroups = useMemo(() => {
    // 1. Direct match (Root)
    let raw = q.dropGroups || q.drop_groups || q.groups || q.categories || q.targets;

    // 2. Nested match
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      const nested = q.question || q.content || q.data || q.payload;
      if (nested && typeof nested === 'object') {
        raw = nested.dropGroups || nested.drop_groups || nested.groups || nested.categories || nested.targets;
      }
    }

    // 3. Search in Parts
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      const parts = Array.isArray(q.parts) ? q.parts : [];
      for (const p of parts) {
        if (p.dropGroups || p.drop_groups) {
          raw = p.dropGroups || p.drop_groups;
          break;
        }
      }
    }

    // 4. Demo Fallbacks
    const text = (String(q.questionText || q.question_text || '') + 
                 (Array.isArray(q.parts) ? q.parts.map(p => String(p.content || '')).join(' ') : '')).toLowerCase();

    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      if (text.includes('independent') && text.includes('dependent')) {
        raw = [
          { id: 'independent', label: 'Independent Variable' },
          { id: 'dependent', label: 'Dependent Variable' }
        ];
      } else if (text.includes('prime') && text.includes('composite')) {
        raw = [
          { id: 'prime', label: 'Prime Numbers (Exactly 2 factors)' },
          { id: 'composite', label: 'Composite Numbers (More than 2 factors)' }
        ];
      }
    }

    return (Array.isArray(raw) ? raw : []).map((group, idx) => ({
      ...group,
      id: String(group.id || group.value || group.name || `group-${idx}`),
      label: group.label || group.name || group.title || group.text || ''
    }));
  }, [q]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 10 },
    })
  );

  const requiredItemIds = useMemo(
    () =>
      dragItems
        .filter(
          (item) =>
            item.targetGroupId !== null &&
            item.targetGroupId !== undefined &&
            String(item.targetGroupId).trim() !== ''
        )
        .map((item) => String(item.id)),
    [dragItems]
  );

  const placedRequiredCount = requiredItemIds.filter((id) => Boolean(placements[id])).length;
  const canSubmit = requiredItemIds.length === 0 || placedRequiredCount === requiredItemIds.length;

  const getItemsInGroup = (groupId) => dragItems.filter((item) => placements[item.id] === String(groupId));
  const getUnplacedItems = () => dragItems.filter((item) => !placements[item.id]);

  const handleDragStart = (event) => {
    if (isAnswered) return;
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event) => {
    const itemId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    setActiveId(null);

    if (isAnswered || !overId) return;

    if (overId === POOL_ID) {
      if (placements[itemId]) {
        const next = { ...placements };
        delete next[itemId];
        onAnswer(next);
      }
      return;
    }

    if (overId.startsWith('group:')) {
      const groupId = overId.replace('group:', '');
      onAnswer({ ...placements, [itemId]: groupId });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleItemClick = (id) => {
    if (isAnswered) return;
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleZoneClick = (groupId) => {
    if (isAnswered || !selectedId) return;
    
    onAnswer({ ...placements, [selectedId]: String(groupId) });
    setSelectedId(null);
  };

  const handlePoolClick = () => {
    if (isAnswered || !selectedId) return;
    
    if (placements[selectedId]) {
      const next = { ...placements };
      delete next[selectedId];
      onAnswer(next);
    }
    setSelectedId(null);
  };

  const activeItem = useMemo(() => 
    dragItems.find(item => String(item.id) === activeId),
    [activeId, dragItems]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.container} onClick={() => setSelectedId(null)}>
        <motion.div 
          className={styles.questionCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.questionContent}>
            <QuestionParts parts={question.parts} />
          </div>

          {(dragItems.length === 0 || dropGroups.length === 0) && (
            <div style={{ padding: '2rem', border: '2px dashed #f87171', borderRadius: '16px', color: '#b91c1c', textAlign: 'center', margin: '1rem 0' }}>
              <strong>Schema Issue:</strong> Missing interaction data. 
              <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
                Found {dragItems.length} draggable items and {dropGroups.length} drop groups. 
                Expected non-zero for both. Checked fields: <code>dragItems</code>, <code>dropGroups</code>, <code>items</code>, <code>groups</code>, etc.
              </div>
            </div>
          )}

          {!isAnswered && dragItems.length > 0 && (
            <div className={styles.instructionWrapper}>
              <p className={styles.instruction}>
                {selectedId ? 'Click a category to place the item' : 'Tap an item to select, or drag to move'}
              </p>
            </div>
          )}

          <LayoutGroup>
            <DroppableArea 
              id={POOL_ID} 
              className={styles.itemsPool}
              onClick={handlePoolClick}
            >
              <AnimatePresence mode="popLayout">
                {getUnplacedItems().map((item) => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    disabled={isAnswered}
                    isAnswered={isAnswered}
                    isSelected={selectedId === item.id}
                    onClick={handleItemClick}
                    isCorrect={placements[item.id] === String(item.targetGroupId)}
                  >
                    <ItemVisual item={item} />
                  </DraggableItem>
                ))}
              </AnimatePresence>
              {getUnplacedItems().length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={styles.emptyZone}
                >
                  All items placed!
                </motion.div>
              )}
            </DroppableArea>

            <div className={styles.dropGroups}>
              {dropGroups.map((group) => (
                <div key={group.id} className={styles.dropGroup}>
                  <div className={styles.groupHeader}>
                    <div className={styles.groupLabel}>{group.label}</div>
                  </div>
                  <DroppableArea 
                    id={`group:${group.id}`} 
                    className={styles.dropZone}
                    onClick={() => handleZoneClick(group.id)}
                  >
                    <AnimatePresence mode="popLayout">
                      {getItemsInGroup(group.id).length === 0 ? (
                        <motion.div 
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={styles.emptyZone}
                        >
                          {selectedId ? 'Tap to drop' : 'Empty'}
                        </motion.div>
                      ) : (
                        getItemsInGroup(group.id).map((item) => (
                          <DraggableItem
                            key={item.id}
                            item={item}
                            disabled={isAnswered}
                            isAnswered={isAnswered}
                            isSelected={selectedId === item.id}
                            onClick={handleItemClick}
                            isCorrect={placements[item.id] === String(item.targetGroupId)}
                          >
                            <ItemVisual item={item} />
                          </DraggableItem>
                        ))
                      )}
                    </AnimatePresence>
                  </DroppableArea>
                </div>
              ))}
            </div>
          </LayoutGroup>

          {question.showSubmitButton && !isAnswered && (
            <motion.button 
              className={styles.submitButton} 
              disabled={!canSubmit} 
              onClick={() => onSubmit()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Submit Answer
            </motion.button>
          )}
        </motion.div>
      </div>

      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeId && activeItem ? (
          <div className={styles.dragOverlay}>
            <ItemVisual item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

