import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameState, Racer, RacerId, LineWall, Particle } from '../types';
import { playBounceSound, playBreakSound } from './audio';

// Physics and Board Constants
const LEVEL_WIDTH = 450;
const GRAVITY = 0.1; // Reduced from 0.2 to further slow down acceleration
const RESTITUTION = 0.70; // Bounciness. 1.0 = perfectly elastic (no energy loss)
const RACER_RADIUS = 20;
const MAX_SPEED = 15; // Reduced from 20 to cap speed earlier
const VIEWPORT_HEIGHT = 800; // The fixed height of the camera's view

const createInitialRacers = (): Racer[] => [
  { id: 'circle', name: 'Circle', color: 'fill-teal-500', x: LEVEL_WIDTH * 0.25, y: 30, vx: (Math.random() - 0.5) * 2, vy: 0, radius: RACER_RADIUS },
  { id: 'square', name: 'Square', color: 'fill-sky-500', x: LEVEL_WIDTH * 0.5, y: 30, vx: (Math.random() - 0.5) * 2, vy: 0, radius: RACER_RADIUS },
  { id: 'triangle', name: 'Triangle', color: 'fill-orange-500', x: LEVEL_WIDTH * 0.75, y: 30, vx: (Math.random() - 0.5) * 2, vy: 0, radius: RACER_RADIUS },
];

export const useRaceLogic = ({ levelHeight }: { levelHeight: number }) => {
  const [racers, setRacers] = useState<Racer[]>(createInitialRacers());
  const [walls, setWalls] = useState<LineWall[]>([]);
  const [gameState, setGameState] = useState<GameState>('building');
  const [winner, setWinner] = useState<Racer | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [cameraY, setCameraY] = useState<number>(VIEWPORT_HEIGHT / 2);
  const animationFrameRef = useRef<number | null>(null);
  const raceStateRef = useRef({ racers, winner: null as Racer | null, walls, gameState, particles, cameraY });
  const prevWallsRef = useRef<LineWall[]>(walls);


  useEffect(() => {
    raceStateRef.current = { racers, winner, walls, gameState, particles, cameraY };
  }, [racers, winner, walls, gameState, particles, cameraY]);

  // Effect to generate particles when a wall is destroyed
  useEffect(() => {
    if (gameState !== 'racing') return;

    const newParticles: Particle[] = [];
    walls.forEach((wall, index) => {
      const prevWall = prevWallsRef.current[index];
      // Check if the wall was just destroyed in this state update
      if (wall.touchCount === 2 && (!prevWall || prevWall.touchCount < 2)) {
        const midX = (wall.x1 + wall.x2) / 2;
        const midY = (wall.y1 + wall.y2) / 2;
        const particleCount = 8 + Math.floor(Math.random() * 5); // 8 to 12 particles

        for (let i = 0; i < particleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 2;
          const lifespan = 40 + Math.floor(Math.random() * 20);
          newParticles.push({
            id: `p-${Date.now()}-${Math.random()}`,
            x: midX,
            y: midY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifespan: lifespan,
            maxLifespan: lifespan,
            size: 1.5 + Math.random() * 2,
            color: 'fill-yellow-400',
          });
        }
      }
    });

    if (newParticles.length > 0) {
      setParticles(prev => [...prev, ...newParticles]);
    }
    
    // Update the ref for the next render
    prevWallsRef.current = walls;
  }, [walls, gameState]);


  const updateRace = useCallback(() => {
    if (raceStateRef.current.winner) {
      setGameState('finished');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // --- PARTICLE UPDATE ---
    if (raceStateRef.current.particles.length > 0) {
        const updatedParticles = raceStateRef.current.particles
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.05, // A little gravity for the particles
            lifespan: p.lifespan - 1,
          }))
          .filter(p => p.lifespan > 0);
        setParticles(updatedParticles);
    }


    const wallHitMap = new Map<number, number>();

    const newRacers = raceStateRef.current.racers.map(racer => {
      let { x, y, vx, vy, radius } = racer;

      // Apply gravity
      vy += GRAVITY;

      // Update position
      x += vx;
      y += vy;

      // Board boundary collision
      if (x - radius < 0 || x + radius > LEVEL_WIDTH) {
        if (Math.abs(vx) > 0.5) {
            playBounceSound(0.2, 300 + Math.random() * 200);
        }
        vx *= -RESTITUTION;
        x = x - radius < 0 ? radius : LEVEL_WIDTH - radius;
      }
      
      // Maze wall collision (Circle-to-Line-Segment)
      raceStateRef.current.walls.forEach((wall, index) => {
        const currentTouchCount = wall.touchCount || 0;
        if (currentTouchCount >= 2) return; // Ignore destroyed walls

        const { x1, y1, x2, y2 } = wall;

        // Find the closest point on the line segment to the circle's center
        const lineX = x2 - x1;
        const lineY = y2 - y1;
        const lineLenSq = lineX * lineX + lineY * lineY;
        
        if (lineLenSq === 0) return; // Skip if wall is a point

        const t = Math.max(0, Math.min(1, ((x - x1) * lineX + (y - y1) * lineY) / lineLenSq));
        const closestX = x1 + t * lineX;
        const closestY = y1 + t * lineY;

        const dx = x - closestX;
        const dy = y - closestY;
        const distanceSq = dx * dx + dy * dy;

        // Check for overlap
        if (distanceSq < radius * radius) {
          wallHitMap.set(index, currentTouchCount + 1);

          const distance = distanceSq > 0 ? Math.sqrt(distanceSq) : 0;
          
          if (distance === 0) {
            x += (y2 - y1) * 0.01;
            y += (x1 - x2) * 0.01;
            return;
          }

          const collisionNormalX = dx / distance;
          const collisionNormalY = dy / distance;

          const overlap = radius - distance;
          x += collisionNormalX * (overlap + 0.01);
          y += collisionNormalY * (overlap + 0.01);

          const velDotNormal = vx * collisionNormalX + vy * collisionNormalY;
          if (velDotNormal < 0) {
            const impactVolume = Math.min(0.5, Math.abs(velDotNormal) / 20);

            if (impactVolume > 0.05) {
                if (currentTouchCount === 0) { // First hit
                    playBounceSound(impactVolume, 400 + Math.random() * 300);
                } else if (currentTouchCount === 1) { // Second hit
                    playBreakSound(impactVolume * 1.5, 200 + Math.random() * 100);
                }
            }
            
            const normalVelocityMagnitude = velDotNormal;
            
            const tangentVx = vx - normalVelocityMagnitude * collisionNormalX;
            const tangentVy = vy - normalVelocityMagnitude * collisionNormalY;

            const newNormalVelocityMagnitude = -normalVelocityMagnitude * RESTITUTION;

            vx = tangentVx + newNormalVelocityMagnitude * collisionNormalX;
            vy = tangentVy + newNormalVelocityMagnitude * collisionNormalY;
          }
        }
      });
      
      // Cap speed
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > MAX_SPEED) {
        vx = (vx / speed) * MAX_SPEED;
        vy = (vy / speed) * MAX_SPEED;
      }

      // Check for winner
      if (y > levelHeight && !raceStateRef.current.winner) {
         setWinner(racer);
      }

      return { ...racer, x, y, vx, vy };
    });

    if (wallHitMap.size > 0) {
        setWalls(prevWalls => 
            prevWalls.map((wall, index) => {
                if (wallHitMap.has(index)) {
                    return { ...wall, touchCount: wallHitMap.get(index) };
                }
                return wall;
            })
        );
    }
    
    // --- CAMERA UPDATE ---
    const leadRacerY = Math.max(0, ...newRacers.map(r => r.y));
    const targetCameraY = Math.max(VIEWPORT_HEIGHT / 2, leadRacerY);
    const currentCameraY = raceStateRef.current.cameraY;
    const newCameraY = currentCameraY + (targetCameraY - currentCameraY) * 0.08; // Smooth follow
    setCameraY(newCameraY);
    
    setRacers(newRacers);
    animationFrameRef.current = requestAnimationFrame(updateRace);
  }, [levelHeight]);

  const startRace = useCallback(() => {
    if (raceStateRef.current.gameState === 'idle') {
      setGameState('racing');
      animationFrameRef.current = requestAnimationFrame(updateRace);
    }
  }, [updateRace]);

  const resetRace = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setRacers(createInitialRacers());
    setWinner(null);
    setParticles([]);
    setCameraY(VIEWPORT_HEIGHT / 2);
    prevWallsRef.current = [];
    // Reset walls to be visible again by removing 'touchCount' property
    setWalls(prevWalls => prevWalls.map(({ touchCount, ...rest }) => rest));
  }, []);

  const restartCurrentRace = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setRacers(createInitialRacers());
    setWinner(null);
    setParticles([]);
    setCameraY(VIEWPORT_HEIGHT / 2);
    prevWallsRef.current = [];
    setWalls(prevWalls => prevWalls.map(({ touchCount, ...rest }) => rest));
    
    if (raceStateRef.current.gameState === 'racing') {
        animationFrameRef.current = requestAnimationFrame(updateRace);
    }
  }, [updateRace]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return { 
    gameState, 
    setGameState, 
    racers, 
    walls, 
    setWalls, 
    winner, 
    particles,
    cameraY,
    startRace, 
    resetRace,
    restartCurrentRace,
  };
};