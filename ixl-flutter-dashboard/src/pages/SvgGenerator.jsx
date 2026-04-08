import React, { useState, useMemo } from 'react';
import { Settings2, Copy, Check, LayoutTemplate, Grid2X2, Layers, Download, ArrowRight, Plus, Trash2 } from 'lucide-react';

export function SvgGenerator() {
    // Top-Level Mode
    const [mode, setMode] = useState('single'); // 'single', 'mixed'

    // Shared Settings
    const [is3D, setIs3D] = useState(true);
    const [blockSize, setBlockSize] = useState(22);
    const [gapX, setGapX] = useState(6);
    const [gapY, setGapY] = useState(6);
    const [mainColor, setMainColor] = useState('#00bfa5');
    const [edgeColor, setEdgeColor] = useState('#00695c');
    const [topColor, setTopColor] = useState('#42ebd4');
    const [sideColor, setSideColor] = useState('#008675');
    const [desktopMaxWidth, setDesktopMaxWidth] = useState(450);
    const [mobileMaxWidth, setMobileMaxWidth] = useState(250);
    const [customWidth, setCustomWidth] = useState('');
    const [customHeight, setCustomHeight] = useState('');

    // Single Mode Settings
    const [singleUnit, setSingleUnit] = useState(10); // 1 (ones), 10 (tens), 100 (hundreds)
    const [singleCount, setSingleCount] = useState(10);
    const [singleLayout, setSingleLayout] = useState('grid'); // 'row', 'column', 'grid'

    // Mixed Mode Settings
    const [mixedOrder, setMixedOrder] = useState('thousands-hundreds-tens-ones');
    const [thousandsCount, setThousandsCount] = useState(1);
    const [hundredsCount, setHundredsCount] = useState(5);
    const [hundredsStyle, setHundredsStyle] = useState('stack'); // 'wall', 'stack'
    const [tensCount, setTensCount] = useState(2);
    const [onesCount, setOnesCount] = useState(7);
    const [onesPerRow, setOnesPerRow] = useState(5);
    const [groupGap, setGroupGap] = useState(30);

    const [circlesCount, setCirclesCount] = useState(0);
    const [starsCount, setStarsCount] = useState(0);
    const [squaresCount, setSquaresCount] = useState(0);
    const [trianglesCount, setTrianglesCount] = useState(0);

    // Number Line Settings
    const [nlMin, setNlMin] = useState(2000);
    const [nlMax, setNlMax] = useState(3000);
    const [nlJumps, setNlJumps] = useState([{ start: 2000, end: 2346, label: '+346' }, { start: 2346, end: 2500, label: '+154' }]);
    const [nlLineColor, setNlLineColor] = useState('#7c1d1d');
    const [nlTickColor, setNlTickColor] = useState('#1e293b');
    const [nlJumpColor, setNlJumpColor] = useState('#ef4444');
    const [nlLineThickness, setNlLineThickness] = useState(10);
    const [nlStep, setNlStep] = useState(100);
    const [nlLabelStep, setNlLabelStep] = useState(100);
    const [nlShowArrows, setNlShowArrows] = useState(true);
    const [nlBlankTicks, setNlBlankTicks] = useState(false);
    const [nlHideAutoTicks, setNlHideAutoTicks] = useState(false);
    const [nlObjects, setNlObjects] = useState([
        { value: 2000, content: '🥕', offsetY: 0, fontSize: 40 },
        { value: 2346, content: '🐰', offsetY: -60, fontSize: 50 },
        { value: 3000, content: '🥕', offsetY: 0, fontSize: 40 }
    ]);
    const [nlCustomTicks, setNlCustomTicks] = useState([
        { value: 2000, label: '2,000' },
        { value: 2346, label: '2,346' },
        { value: 2500, label: '2,500' },
        { value: 3000, label: '3,000' }
    ]);

    const [copied, setCopied] = useState(false);

    // Generators
    const dx = is3D ? blockSize * 0.4 : 0;
    const dy = is3D ? blockSize * 0.4 : 0;

    const drawCube = (x, y, size, main, edge, topC, sideC) => {
        let parts = `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
        if (is3D) {
            parts += `\n  <polygon points="${x},${y} ${x + dx},${y - dy} ${x + size + dx},${y - dy} ${x + size},${y}" fill="${topC}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <polygon points="${x + size},${y} ${x + size + dx},${y - dy} ${x + size + dx},${y + size - dy} ${x + size},${y + size}" fill="${sideC}" stroke="${edge}" stroke-width="1"/>`;
        }
        return parts;
    };

    const drawRod = (x, y, size, main, edge, topC, sideC) => {
        const h = size * 10;
        let parts = `<rect x="${x}" y="${y}" width="${size}" height="${h}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
        for (let i = 1; i < 10; i++) parts += `\n  <line x1="${x}" y1="${y + i * size}" x2="${x + size}" y2="${y + i * size}" stroke="${edge}" stroke-width="1"/>`;
        if (is3D) {
            parts += `\n  <polygon points="${x},${y} ${x + dx},${y - dy} ${x + size + dx},${y - dy} ${x + size},${y}" fill="${topC}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <polygon points="${x + size},${y} ${x + size + dx},${y - dy} ${x + size + dx},${y + h - dy} ${x + size},${y + h}" fill="${sideC}" stroke="${edge}" stroke-width="1"/>`;
            for (let i = 1; i < 10; i++) parts += `\n  <line x1="${x + size}" y1="${y + i * size}" x2="${x + size + dx}" y2="${y + i * size - dy}" stroke="${edge}" stroke-width="1"/>`;
        }
        return parts;
    };

    const drawHundredWall = (x, y, size, main, edge, topC, sideC) => {
        const w = size * 10, h = size * 10;
        let parts = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
        for (let i = 1; i < 10; i++) {
            parts += `\n  <line x1="${x}" y1="${y + i * size}" x2="${x + w}" y2="${y + i * size}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <line x1="${x + i * size}" y1="${y}" x2="${x + i * size}" y2="${y + h}" stroke="${edge}" stroke-width="1"/>`;
        }
        if (is3D) {
            parts += `\n  <polygon points="${x},${y} ${x + dx},${y - dy} ${x + w + dx},${y - dy} ${x + w},${y}" fill="${topC}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <polygon points="${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y + h - dy} ${x + w},${y + h}" fill="${sideC}" stroke="${edge}" stroke-width="1"/>`;
            for (let i = 1; i < 10; i++) {
                parts += `\n  <line x1="${x + i * size}" y1="${y}" x2="${x + i * size + dx}" y2="${y - dy}" stroke="${edge}" stroke-width="1"/>`;
                parts += `\n  <line x1="${x + w}" y1="${y + i * size}" x2="${x + w + dx}" y2="${y + i * size - dy}" stroke="${edge}" stroke-width="1"/>`;
            }
        }
        return parts;
    };

    const drawHundredFlat = (x, y, size, main, edge, topC, sideC) => {
        const w = size * 10, h = size;
        let parts = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
        for (let i = 1; i < 10; i++) parts += `\n  <line x1="${x + i * size}" y1="${y}" x2="${x + i * size}" y2="${y + h}" stroke="${edge}" stroke-width="1"/>`;
        if (is3D) {
            parts += `\n  <polygon points="${x},${y} ${x + dx * 10},${y - dy * 10} ${x + w + dx * 10},${y - dy * 10} ${x + w},${y}" fill="${topC}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <polygon points="${x + w},${y} ${x + w + dx * 10},${y - dy * 10} ${x + w + dx * 10},${y + h - dy * 10} ${x + w},${y + h}" fill="${sideC}" stroke="${edge}" stroke-width="1"/>`;
            for (let i = 1; i < 10; i++) {
                parts += `\n  <line x1="${x + dx * i}" y1="${y - dy * i}" x2="${x + w + dx * i}" y2="${y - dy * i}" stroke="${edge}" stroke-width="1"/>`;
                parts += `\n  <line x1="${x + i * size}" y1="${y}" x2="${x + i * size + dx * 10}" y2="${y - dy * 10}" stroke="${edge}" stroke-width="1"/>`;
                parts += `\n  <line x1="${x + w + dx * i}" y1="${y - dy * i}" x2="${x + w + dx * i}" y2="${y + h - dy * i}" stroke="${edge}" stroke-width="1"/>`;
            }
        }
        return parts;
    };

    const drawThousand = (x, y, size, main, edge, topC, sideC) => {
        const w = size * 10, h = size * 10;
        let parts = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
        for (let i = 1; i < 10; i++) {
            parts += `\n  <line x1="${x}" y1="${y + i * size}" x2="${x + w}" y2="${y + i * size}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <line x1="${x + i * size}" y1="${y}" x2="${x + i * size}" y2="${y + h}" stroke="${edge}" stroke-width="1"/>`;
        }
        if (is3D) {
            parts += `\n  <polygon points="${x},${y} ${x + dx * 10},${y - dy * 10} ${x + w + dx * 10},${y - dy * 10} ${x + w},${y}" fill="${topC}" stroke="${edge}" stroke-width="1"/>`;
            parts += `\n  <polygon points="${x + w},${y} ${x + w + dx * 10},${y - dy * 10} ${x + w + dx * 10},${y + h - dy * 10} ${x + w},${y + h}" fill="${sideC}" stroke="${edge}" stroke-width="1"/>`;
            for (let i = 1; i < 10; i++) {
                parts += `\n  <line x1="${x + dx * i}" y1="${y - dy * i}" x2="${x + w + dx * i}" y2="${y - dy * i}" stroke="${edge}" stroke-width="1"/>`;
                parts += `\n  <line x1="${x + i * size}" y1="${y}" x2="${x + i * size + dx * 10}" y2="${y - dy * 10}" stroke="${edge}" stroke-width="1"/>`;
                parts += `\n  <line x1="${x + w}" y1="${y + i * size}" x2="${x + w + dx * 10}" y2="${y + i * size - dy * 10}" stroke="${edge}" stroke-width="1"/>`;
                parts += `\n  <line x1="${x + w + dx * i}" y1="${y - dy * i}" x2="${x + w + dx * i}" y2="${y + h - dy * i}" stroke="${edge}" stroke-width="1"/>`;
            }
        }
        return parts;
    };

    const drawCircle = (x, y, size, main, edge) => {
        const r = size / 2;
        return `<circle cx="${x + r}" cy="${y + r}" r="${r}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
    };

    const drawStar = (x, y, size, main, edge) => {
        const cx = x + size / 2;
        const cy = y + size / 2;
        const outerRadius = size / 2;
        const innerRadius = size * 0.22;
        let points = [];
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
            points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
        }
        return `<polygon points="${points.join(' ')}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
    };

    const drawSquare = (x, y, size, main, edge) => {
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
    };

    const drawTriangle = (x, y, size, main, edge) => {
        return `<polygon points="${x + size / 2},${y} ${x},${y + size} ${x + size},${y + size}" fill="${main}" stroke="${edge}" stroke-width="1"/>`;
    };

    const generateSingle = () => {
        let cols, rows;
        if (singleLayout === 'row') { cols = singleCount; rows = 1; }
        else if (singleLayout === 'column') { cols = 1; rows = singleCount; }
        else if (singleLayout === 'stack') { cols = 1; rows = singleCount; }
        else {
            cols = Math.ceil(Math.sqrt(singleCount));
            rows = Math.ceil(singleCount / cols);
            if (cols === 0) cols = 1;
            if (rows === 0) rows = 1;
        }

        let items = "";
        let itemW = blockSize;
        let itemH = blockSize;

        if (singleUnit === 10) itemH = blockSize * 10;
        if (singleUnit === 100) { itemW = blockSize * 10; itemH = blockSize * 10; } // Wall
        if (singleUnit === 101) { itemW = blockSize * 10; itemH = blockSize; }     // Flat
        if (singleUnit === 1000) { itemW = blockSize * 10; itemH = blockSize * 10; } // Thousand

        const startX = 20;
        // If stacking or drawing tall items with 3D depth, we need a high enough startY to prevent clipping the top
        const startY = 20 + (is3D ? dy * 10 : 0) + (singleLayout === 'stack' ? (singleCount - 1) * itemH : 0);

        let index = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (index >= singleCount) break;

                let x = startX + c * (itemW + gapX);
                let y = startY + r * (itemH + gapY);

                if (singleLayout === 'stack') {
                    // stack goes UP (minus Y values) from bottom to top so that layering works properly
                    x = startX;
                    y = startY - r * itemH;
                }

                if (singleUnit === 1) items += `\n  ` + drawCube(x, y, blockSize, mainColor, edgeColor, topColor, sideColor);
                if (singleUnit === 10) items += `\n  ` + drawRod(x, y, blockSize, mainColor, edgeColor, topColor, sideColor);
                if (singleUnit === 100) items += `\n  ` + drawHundredWall(x, y, blockSize, mainColor, edgeColor, topColor, sideColor);
                if (singleUnit === 101) items += `\n  ` + drawHundredFlat(x, y, blockSize, mainColor, edgeColor, topColor, sideColor);
                if (singleUnit === 1000) items += `\n  ` + drawThousand(x, y, blockSize, mainColor, edgeColor, topColor, sideColor);

                if (singleUnit === 2) items += `\n  ` + drawCircle(x, y, blockSize, mainColor, edgeColor);
                if (singleUnit === 3) items += `\n  ` + drawStar(x, y, blockSize, mainColor, edgeColor);
                if (singleUnit === 4) items += `\n  ` + drawSquare(x, y, blockSize, mainColor, edgeColor);
                if (singleUnit === 5) items += `\n  ` + drawTriangle(x, y, blockSize, mainColor, edgeColor);
                index++;
            }
        }

        const width = startX + (singleLayout === 'stack' ? itemW : cols * (itemW + gapX) - gapX) + (is3D ? dx * 10 : 0) + 20;
        const height = startY + (singleLayout === 'stack' ? itemH : rows * (itemH + gapY) - gapY) + 20;

        return { items, width: Math.max(width, 20), height: Math.max(height, 20) };
    }

    const generateMixed = () => {
        let cursorX = 20;
        // Determine startY to accomodate drawing elements up towards Y=0 for 3D/Stacks
        let maxStackY = 0;
        if (hundredsCount > 0 && hundredsStyle === 'stack') {
            maxStackY = (hundredsCount - 1) * blockSize;
        }
        const startY = 20 + (is3D ? dy * 10 : 0) + maxStackY;

        let items = "";

        const addThousands = () => {
            for (let i = 0; i < thousandsCount; i++) {
                items += `\n  ` + drawThousand(cursorX, startY, blockSize, mainColor, edgeColor, topColor, sideColor);
                cursorX += blockSize * 10 + gapX + (is3D ? dx * 10 : 0);
            }
            if (thousandsCount > 0) cursorX -= gapX; // remove trailing gap
        };

        const addHundreds = () => {
            if (hundredsCount === 0) return;
            if (hundredsStyle === 'stack') {
                for (let i = 0; i < hundredsCount; i++) {
                    const stackY = startY - i * blockSize; // draw from bottom to top
                    items += `\n  ` + drawHundredFlat(cursorX, stackY, blockSize, mainColor, edgeColor, topColor, sideColor);
                }
                cursorX += blockSize * 10 + (is3D ? dx * 10 : 0);
            } else {
                for (let i = 0; i < hundredsCount; i++) {
                    items += `\n  ` + drawHundredWall(cursorX, startY, blockSize, mainColor, edgeColor, topColor, sideColor);
                    cursorX += blockSize * 10 + gapX + (is3D ? dx * 10 : 0);
                }
                cursorX -= gapX;
            }
        };

        const addTens = () => {
            for (let i = 0; i < tensCount; i++) {
                items += `\n  ` + drawRod(cursorX, startY, blockSize, mainColor, edgeColor, topColor, sideColor);
                cursorX += blockSize + gapX + (is3D ? dx : 0);
            }
            if (tensCount > 0) cursorX -= gapX;
        };

        const addOnes = () => {
            if (onesCount === 0) return;
            const cols = Math.min(onesCount, onesPerRow);
            const rows = Math.ceil(onesCount / onesPerRow);

            let index = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (index >= onesCount) break;
                    const x = cursorX + c * (blockSize + gapX + (is3D ? dx : 0));
                    const y = startY + r * (blockSize + gapY);
                    items += `\n  ` + drawCube(x, y, blockSize, mainColor, edgeColor, topColor, sideColor);
                    index++;
                }
            }
            cursorX += cols * (blockSize + gapX + (is3D ? dx : 0)) - gapX;
        };

        if (mixedOrder === 'thousands-hundreds-tens-ones') {
            if (thousandsCount > 0) addThousands();
            if (thousandsCount > 0 && (hundredsCount > 0 || tensCount > 0 || onesCount > 0)) cursorX += groupGap;
            if (hundredsCount > 0) addHundreds();
            if (hundredsCount > 0 && (tensCount > 0 || onesCount > 0)) cursorX += groupGap;
            if (tensCount > 0) addTens();
            if (tensCount > 0 && onesCount > 0) cursorX += groupGap;
            if (onesCount > 0) addOnes();
        } else if (mixedOrder === 'tens-ones') {
            if (tensCount > 0) addTens();
            if (tensCount > 0 && onesCount > 0) cursorX += groupGap;
            if (onesCount > 0) addOnes();
        } else if (mixedOrder === 'ones-tens') {
            if (onesCount > 0) addOnes();
            if (tensCount > 0 && onesCount > 0) cursorX += groupGap;
            if (tensCount > 0) addTens();
        } else if (mixedOrder === 'hundreds-tens-ones') {
            if (hundredsCount > 0) addHundreds();
            if (hundredsCount > 0 && (tensCount > 0 || onesCount > 0)) cursorX += groupGap;
            if (tensCount > 0) addTens();
            if (tensCount > 0 && onesCount > 0) cursorX += groupGap;
            if (onesCount > 0) addOnes();
        }

        const addCircles = () => {
            const cols = Math.min(circlesCount, onesPerRow);
            const rows = Math.ceil(circlesCount / onesPerRow);
            let index = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (index >= circlesCount) break;
                    const x = cursorX + c * (blockSize + gapX + (is3D ? dx : 0));
                    const y = startY + r * (blockSize + gapY);
                    items += `\n  ` + drawCircle(x, y, blockSize, mainColor, edgeColor);
                    index++;
                }
            }
            cursorX += cols * (blockSize + gapX + (is3D ? dx : 0)) - gapX;
        };

        const addStars = () => {
            const cols = Math.min(starsCount, onesPerRow);
            const rows = Math.ceil(starsCount / onesPerRow);
            let index = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (index >= starsCount) break;
                    const x = cursorX + c * (blockSize + gapX + (is3D ? dx : 0));
                    const y = startY + r * (blockSize + gapY);
                    items += `\n  ` + drawStar(x, y, blockSize, mainColor, edgeColor);
                    index++;
                }
            }
            cursorX += cols * (blockSize + gapX + (is3D ? dx : 0)) - gapX;
        };

        const addSquares = () => {
            const cols = Math.min(squaresCount, onesPerRow);
            const rows = Math.ceil(squaresCount / onesPerRow);
            let index = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (index >= squaresCount) break;
                    const x = cursorX + c * (blockSize + gapX + (is3D ? dx : 0));
                    const y = startY + r * (blockSize + gapY);
                    items += `\n  ` + drawSquare(x, y, blockSize, mainColor, edgeColor);
                    index++;
                }
            }
            cursorX += cols * (blockSize + gapX + (is3D ? dx : 0)) - gapX;
        };

        const addTriangles = () => {
            const cols = Math.min(trianglesCount, onesPerRow);
            const rows = Math.ceil(trianglesCount / onesPerRow);
            let index = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (index >= trianglesCount) break;
                    const x = cursorX + c * (blockSize + gapX + (is3D ? dx : 0));
                    const y = startY + r * (blockSize + gapY);
                    items += `\n  ` + drawTriangle(x, y, blockSize, mainColor, edgeColor);
                    index++;
                }
            }
            cursorX += cols * (blockSize + gapX + (is3D ? dx : 0)) - gapX;
        };

        let hasPreviousShape = (thousandsCount > 0 || hundredsCount > 0 || tensCount > 0 || onesCount > 0);

        if (circlesCount > 0) {
            if (hasPreviousShape) cursorX += groupGap;
            addCircles();
            hasPreviousShape = true;
        }
        if (starsCount > 0) {
            if (hasPreviousShape) cursorX += groupGap;
            addStars();
            hasPreviousShape = true;
        }
        if (squaresCount > 0) {
            if (hasPreviousShape) cursorX += groupGap;
            addSquares();
            hasPreviousShape = true;
        }
        if (trianglesCount > 0) {
            if (hasPreviousShape) cursorX += groupGap;
            addTriangles();
            hasPreviousShape = true;
        }

        const width = cursorX + 20;

        // Calculate max height intelligently
        let elements = [];
        if (thousandsCount > 0) elements.push(blockSize * 10);
        if (hundredsCount > 0) {
            if (hundredsStyle === 'stack') elements.push(blockSize);
            else elements.push(blockSize * 10);
        }
        if (tensCount > 0) elements.push(blockSize * 10);
        if (onesCount > 0) elements.push(Math.ceil(onesCount / onesPerRow) * (blockSize + gapY) - gapY);
        if (circlesCount > 0) elements.push(Math.ceil(circlesCount / onesPerRow) * (blockSize + gapY) - gapY);
        if (starsCount > 0) elements.push(Math.ceil(starsCount / onesPerRow) * (blockSize + gapY) - gapY);
        if (squaresCount > 0) elements.push(Math.ceil(squaresCount / onesPerRow) * (blockSize + gapY) - gapY);
        if (trianglesCount > 0) elements.push(Math.ceil(trianglesCount / onesPerRow) * (blockSize + gapY) - gapY);

        const highestElement = elements.length > 0 ? Math.max(...elements) : 0;
        const height = startY + highestElement + 20;

        return { items, width: Math.max(width, 20), height: Math.max(height, 20) };
    }

    const generateNumberLine = () => {
        const widthV = 800; 
        const heightV = 200;
        const paddingX = 40;
        const baselineY = 140;

        const range = nlMax - nlMin;
        const spacing = (widthV - paddingX * 2) / (range <= 0 ? 1 : range);

        const getX = (val) => paddingX + (val - nlMin) * spacing;

        let resItems = "";
        const finalLineColor = nlLineColor || '#7c1d1d';
        const finalTickColor = nlTickColor || '#1e293b';
        const finalJumpColor = nlJumpColor || '#ef4444';

        // Base Line
        resItems += `\n  <line x1="${paddingX - 20}" y1="${baselineY}" x2="${widthV - paddingX + 20}" y2="${baselineY}" stroke="${finalLineColor}" stroke-width="${nlLineThickness}" stroke-linecap="butt"/>`;

        // Arrows
        if (nlShowArrows) {
            resItems += `\n  <polygon points="${paddingX - 25},${baselineY} ${paddingX - 15},${baselineY - 6} ${paddingX - 15},${baselineY + 6}" fill="${finalLineColor}" />`;
            resItems += `\n  <polygon points="${widthV - paddingX + 25},${baselineY} ${widthV - paddingX + 15},${baselineY - 6} ${widthV - paddingX + 15},${baselineY + 6}" fill="${finalLineColor}" />`;
        }

        // Auto Ticks
        if (!nlHideAutoTicks) {
            for (let i = nlMin; i <= nlMax; i += nlStep) {
                const x = getX(i);
                const isJumped = nlJumps.some(j => j.start === i || j.end === i);
                resItems += `\n  <line x1="${x}" y1="${baselineY - 12}" x2="${x}" y2="${baselineY + 12}" stroke="${finalLineColor}" stroke-width="${Math.max(2, nlLineThickness / 2)}" stroke-linecap="round" />`;

                if (isJumped) {
                    resItems += `\n  <circle cx="${x}" cy="${baselineY}" r="12" fill="none" stroke="${finalJumpColor}" stroke-width="2" />`;
                }

                if (!nlBlankTicks && i % nlLabelStep === 0) {
                    resItems += `\n  <text x="${x}" y="${baselineY + 35}" text-anchor="middle" fill="${finalTickColor}" font-size="16" font-family="sans-serif" font-weight="bold">${i}</text>`;
                }
            }
        }

        // Jumps
        nlJumps.forEach((jump) => {
            const startX = getX(jump.start);
            const endX = getX(jump.end);
            if (startX < -1000 || startX > 2000 || endX < -1000 || endX > 2000) return; // Basic bounds check for insane jumps
            const midX = (startX + endX) / 2;

            const distance = Math.abs(jump.end - jump.start);
            const arcHeight = Math.min(distance * spacing * 0.4, 80);
            const controlY = baselineY - arcHeight * 2;

            // Curve
            resItems += `\n  <path d="M ${startX} ${baselineY} Q ${midX} ${controlY} ${endX} ${baselineY}" fill="none" stroke="${finalJumpColor}" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round" />`;

            const angle = Math.atan2(baselineY - controlY, endX - midX);
            const arrowSize = 10;
            const arrowPt1X = endX - arrowSize * Math.cos(angle - Math.PI / 6);
            const arrowPt1Y = baselineY - arrowSize * Math.sin(angle - Math.PI / 6);
            const arrowPt2X = endX - arrowSize * Math.cos(angle + Math.PI / 6);
            const arrowPt2Y = baselineY - arrowSize * Math.sin(angle + Math.PI / 6);

            resItems += `\n  <polygon points="${endX},${baselineY} ${arrowPt1X},${arrowPt1Y} ${arrowPt2X},${arrowPt2Y}" fill="${finalJumpColor}" />`;

            if (jump.label) {
                resItems += `\n  <text x="${midX}" y="${baselineY - (arcHeight * 1.1) - 5}" text-anchor="middle" fill="${finalJumpColor}" font-size="16" font-family="sans-serif" font-weight="bold">${jump.label}</text>`;
            }
        });

        // Objects / Emojis
        nlObjects.forEach((obj) => {
            const x = getX(obj.value);
            const y = baselineY + (obj.offsetY || 0);
            resItems += `\n  <text x="${x}" y="${y}" text-anchor="middle" font-size="${obj.fontSize || 24}">${obj.content || ''}</text>`;
            if (obj.label) {
                resItems += `\n  <text x="${x}" y="${y - (obj.fontSize || 24) - 5}" text-anchor="middle" fill="${finalTickColor}" font-size="14" font-family="sans-serif" font-weight="bold">${obj.label}</text>`;
            }
        });

        // Custom Ticks
        nlCustomTicks.forEach((tick) => {
            const x = getX(tick.value);
            resItems += `\n  <line x1="${x}" y1="${baselineY - 20}" x2="${x}" y2="${baselineY + 20}" stroke="${finalLineColor}" stroke-width="${Math.max(4, nlLineThickness / 1.5)}" stroke-linecap="round" />`;
            if (tick.label) {
                resItems += `\n  <text x="${x}" y="${baselineY - 30}" text-anchor="middle" fill="${finalTickColor}" font-size="24" font-family="sans-serif" font-weight="900">${tick.label}</text>`;
            }
        });

        return { items: resItems, width: widthV, height: heightV };
    }

    const { items, width, height } = useMemo(() => {
        if (mode === 'numberLine') return generateNumberLine();
        return mode === 'single' ? generateSingle() : generateMixed();
    }, [is3D, topColor, sideColor, mode, blockSize, gapX, gapY, mainColor, edgeColor, singleUnit, singleCount, singleLayout, mixedOrder, thousandsCount, hundredsCount, hundredsStyle, tensCount, onesCount, onesPerRow, groupGap, circlesCount, starsCount, squaresCount, trianglesCount, nlMin, nlMax, nlJumps, nlLineColor, nlTickColor, nlJumpColor, nlStep, nlLabelStep, nlShowArrows, nlBlankTicks, nlObjects, nlCustomTicks, nlLineThickness, nlHideAutoTicks]);

    const finalWidth = customWidth ? Number(customWidth) : width;
    const finalHeight = customHeight ? Number(customHeight) : height;

    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" class="base-ten-svg">\n  <style>\n    .base-ten-svg { height: auto; width: 100%; max-width: ${desktopMaxWidth}px; }\n    @media (max-width: 768px) { .base-ten-svg { max-width: ${mobileMaxWidth}px; } }\n  </style>${items}\n</svg>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(fullSvg);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([fullSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baseten-${mode}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const inputClasses = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white";
    const labelClasses = "block text-xs font-medium text-slate-500 mb-1";

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <LayoutTemplate className="w-8 h-8 text-brand-500" />
                    Shapes & Base Ten Generator <span className="text-sm font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full ml-2">PRO</span>
                </h1>
                <p className="text-slate-500 mt-1">Advanced layout engine for Base Ten blocks and geometric shapes</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-6 text-xs sm:text-sm">
                            <button
                                onClick={() => setMode('single')}
                                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 font-medium rounded-md transition-all ${mode === 'single' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Grid2X2 className="w-3 h-3 sm:w-4 sm:h-4" /> Single
                            </button>
                            <button
                                onClick={() => setMode('mixed')}
                                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 font-medium rounded-md transition-all ${mode === 'mixed' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Layers className="w-3 h-3 sm:w-4 sm:h-4" /> Mixed
                            </button>
                            <button
                                onClick={() => setMode('numberLine')}
                                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 font-medium rounded-md transition-all ${mode === 'numberLine' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" /> Num Line
                            </button>
                        </div>

                        <div className="space-y-5">
                            {mode === 'single' ? (
                                <>
                                    <div>
                                        <label className={labelClasses}>Units per Block</label>
                                        <select value={singleUnit} onChange={e => setSingleUnit(Number(e.target.value))} className={inputClasses}>
                                            <optgroup label="Base Ten Blocks">
                                                <option value={1}>Ones</option>
                                                <option value={10}>Tens</option>
                                                <option value={100}>Hundreds (Wall)</option>
                                                <option value={101}>Hundreds (Flat)</option>
                                                <option value={1000}>Thousands</option>
                                            </optgroup>
                                            <optgroup label="Basic Shapes (2D)">
                                                <option value={2}>Circles</option>
                                                <option value={3}>Stars</option>
                                                <option value={4}>Squares (Blocks)</option>
                                                <option value={5}>Triangles</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>How many blocks?</label>
                                        <input type="number" value={singleCount} min="1" max="500" onChange={e => setSingleCount(Number(e.target.value))} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Layout Strategy</label>
                                        <select value={singleLayout} onChange={e => setSingleLayout(e.target.value)} className={inputClasses}>
                                            <option value="row">Single Row</option>
                                            <option value="column">Single Column</option>
                                            <option value="grid">Auto Grid</option>
                                            <option value="stack">Stack (Vertical)</option>
                                        </select>
                                    </div>
                                </>
                            ) : mode === 'mixed' ? (
                                <>
                                    <div>
                                        <label className={labelClasses}>Mixed Rendering Order</label>
                                        <select value={mixedOrder} onChange={e => setMixedOrder(e.target.value)} className={inputClasses}>
                                            <option value="thousands-hundreds-tens-ones">Thousands → Hundreds → Tens → Ones</option>
                                            <option value="hundreds-tens-ones">Hundreds → Tens → Ones</option>
                                            <option value="tens-ones">Tens → Ones</option>
                                            <option value="ones-tens">Ones → Tens</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <label className={labelClasses}>Thousands Count</label>
                                            <input type="number" value={thousandsCount} min="0" onChange={e => setThousandsCount(Number(e.target.value) || 0)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Hundreds Count</label>
                                            <input type="number" value={hundredsCount} min="0" onChange={e => setHundredsCount(Number(e.target.value) || 0)} className={inputClasses} />
                                        </div>
                                        <div className="col-span-2 flex gap-4 mt-1">
                                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                                <input type="radio" checked={hundredsStyle === 'stack'} onChange={() => setHundredsStyle('stack')} className="accent-brand-600" />
                                                Stack (Flat)
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                                <input type="radio" checked={hundredsStyle === 'wall'} onChange={() => setHundredsStyle('wall')} className="accent-brand-600" />
                                                Wall (Upright)
                                            </label>
                                        </div>
                                        <hr className="col-span-2 border-slate-200" />
                                        <div>
                                            <label className={labelClasses}>Tens Count</label>
                                            <input type="number" value={tensCount} min="0" onChange={e => setTensCount(Number(e.target.value) || 0)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Ones Count</label>
                                            <input type="number" value={onesCount} min="0" onChange={e => setOnesCount(Number(e.target.value) || 0)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Ones per Row (Wrap)</label>
                                            <input type="number" value={onesPerRow} min="1" onChange={e => setOnesPerRow(Number(e.target.value) || 1)} className={inputClasses} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className={labelClasses}>Gap Between Groups</label>
                                            <input type="range" value={groupGap} min="0" max="100" onChange={e => setGroupGap(Number(e.target.value) || 0)} className="w-full accent-brand-600" />
                                            <div className="text-right text-xs text-slate-400 mt-1">{groupGap}px</div>
                                        </div>
                                        <hr className="col-span-2 border-slate-200" />
                                        <div className="col-span-2">
                                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Basic Shapes (Appended)</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelClasses}>Circles</label>
                                                    <input type="number" value={circlesCount} min="0" onChange={e => setCirclesCount(Number(e.target.value) || 0)} className={inputClasses} />
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Stars</label>
                                                    <input type="number" value={starsCount} min="0" onChange={e => setStarsCount(Number(e.target.value) || 0)} className={inputClasses} />
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Squares</label>
                                                    <input type="number" value={squaresCount} min="0" onChange={e => setSquaresCount(Number(e.target.value) || 0)} className={inputClasses} />
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Triangles</label>
                                                    <input type="number" value={trianglesCount} min="0" onChange={e => setTrianglesCount(Number(e.target.value) || 0)} className={inputClasses} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className={labelClasses}>Min Value</label>
                                            <input type="number" value={nlMin} onChange={e => setNlMin(Number(e.target.value))} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Max Value</label>
                                            <input type="number" value={nlMax} onChange={e => setNlMax(Number(e.target.value))} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Tick Step</label>
                                            <input type="number" value={nlStep} min="1" onChange={e => setNlStep(Math.max(1, Number(e.target.value) || 1))} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Label Step</label>
                                            <input type="number" value={nlLabelStep} min="1" onChange={e => setNlLabelStep(Math.max(1, Number(e.target.value) || 1))} className={inputClasses} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-6 py-2">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={nlShowArrows} onChange={e => setNlShowArrows(e.target.checked)} className="accent-brand-600 w-4 h-4 rounded border-slate-300" />
                                            Show Arrows
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={nlBlankTicks} onChange={e => setNlBlankTicks(e.target.checked)} className="accent-brand-600 w-4 h-4 rounded border-slate-300" />
                                            Hide Auto Labels
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={nlHideAutoTicks} onChange={e => setNlHideAutoTicks(e.target.checked)} className="accent-brand-600 w-4 h-4 rounded border-slate-300" />
                                            Manual Only (Hide Grid)
                                        </label>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-semibold text-slate-700">Jump Arcs</label>
                                            <button
                                                onClick={() => setNlJumps([...nlJumps, { start: nlMin, end: nlMax, label: '' }])}
                                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Jump
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {nlJumps.map((jump, idx) => (
                                                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-100">
                                                    <input
                                                        type="number"
                                                        placeholder="Start"
                                                        value={jump.start}
                                                        onChange={e => {
                                                            const newJumps = [...nlJumps];
                                                            newJumps[idx].start = Number(e.target.value);
                                                            setNlJumps(newJumps);
                                                        }}
                                                        className={`${inputClasses} !w-16 !px-2`}
                                                    />
                                                    <span className="text-slate-400">→</span>
                                                    <input
                                                        type="number"
                                                        placeholder="End"
                                                        value={jump.end}
                                                        onChange={e => {
                                                            const newJumps = [...nlJumps];
                                                            newJumps[idx].end = Number(e.target.value);
                                                            setNlJumps(newJumps);
                                                        }}
                                                        className={`${inputClasses} !w-16 !px-2`}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Label"
                                                        value={jump.label || ''}
                                                        onChange={e => {
                                                            const newJumps = [...nlJumps];
                                                            newJumps[idx].label = e.target.value;
                                                            setNlJumps(newJumps);
                                                        }}
                                                        className={`${inputClasses} flex-1 !px-2`}
                                                    />
                                                    <button
                                                        onClick={() => setNlJumps(nlJumps.filter((_, i) => i !== idx))}
                                                        className="p-1 text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {nlJumps.length === 0 && (
                                                <div className="text-xs text-slate-500 italic text-center py-2">No jumps added. Click 'Add Jump'.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-semibold text-slate-700">Dynamic Objects (Markers)</label>
                                            <button
                                                onClick={() => setNlObjects([...nlObjects, { value: nlMin, content: '⭐', offsetY: 0, fontSize: 24 }])}
                                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Marker
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {nlObjects.map((obj, idx) => (
                                                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">Emoji/Text</label>
                                                            <input
                                                                type="text"
                                                                value={obj.content}
                                                                onChange={e => {
                                                                    const next = [...nlObjects];
                                                                    next[idx].content = e.target.value;
                                                                    setNlObjects(next);
                                                                }}
                                                                className={`${inputClasses} !py-1`}
                                                            />
                                                        </div>
                                                        <div className="w-20">
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">Value</label>
                                                            <input
                                                                type="number"
                                                                value={obj.value}
                                                                onChange={e => {
                                                                    const next = [...nlObjects];
                                                                    next[idx].value = Number(e.target.value);
                                                                    setNlObjects(next);
                                                                }}
                                                                className={`${inputClasses} !py-1`}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => setNlObjects(nlObjects.filter((_, i) => i !== idx))}
                                                            className="p-1 text-slate-400 hover:text-red-500 mt-4"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">Offset Y</label>
                                                            <input
                                                                type="number"
                                                                value={obj.offsetY}
                                                                onChange={e => {
                                                                    const next = [...nlObjects];
                                                                    next[idx].offsetY = Number(e.target.value);
                                                                    setNlObjects(next);
                                                                }}
                                                                className={`${inputClasses} !py-1`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">Size (px)</label>
                                                            <input
                                                                type="number"
                                                                value={obj.fontSize}
                                                                onChange={e => {
                                                                    const next = [...nlObjects];
                                                                    next[idx].fontSize = Number(e.target.value);
                                                                    setNlObjects(next);
                                                                }}
                                                                className={`${inputClasses} !py-1`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {nlObjects.length === 0 && (
                                                <div className="text-xs text-slate-500 italic text-center py-2">No markers added.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-semibold text-slate-700">Manual Ticks (Large)</label>
                                            <button
                                                onClick={() => setNlCustomTicks([...nlCustomTicks, { value: (nlMin + nlMax) / 2, label: '' }])}
                                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Tick
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {nlCustomTicks.map((tick, idx) => (
                                                <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-slate-100 shadow-sm">
                                                    <div className="w-20">
                                                        <label className="text-[10px] text-slate-400 capitalize">Value</label>
                                                        <input
                                                            type="number"
                                                            value={tick.value}
                                                            onChange={e => {
                                                                const next = [...nlCustomTicks];
                                                                next[idx].value = Number(e.target.value);
                                                                setNlCustomTicks(next);
                                                            }}
                                                            className={`${inputClasses} !py-1 !px-2`}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] text-slate-400 capitalize">Label</label>
                                                        <input
                                                            type="text"
                                                            value={tick.label}
                                                            placeholder="Label (e.g. 2,000)"
                                                            onChange={e => {
                                                                const next = [...nlCustomTicks];
                                                                next[idx].label = e.target.value;
                                                                setNlCustomTicks(next);
                                                            }}
                                                            className={`${inputClasses} !py-1 !px-2`}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => setNlCustomTicks(nlCustomTicks.filter((_, i) => i !== idx))}
                                                        className="p-1 text-slate-400 hover:text-red-500 mt-4"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {nlCustomTicks.length === 0 && (
                                                <div className="text-xs text-slate-500 italic text-center py-2">No manual ticks added.</div>
                                            )}
                                        </div>
                                    </div>
                                    <hr className="border-slate-100" />
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClasses}>Line Thickness</label>
                                            <input type="range" min="1" max="40" value={nlLineThickness} onChange={e => setNlLineThickness(Number(e.target.value))} className="w-full accent-brand-600" />
                                            <div className="text-right text-[10px] text-slate-400 mt-1">{nlLineThickness}px</div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Base Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={nlLineColor} onChange={e => setNlLineColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                                                <input type="text" value={nlLineColor} onChange={e => setNlLineColor(e.target.value)} className={inputClasses} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Text Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={nlTickColor} onChange={e => setNlTickColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                                                <input type="text" value={nlTickColor} onChange={e => setNlTickColor(e.target.value)} className={inputClasses} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Jump Style Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={nlJumpColor} onChange={e => setNlJumpColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                                                <input type="text" value={nlJumpColor} onChange={e => setNlJumpColor(e.target.value)} className={inputClasses} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {mode !== 'numberLine' && (
                                <>
                                    <hr className="border-slate-100" />

                                    <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-800 flex-1">Isometrics (3D Projection)</span>
                                        <div className="relative flex items-center">
                                            <input type="checkbox" className="sr-only peer" checked={is3D} onChange={e => setIs3D(e.target.checked)} />
                                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                                        </div>
                                    </div>

                                    <hr className="border-slate-100" />

                                    {/* Shared Settings */}
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        <div>
                                            <label className={labelClasses}>Unit Size</label>
                                            <input type="number" value={blockSize} onChange={e => setBlockSize(Number(e.target.value) || 1)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Gap X</label>
                                            <input type="number" value={gapX} onChange={e => setGapX(Number(e.target.value) || 0)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Gap Y</label>
                                            <input type="number" value={gapY} onChange={e => setGapY(Number(e.target.value) || 0)} className={inputClasses} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pb-2">
                                        <div>
                                            <label className={labelClasses}>SVG Width Override</label>
                                            <input type="number" placeholder="Auto" value={customWidth} onChange={e => setCustomWidth(e.target.value)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>SVG Height Override</label>
                                            <input type="number" placeholder="Auto" value={customHeight} onChange={e => setCustomHeight(e.target.value)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>CSS Desktop Max Width</label>
                                            <input type="number" value={desktopMaxWidth} min="50" max="2000" onChange={e => setDesktopMaxWidth(Number(e.target.value) || 50)} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>CSS Mobile Max Width</label>
                                            <input type="number" value={mobileMaxWidth} min="50" max="1000" onChange={e => setMobileMaxWidth(Number(e.target.value) || 50)} className={inputClasses} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClasses}>Front Color</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={mainColor} onChange={e => setMainColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                                                <input type="text" value={mainColor} onChange={e => setMainColor(e.target.value)} className={inputClasses} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                            <div>
                                                <label className={labelClasses}>Top Face</label>
                                                <input type="color" value={topColor} onChange={e => setTopColor(e.target.value)} className="w-full h-8 rounded cursor-pointer border border-slate-300 p-0" disabled={!is3D} style={{ opacity: is3D ? 1 : 0.5 }} />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Right Face</label>
                                                <input type="color" value={sideColor} onChange={e => setSideColor(e.target.value)} className="w-full h-8 rounded cursor-pointer border border-slate-300 p-0" disabled={!is3D} style={{ opacity: is3D ? 1 : 0.5 }} />
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100">
                                            <label className={labelClasses}>Edge Outline</label>
                                            <div className="flex gap-2">
                                                <input type="color" value={edgeColor} onChange={e => setEdgeColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border border-slate-300 p-0" />
                                                <input type="text" value={edgeColor} onChange={e => setEdgeColor(e.target.value)} className={`${inputClasses} !py-1`} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview and Export */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Visual Preview */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-medium text-slate-700">Live Preview</h3>
                            <div className="flex gap-2 items-center">
                                <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 font-mono">
                                    {Math.round(width)} x {Math.round(height)} px
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50/50 flex flex-col items-center justify-center min-h-[500px] overflow-auto relative group">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 inline-block transition-all duration-300">
                                <div dangerouslySetInnerHTML={{ __html: fullSvg }} />
                            </div>

                            {/* SVG Download Button */}
                            <button
                                onClick={handleDownload}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" /> Download SVG
                            </button>
                        </div>
                    </div>

                    {/* Code Output */}
                    <div className="bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">SVG Code</span>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1.5 rounded-md"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied to Clipboard!' : 'Copy SVG'}
                            </button>
                        </div>
                        <div className="p-0 overflow-hidden relative">
                            <textarea
                                readOnly
                                value={fullSvg}
                                className="w-full h-48 bg-transparent text-slate-300 font-mono text-xs p-6 resize-none focus:outline-none"
                                spellCheck="false"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
