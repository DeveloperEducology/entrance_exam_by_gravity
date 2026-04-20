import React, { useState, useEffect } from 'react';
import styles from './SharingDragDrop.module.css';

const SharingDragDrop = ({ part, studentAnswer, onChange }) => {
    // studentAnswer is an object: { "item-0": "box-1", "item-1": "box-2", ... }
    const [positions, setPositions] = useState(studentAnswer || {});
    const [selectedItems, setSelectedItems] = useState([]); // Array of IDs

    const itemCount = part.count || 12;
    const groupCount = part.groupCount || 3;
    const items = Array.from({ length: itemCount }, (_, i) => `item-${i}`);
    const groups = Array.from({ length: groupCount }, (_, i) => `box-${i}`);

    useEffect(() => {
        if (JSON.stringify(positions) !== JSON.stringify(studentAnswer)) {
            onChange(positions);
        }
    }, [positions]);

    const handleItemClick = (itemId, e) => {
        e.stopPropagation();
        
        setSelectedItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId); // Deselect
            } else {
                return [...prev, itemId]; // Add to selection
            }
        });
    };

    const handleContainerClick = (containerId) => {
        // Advanced UX: If no items selected, but user clicks a box that HAS items, 
        // pick up everything from that box.
        if (selectedItems.length === 0) {
            const itemsInBox = Object.entries(positions)
                .filter(([_, pos]) => pos === containerId)
                .map(([id]) => id);
            
            if (itemsInBox.length > 0) {
                const newPositions = { ...positions };
                itemsInBox.forEach(id => delete newPositions[id]);
                setPositions(newPositions);
                setSelectedItems(itemsInBox); // Pick them all up!
            }
            return;
        }

        const newPositions = { ...positions };
        selectedItems.forEach(itemId => {
            if (containerId === 'bank') {
                delete newPositions[itemId];
            } else {
                newPositions[itemId] = containerId;
            }
        });

        setPositions(newPositions);
        setSelectedItems([]); // Clear selection after drop
    };

    const getItemsInContainer = (containerId) => {
        if (containerId === 'bank') {
            return items.filter(id => !positions[id]);
        }
        return items.filter(id => positions[id] === containerId);
    };

    return (
        <div className={styles.sharingLab} onClick={() => setSelectedItems([])}>
            {/* Header with Selection Info */}
            <div className={styles.labHeader}>
                <span className={styles.selectionCount}>
                    {selectedItems.length > 0 ? `🚀 Ready to move ${selectedItems.length} items` : 'Tap items to pick them up'}
                </span>
                {selectedItems.length > 0 && (
                    <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); setSelectedItems([]); }}>
                        Cancel
                    </button>
                )}
            </div>

            {/* Item Bank */}
            <div 
                className={`${styles.itemBank} ${selectedItems.length > 0 ? styles.bankActive : ''}`}
                onClick={() => handleContainerClick('bank')}
            >
                {getItemsInContainer('bank').map(id => (
                    <div 
                        key={id}
                        className={`${styles.draggableItem} ${selectedItems.includes(id) ? styles.itemSelected : ''}`}
                        onClick={(e) => handleItemClick(id, e)}
                    >
                        <img src={part.imageUrl} alt="item" className={styles.itemIcon} />
                    </div>
                ))}
            </div>

            {/* Containers */}
            <div className={styles.containersRow}>
                {groups.map((groupId, idx) => {
                    const boxItems = getItemsInContainer(groupId);
                    return (
                        <div 
                            key={groupId} 
                            className={`${styles.containerBox} ${selectedItems.length > 0 ? styles.containerActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleContainerClick(groupId); }}
                        >
                            <div className={styles.badge}>{boxItems.length}</div>
                            <div className={styles.boxVisual}>
                                {boxItems.slice(0, 5).map(id => (
                                    <img key={id} src={part.imageUrl} alt="mini" className={styles.miniIcon} />
                                ))}
                                {boxItems.length > 5 && <span className={styles.moreText}>+{boxItems.length - 5}</span>}
                                {boxItems.length === 0 && <span className={styles.plusIcon}>+</span>}
                            </div>
                            <span className={styles.boxLabel}>{part.groupLabels?.[idx] || `VAULT ${idx + 1}`}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SharingDragDrop;
