import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, ChevronRight, Info } from 'lucide-react';

const SIZE = 640;
const MAX_LEVEL = 3;
const NUM_PARTICLES = 100;

// Helper to get center of a cell
const getCenter = (level, x, y) => {
  const cellSize = SIZE / Math.pow(2, level);
  return {
    cx: x * cellSize + cellSize / 2,
    cy: y * cellSize + cellSize / 2,
    size: cellSize,
  };
};

const STEPS = ['INIT', 'P2M', 'M2M', 'M2L', 'L2L'];

const FMMVisualizer = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [particles, setParticles] = useState([]);
  const [targetCellM2L, setTargetCellM2L] = useState({ level: 2, x: 1, y: 1 });
  const [targetCellL2L, setTargetCellL2L] = useState(null);

  // Initialize particles
  const initParticles = () => {
    const newParticles = Array.from({ length: NUM_PARTICLES }).map(() => {
      const px = Math.random() * SIZE;
      const py = Math.random() * SIZE;
      const cellSize = SIZE / 8;
      return {
        x: px,
        y: py,
        cellX: Math.floor(px / cellSize),
        cellY: Math.floor(py / cellSize),
      };
    });
    setParticles(newParticles);
    setCurrentStep(0);
  };

  useEffect(() => {
    initParticles();
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
    if (level < 2) return []; // M2L usually starts from level 2
    const parentX = Math.floor(tx / 2);
    const parentY = Math.floor(ty / 2);
    const list = [];
    
    // Parent's neighbors
    for (let px = parentX - 1; px <= parentX + 1; px++) {
      for (let py = parentY - 1; py <= parentY + 1; py++) {
        if (px >= 0 && px < Math.pow(2, level - 1) && py >= 0 && py < Math.pow(2, level - 1)) {
          // Children of parent's neighbors
          for (let cx = px * 2; cx <= px * 2 + 1; cx++) {
            for (let cy = py * 2; cy <= py * 2 + 1; cy++) {
              // Not neighbor of target
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

  const drawParticles = () => {
    return particles.map((p, i) => (
      <circle key={`p-${i}`} cx={p.x} cy={p.y} r={2} fill="var(--color-particle)" opacity={0.8} />
    ));
  };

  const drawP2M = () => {
    if (stepName !== 'P2M') return null;
    return particles.map((p, i) => {
      const center = getCenter(3, p.cellX, p.cellY);
      return (
        <motion.line
          key={`p2m-${i}`}
          x1={p.x} y1={p.y} x2={center.cx} y2={center.cy}
          stroke="var(--color-multipole)"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      );
    });
  };

  const drawM2M = () => {
    if (stepName !== 'M2M' && stepName !== 'M2L' && stepName !== 'L2L') return null;
    const lines = [];
    
    // Draw Level 3 multipoles (dots)
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
      
      // Level 2 to Level 1
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          const c2 = getCenter(2, x, y);
          const c1 = getCenter(1, Math.floor(x/2), Math.floor(y/2));
          lines.push(
            <motion.line
              key={`m2m-21-${x}-${y}`}
              x1={c2.cx} y1={c2.cy} x2={c1.cx} y2={c1.cy}
              stroke="var(--color-m2m)" strokeWidth="1.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 1 }}
            />
          );
        }
      }
    }

    // Always show Multipole centers for visualization
    for (let level = 2; level <= 3; level++) {
      const numCells = Math.pow(2, level);
      for (let x = 0; x < numCells; x++) {
        for (let y = 0; y < numCells; y++) {
          const c = getCenter(level, x, y);
          lines.push(
            <circle key={`m-${level}-${x}-${y}`} cx={c.cx} cy={c.cy} r={level === 2 ? 4 : 2} fill="var(--color-multipole)" />
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
        {/* Highlight Target Cell */}
        <rect
          x={targetCellM2L.x * targetCenter.size}
          y={targetCellM2L.y * targetCenter.size}
          width={targetCenter.size}
          height={targetCenter.size}
          fill="var(--target-bg)"
          stroke="var(--color-local)"
          strokeWidth="2"
        />
        
        {/* Highlight Interaction List Cells */}
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

        {/* Draw M2L Translation arrows */}
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
    if (stepName !== 'L2L') return null;
    const lines = [];
    
    // Level 1 to Level 2
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        const pCenter = getCenter(1, x, y);
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            const cCenter = getCenter(2, x * 2 + dx, y * 2 + dy);
            lines.push(
              <motion.line
                key={`l2l-12-${x}-${y}-${dx}-${dy}`}
                x1={pCenter.cx} y1={pCenter.cy} x2={cCenter.cx} y2={cCenter.cy}
                stroke="var(--color-l2l)" strokeWidth="2"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
            );
            lines.push(<circle key={`l2lc-2-${x * 2 + dx}-${y * 2 + dy}`} cx={cCenter.cx} cy={cCenter.cy} r={4} fill="var(--color-local)" />);
          }
        }
        lines.push(<circle key={`l2lp-1-${x}-${y}`} cx={pCenter.cx} cy={pCenter.cy} r={6} fill="var(--color-local)" />);
      }
    }

    // Level 2 to Level 3
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
                transition={{ duration: 1, delay: 1 }}
              />
            );
            lines.push(<circle key={`l2lc-3-${x * 2 + dx}-${y * 2 + dy}`} cx={cCenter.cx} cy={cCenter.cy} r={2} fill="var(--color-local)" />);
          }
        }
      }
    }

    return lines;
  };

  const nextStep = () => {
    setCurrentStep((s) => (s + 1) % STEPS.length);
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      {/* Visualizer Domain */}
      <div className="glass-panel" style={{ width: SIZE, height: SIZE, position: 'relative' }}>
        <svg width={SIZE} height={SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Base Grid */}
          {renderGrid()}
          
          {/* Particles */}
          {drawParticles()}

          {/* FMM Steps */}
          {drawP2M()}
          {drawM2M()}
          {drawM2L()}
          {drawL2L()}
        </svg>

        {/* Interaction layer for M2L */}
        {stepName === 'M2L' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const x = i % 4;
              const y = Math.floor(i / 4);
              return (
                <div 
                  key={`click-area-${i}`} 
                  style={{ cursor: 'pointer', border: '1px solid transparent' }}
                  onClick={() => setTargetCellM2L({ level: 2, x, y })}
                  onMouseEnter={() => setTargetCellM2L({ level: 2, x, y })}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="glass-panel" style={{ width: '320px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>FMM Visualization</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {STEPS.map((step, idx) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={`step-dot ${idx <= currentStep ? 'active' : ''}`} />
              {idx < STEPS.length - 1 && <div className="step-line" style={{ background: idx < currentStep ? 'var(--accent-color)' : '' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--info-box-bg)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--info-box-border)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} /> {stepName}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {stepName === 'INIT' && 'Initial distribution of particles in the 8x8 (Level 3) quadtree grid.'}
            {stepName === 'P2M' && 'Particle to Multipole (P2M): Particles in Level 3 cells form multipole expansions at their cell centers.'}
            {stepName === 'M2M' && 'Multipole to Multipole (M2M): Multipole expansions are translated from Level 3 to Level 2, and Level 2 to Level 1 parent cells.'}
            {stepName === 'M2L' && 'Multipole to Local (M2L): For well-separated cells (Interaction List), multipoles are converted to local expansions. Hover/Click Level 2 cells to see their interaction lists!'}
            {stepName === 'L2L' && 'Local to Local (L2L): Local expansions are translated from parent cells down to child cells (Level 1 -> 2 -> 3).'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn active" onClick={nextStep}>
            <ChevronRight size={18} /> Next Step
          </button>
          <button className="btn" onClick={initParticles}>
            <RotateCcw size={18} /> Reset & Randomize
          </button>
        </div>
      </div>
    </div>
  );
};

export default FMMVisualizer;
