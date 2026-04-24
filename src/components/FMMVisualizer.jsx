import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, ChevronRight, Info } from 'lucide-react';

const SIZE = 640;
const MAX_LEVEL = 3;
const NUM_SEGMENTS = 70;

// Helper to get center of a cell
const getCenter = (level, x, y) => {
  const cellSize = SIZE / Math.pow(2, level);
  return {
    cx: x * cellSize + cellSize / 2,
    cy: y * cellSize + cellSize / 2,
    size: cellSize,
  };
};

const STEPS = ['INIT', 'P2M', 'M2M', 'M2L', 'L2L', 'L2P'];

const FMMVisualizer = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [segments, setSegments] = useState([]);
  const [m2lLevel, setM2lLevel] = useState(2);
  const [targetCellM2L, setTargetCellM2L] = useState({ level: 2, x: 1, y: 1 });

  const handleM2LLevelChange = (newLevel) => {
    setM2lLevel(newLevel);
    setTargetCellM2L({ level: newLevel, x: 1, y: 1 });
  };

  // Initialize dislocation segments
  const initSegments = () => {
    const newSegments = Array.from({ length: NUM_SEGMENTS }).map(() => {
      // Random center point for the segment
      const midX = Math.random() * (SIZE - 20) + 10;
      const midY = Math.random() * (SIZE - 20) + 10;
      
      // Random length and angle
      const length = Math.random() * 15 + 10; // 10 to 25 length
      const angle = Math.random() * Math.PI * 2;
      
      const dx = (length / 2) * Math.cos(angle);
      const dy = (length / 2) * Math.sin(angle);
      
      const cellSize = SIZE / 8;
      
      return {
        x1: midX - dx,
        y1: midY - dy,
        x2: midX + dx,
        y2: midY + dy,
        midX: midX,
        midY: midY,
        cellX: Math.floor(midX / cellSize),
        cellY: Math.floor(midY / cellSize),
      };
    });
    setSegments(newSegments);
    setCurrentStep(0);
  };

  useEffect(() => {
    initSegments();
  }, []);

  const stepName = STEPS[currentStep];

  // Draw Grid lines
  const renderGrid = () => {
    const lines = [];
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const numCells = Math.pow(2, level);
      const cellSize = SIZE / numCells;
      const strokeColor = `var(--grid-line-level${level})`;
      
      for (let i = 1; i < numCells; i++) {
        const pos = i * cellSize;
        lines.push(
          <line key={`v-${level}-${i}`} x1={pos} y1={0} x2={pos} y2={SIZE} stroke={strokeColor} strokeWidth={level === 1 ? 2 : 1} />
        );
        lines.push(
          <line key={`h-${level}-${i}`} x1={0} y1={pos} x2={SIZE} y2={pos} stroke={strokeColor} strokeWidth={level === 1 ? 2 : 1} />
        );
      }
    }
    return lines;
  };

  // Interaction List Logic for M2L
  const getInteractionList = (level, tx, ty) => {
    if (level < 2) return [];
    const parentX = Math.floor(tx / 2);
    const parentY = Math.floor(ty / 2);
    const list = [];
    
    for (let px = parentX - 1; px <= parentX + 1; px++) {
      for (let py = parentY - 1; py <= parentY + 1; py++) {
        if (px >= 0 && px < Math.pow(2, level - 1) && py >= 0 && py < Math.pow(2, level - 1)) {
          for (let cx = px * 2; cx <= px * 2 + 1; cx++) {
            for (let cy = py * 2; cy <= py * 2 + 1; cy++) {
              if (Math.abs(cx - tx) > 1 || Math.abs(cy - ty) > 1) {
                list.push({ x: cx, y: cy });
              }
            }
          }
        }
      }
    }
    return list;
  };

  const interactionList = useMemo(() => getInteractionList(targetCellM2L.level, targetCellM2L.x, targetCellM2L.y), [targetCellM2L]);

  const drawSegments = () => {
    return segments.map((s, i) => (
      <g key={`s-${i}`}>
        {/* Draw the dislocation segment line */}
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--color-particle)" strokeWidth="2" />
        {/* Draw the midpoint slightly to emphasize DDD center-of-mass/evaluation point */}
        <circle cx={s.midX} cy={s.midY} r={1.5} fill="var(--color-particle)" />
      </g>
    ));
  };

  const drawP2M = () => {
    if (stepName !== 'P2M') return null;
    
    const lines = segments.map((s, i) => {
      const center = getCenter(3, s.cellX, s.cellY);
      return (
        <motion.line
          key={`p2m-${i}`}
          x1={s.midX} y1={s.midY} x2={center.cx} y2={center.cy}
          stroke="var(--color-multipole)"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      );
    });

    const centers = [];
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const c = getCenter(3, x, y);
        centers.push(
          <motion.circle 
            key={`p2m-c-${x}-${y}`} 
            cx={c.cx} cy={c.cy} r={2} 
            fill="var(--color-multipole)" 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          />
        );
      }
    }

    return [...lines, ...centers];
  };

  const drawM2M = () => {
    if (stepName !== 'M2M' && stepName !== 'M2L' && stepName !== 'L2L' && stepName !== 'L2P') return null;
    const lines = [];
    
    if (stepName === 'M2M') {
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          const c3 = getCenter(3, x, y);
          const c2 = getCenter(2, Math.floor(x/2), Math.floor(y/2));
          lines.push(
            <motion.line
              key={`m2m-32-${x}-${y}`}
              x1={c3.cx} y1={c3.cy} x2={c2.cx} y2={c2.cy}
              stroke="var(--color-m2m)" strokeWidth="1"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />
          );
        }
      }
    }

    for (let level = 2; level <= 3; level++) {
      const numCells = Math.pow(2, level);
      for (let x = 0; x < numCells; x++) {
        for (let y = 0; y < numCells; y++) {
          const c = getCenter(level, x, y);
          const delay = stepName === 'M2M' ? (level === 2 ? 1.0 : 0) : 0;
          lines.push(
            <motion.circle 
              key={`m-${level}-${x}-${y}`} 
              cx={c.cx} cy={c.cy} r={level === 2 ? 4 : 2} 
              fill="var(--color-multipole)"
              initial={stepName === 'M2M' && level < 3 ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: delay }}
            />
          );
        }
      }
    }
    
    return lines;
  };

  const drawM2L = () => {
    if (stepName !== 'M2L') return null;
    const targetCenter = getCenter(targetCellM2L.level, targetCellM2L.x, targetCellM2L.y);
    
    return (
      <>
        <rect
          x={targetCellM2L.x * targetCenter.size}
          y={targetCellM2L.y * targetCenter.size}
          width={targetCenter.size}
          height={targetCenter.size}
          fill="var(--target-bg)"
          stroke="var(--color-local)"
          strokeWidth="2"
        />
        
        {interactionList.map((cell, i) => {
          const c = getCenter(targetCellM2L.level, cell.x, cell.y);
          return (
            <rect
              key={`il-rect-${i}`}
              x={cell.x * c.size}
              y={cell.y * c.size}
              width={c.size}
              height={c.size}
              fill="var(--interaction-bg)"
              stroke="var(--color-interaction)"
              strokeWidth="1"
            />
          );
        })}

        {interactionList.map((cell, i) => {
          const sourceCenter = getCenter(targetCellM2L.level, cell.x, cell.y);
          return (
            <motion.line
              key={`m2l-${i}`}
              x1={sourceCenter.cx} y1={sourceCenter.cy}
              x2={targetCenter.cx} y2={targetCenter.cy}
              stroke="var(--color-m2l)" strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 1.5, delay: i * 0.05 }}
            />
          );
        })}
        
        <circle cx={targetCenter.cx} cy={targetCenter.cy} r={6} fill="var(--color-local)" />
      </>
    );
  };

  const drawL2L = () => {
    if (stepName !== 'L2L' && stepName !== 'L2P') return null;
    const lines = [];
    
    if (stepName === 'L2L') {
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          const pCenter = getCenter(2, x, y);
          for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
              const cCenter = getCenter(3, x * 2 + dx, y * 2 + dy);
              lines.push(
                <motion.line
                  key={`l2l-23-${x}-${y}-${dx}-${dy}`}
                  x1={pCenter.cx} y1={pCenter.cy} x2={cCenter.cx} y2={cCenter.cy}
                  stroke="var(--color-l2l)" strokeWidth="1" strokeDasharray="4 4"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1 }}
                />
              );
            }
          }
        }
      }
    }

    // Always draw local centers in L2L and L2P
    for (let level = 2; level <= 3; level++) {
      const numCells = Math.pow(2, level);
      for (let x = 0; x < numCells; x++) {
        for (let y = 0; y < numCells; y++) {
          const c = getCenter(level, x, y);
          lines.push(<circle key={`l2lc-${level}-${x}-${y}`} cx={c.cx} cy={c.cy} r={level === 2 ? 4 : 2} fill="var(--color-local)" />);
        }
      }
    }

    return lines;
  };

  const drawL2P = () => {
    if (stepName !== 'L2P') return null;
    return segments.map((s, i) => {
      const center = getCenter(3, s.cellX, s.cellY);
      return (
        <motion.line
          key={`l2p-${i}`}
          x1={center.cx} y1={center.cy} x2={s.midX} y2={s.midY}
          stroke="var(--color-local)"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      );
    });
  };

  const nextStep = () => {
    setCurrentStep((s) => (s + 1) % STEPS.length);
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      <div className="glass-panel" style={{ width: SIZE, height: SIZE, position: 'relative' }}>
        <svg width={SIZE} height={SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
          {renderGrid()}
          {drawSegments()}
          {drawP2M()}
          {drawM2M()}
          {drawM2L()}
          {drawL2L()}
          {drawL2P()}
        </svg>

        {stepName === 'M2L' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, display: 'grid', gridTemplateColumns: `repeat(${Math.pow(2, m2lLevel)}, 1fr)`, gridTemplateRows: `repeat(${Math.pow(2, m2lLevel)}, 1fr)` }}>
            {Array.from({ length: Math.pow(4, m2lLevel) }).map((_, i) => {
              const x = i % Math.pow(2, m2lLevel);
              const y = Math.floor(i / Math.pow(2, m2lLevel));
              return (
                <div 
                  key={`click-area-${m2lLevel}-${i}`} 
                  style={{ cursor: 'pointer', border: '1px solid transparent' }}
                  onClick={() => setTargetCellM2L({ level: m2lLevel, x, y })}
                  onMouseEnter={() => setTargetCellM2L({ level: m2lLevel, x, y })}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ width: '320px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>FMM for DDD</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {STEPS.map((step, idx) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: idx === STEPS.length - 1 ? 0 : 1 }}>
              <div className={`step-dot ${idx <= currentStep ? 'active' : ''}`} title={step} />
              {idx < STEPS.length - 1 && <div className="step-line" style={{ background: idx < currentStep ? 'var(--accent-color)' : '' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--info-box-bg)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--info-box-border)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} /> {stepName}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: stepName === 'M2L' ? '1rem' : '0' }}>
            {stepName === 'INIT' && 'Initial distribution of Dislocation Segments in the 8x8 (Level 3) quadtree grid. Segments are assigned to cells based on their midpoints.'}
            {stepName === 'P2M' && 'Segment to Multipole (P2M): Dislocation segments in Level 3 cells are expanded into multipoles at their cell centers.'}
            {stepName === 'M2M' && 'Multipole to Multipole (M2M): Multipole expansions are translated from Level 3 to Level 2, and Level 2 to Level 1 parent cells.'}
            {stepName === 'M2L' && 'Multipole to Local (M2L): For well-separated cells (Interaction List), multipoles are converted to local expansions. Hover over cells to explore.'}
            {stepName === 'L2L' && 'Local to Local (L2L): Local expansions are translated from parent cells down to child cells (Level 1 -> 2 -> 3).'}
            {stepName === 'L2P' && 'Local to Segment (L2P): Local expansions at Level 3 leaf cells are evaluated at the midpoints of the Dislocation Segments to compute the long-range forces.'}
          </p>
          {stepName === 'M2L' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                className={`btn ${m2lLevel === 2 ? 'active' : ''}`} 
                onClick={() => handleM2LLevelChange(2)} 
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
              >
                Level 2 M2L
              </button>
              <button 
                className={`btn ${m2lLevel === 3 ? 'active' : ''}`} 
                onClick={() => handleM2LLevelChange(3)} 
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
              >
                Level 3 M2L
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn active" onClick={nextStep}>
            <ChevronRight size={18} /> Next Step
          </button>
          <button className="btn" onClick={initSegments}>
            <RotateCcw size={18} /> Reset & Randomize
          </button>
        </div>
      </div>
    </div>
  );
};

export default FMMVisualizer;
