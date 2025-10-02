import React, { useState, useRef } from 'react';
import type { Racer, LineWall, BuildTool, Particle } from '../types';
import { GeometricShape } from './GeometricShape';

// Constants for board dimensions, must match useRaceLogic.ts
const LEVEL_WIDTH = 450;
const VIEWPORT_HEIGHT = 800; // The fixed height of the camera's view during a race
const ERASE_THRESHOLD = 15; // Proximity in pixels to select a wall for deletion
const SPEED_LINE_THRESHOLD = 7; // Min speed to show lines
const INDICATOR_OFFSET = 20;

interface RaceBoardProps {
  racers: Racer[];
  walls: LineWall[];
  particles: Particle[];
  isBuilding: boolean;
  buildTool: BuildTool;
  onAddWall: (wall: LineWall) => void;
  onDeleteWall: (index: number) => void;
  levelHeight: number;
  cameraY: number;
}

const RaceBoard: React.FC<RaceBoardProps> = ({ racers, walls, particles, isBuilding, buildTool, onAddWall, onDeleteWall, levelHeight, cameraY }) => {
  const [drawingLine, setDrawingLine] = useState<LineWall | null>(null);
  const [hoveredWallIndex, setHoveredWallIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getEventPoint = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    if ('touches' in e) { // Touch event
        if (e.touches.length > 0) {
            pt.x = e.touches[0].clientX;
            pt.y = e.touches[0].clientY;
        }
    } else { // Mouse event
        pt.x = e.clientX;
        pt.y = e.clientY;
    }
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const findClosestWall = (point: { x: number, y: number }): number | null => {
    let closestIndex: number | null = null;
    let minDistance = Infinity;
  
    walls.forEach((wall, index) => {
      if (wall.touchCount && wall.touchCount >= 2) return;
      const { x1, y1, x2, y2 } = wall;
      const lineX = x2 - x1;
      const lineY = y2 - y1;
      const lineLenSq = lineX * lineX + lineY * lineY;
      if (lineLenSq === 0) return;
  
      const t = Math.max(0, Math.min(1, ((point.x - x1) * lineX + (point.y - y1) * lineY) / lineLenSq));
      const closestX = x1 + t * lineX;
      const closestY = y1 + t * lineY;
  
      const dx = point.x - closestX;
      const dy = point.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
  
    if (closestIndex !== null && minDistance < ERASE_THRESHOLD) {
      return closestIndex;
    }
    return null;
  };

  // --- MOUSE Events ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isBuilding) return;
    if (buildTool === 'draw') {
        const { x, y } = getEventPoint(e);
        setDrawingLine({ x1: x, y1: y, x2: x, y2: y });
    } else if (buildTool === 'erase' && hoveredWallIndex !== null) {
        onDeleteWall(hoveredWallIndex);
        setHoveredWallIndex(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isBuilding) return;
    const point = getEventPoint(e);
    if (buildTool === 'draw' && drawingLine) {
      setDrawingLine(prev => prev ? { ...prev, x2: point.x, y2: point.y } : null);
    } else if (buildTool === 'erase') {
      const closestIndex = findClosestWall(point);
      setHoveredWallIndex(closestIndex);
    }
  };

  const handleMouseUp = () => {
    if (buildTool === 'draw' && drawingLine) {
        if (drawingLine.x1 !== drawingLine.x2 || drawingLine.y1 !== drawingLine.y2) {
          onAddWall(drawingLine);
        }
        setDrawingLine(null);
    }
  };
  
  const handleMouseLeave = () => {
    handleMouseUp();
    setHoveredWallIndex(null);
  }

  // --- TOUCH Events ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isBuilding) return;
    // Prevent page scroll while drawing
    e.preventDefault();
    if (buildTool === 'draw') {
        const { x, y } = getEventPoint(e);
        setDrawingLine({ x1: x, y1: y, x2: x, y2: y });
    } else if (buildTool === 'erase') {
        // Tap to delete on mobile, no hover state
        const point = getEventPoint(e);
        const closestIndex = findClosestWall(point);
        if (closestIndex !== null) {
            onDeleteWall(closestIndex);
        }
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isBuilding || !drawingLine) return;
    e.preventDefault();
    const point = getEventPoint(e);
    if (buildTool === 'draw' && drawingLine) {
      setDrawingLine(prev => prev ? { ...prev, x2: point.x, y2: point.y } : null);
    }
  };

  const handleTouchEnd = () => {
    if (buildTool === 'draw' && drawingLine) {
        if (drawingLine.x1 !== drawingLine.x2 || drawingLine.y1 !== drawingLine.y2) {
          onAddWall(drawingLine);
        }
        setDrawingLine(null);
    }
  };
  
  const getWallStyle = (wall: LineWall) => {
    switch(wall.shapeType) {
      case 'dots':
        return { className: 'stroke-slate-600', strokeWidth: "20" };
      case 'platforms':
        return { className: 'stroke-slate-400', strokeWidth: "15" };
      case 'triangles':
        return { className: 'stroke-slate-700', strokeWidth: "12" };
      case 'funnels':
        return { className: 'stroke-sky-600', strokeWidth: "18" };
      default: // User-drawn walls
        return { className: 'stroke-slate-500', strokeWidth: "15" };
    }
  };
  
  const cursorClass = isBuilding 
    ? (buildTool === 'draw' ? 'cursor-crosshair' : (hoveredWallIndex !== null ? 'cursor-pointer' : 'cursor-default'))
    : 'cursor-default';
    
  let viewBox: string;
  let viewboxYForIndicators = 0;

  if (isBuilding) {
    // In build mode, show the entire level, "zoomed out" to fit the container.
    viewBox = `0 0 ${LEVEL_WIDTH} ${levelHeight}`;
  } else {
    // In race mode, use a scrolling viewport that follows the camera.
    const viewboxY = Math.max(0, Math.min(levelHeight - VIEWPORT_HEIGHT, cameraY - VIEWPORT_HEIGHT / 2));
    viewBox = `0 ${viewboxY} ${LEVEL_WIDTH} ${VIEWPORT_HEIGHT}`;
    viewboxYForIndicators = viewboxY;
  }

  return (
    <div 
      className={`relative bg-slate-200 rounded-lg border-4 border-slate-300 overflow-hidden shadow-inner ${cursorClass}`}
      // This maintains a consistent aspect ratio for the viewport container.
      style={{ width: '100%', aspectRatio: `${LEVEL_WIDTH} / ${VIEWPORT_HEIGHT}`, touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg ref={svgRef} width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {/* Finish Line */}
        <line
          x1="0"
          y1={levelHeight - 5}
          x2={LEVEL_WIDTH}
          y2={levelHeight - 5}
          className="stroke-red-500"
          strokeWidth="10"
          strokeDasharray="20 20"
        />

        {/* Render Walls */}
        {walls.map((wall, index) => {
          const isHoveredForErase = isBuilding && buildTool === 'erase' && index === hoveredWallIndex;
          const isDamaged = wall.touchCount === 1;
          const isDestroyed = wall.touchCount && wall.touchCount >= 2;

          const baseStyle = getWallStyle(wall);
          let colorClass = baseStyle.className;
          
          if (isHoveredForErase || isDamaged) {
            colorClass = 'stroke-red-500';
          }
          
          const opacityClass = isDestroyed ? 'opacity-0' : 'opacity-100';

          return (
            <line
                key={`wall-${index}`}
                x1={wall.x1}
                y1={wall.y1}
                x2={wall.x2}
                y2={wall.y2}
                className={`${colorClass} transition-all duration-500 ${opacityClass}`}
                strokeWidth={isHoveredForErase ? "25" : baseStyle.strokeWidth}
                strokeLinecap="round"
                style={{ pointerEvents: isDestroyed ? 'none' : 'auto' }}
            />
          );
        })}

        {/* Render temporary drawing line */}
        {drawingLine && (
           <line
            x1={drawingLine.x1}
            y1={drawingLine.y1}
            x2={drawingLine.x2}
            y2={drawingLine.y2}
            className="stroke-sky-500 opacity-70"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray="10 10"
          />
        )}

        {/* Render Particles */}
        {!isBuilding && particles.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.size}
            className={p.color}
            style={{ opacity: p.lifespan / p.maxLifespan, pointerEvents: 'none' }}
          />
        ))}
        
        {/* Speed Lines */}
        {!isBuilding && racers.map(racer => {
          const speed = Math.sqrt(racer.vx * racer.vx + racer.vy * racer.vy);
          if (speed > SPEED_LINE_THRESHOLD) {
            const tailLength = Math.min(120, (speed - SPEED_LINE_THRESHOLD) * 10);
            const tailX = racer.x - (racer.vx / speed) * tailLength;
            const tailY = racer.y - (racer.vy / speed) * tailLength;
            return (
              <line
                key={`${racer.id}-speedline`}
                x1={racer.x}
                y1={racer.y}
                x2={tailX}
                y2={tailY}
                className={racer.color.replace('fill-', 'stroke-')}
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.4"
                style={{ pointerEvents: 'none' }}
              />
            )
          }
          return null;
        })}

        {/* Render Racers */}
        {racers.map(racer => (
          <g key={racer.id} transform={`translate(${racer.x}, ${racer.y})`}>
            <circle r={racer.radius} className={racer.color} stroke="#1e293b" strokeWidth="1" />
            <foreignObject x={-racer.radius} y={-racer.radius} width={racer.radius * 2} height={racer.radius * 2}>
              <div className="w-full h-full flex items-center justify-center">
                <GeometricShape shapeId={racer.id} className="w-1/2 h-1/2 text-white opacity-70" />
              </div>
            </foreignObject>
          </g>
        ))}

        {/* Off-screen Indicators */}
        {!isBuilding && racers.map(racer => {
            if (racer.y < viewboxYForIndicators) {
                return (
                    <path
                        key={`${racer.id}-indicator`}
                        d={`M ${racer.x - 8} ${viewboxYForIndicators + INDICATOR_OFFSET} L ${racer.x + 8} ${viewboxYForIndicators + INDICATOR_OFFSET} L ${racer.x} ${viewboxYForIndicators + INDICATOR_OFFSET + 8} z`}
                        className={racer.color}
                        style={{ pointerEvents: 'none' }}
                    />
                )
            }
            return null;
        })}
      </svg>
    </div>
  );
};

export default RaceBoard;