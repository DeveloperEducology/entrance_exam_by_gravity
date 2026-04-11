'use client';

import React from 'react';

export default function DotArrayVisual({ part }) {
    const rows = Number(part?.rows || 2);
    const cols = Number(part?.cols || 3);
    const color = part?.color || '#818CF8';
    const dotSize = Number(part?.dotSize || 40);
    const gap = Number(part?.gap || 15);
    const imageUrl = part?.imageUrl || part?.image_url;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            margin: '0.5rem 0',
            background: '#fff',
            borderRadius: '16px'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: `${gap}px`
            }}>
                {Array.from({ length: rows * cols }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: `${dotSize}px`,
                            height: `${dotSize}px`,
                            borderRadius: imageUrl ? '0%' : '50%',
                            background: imageUrl ? `url(${imageUrl}) center/contain no-repeat` : color,
                            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'default'
                        }}
                    />
                ))}
            </div>
            
            {(part?.showLabels || part?.show_labels) && (
                 <div style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>
                     {rows} rows of {cols}
                 </div>
            )}
        </div>
    );
}
