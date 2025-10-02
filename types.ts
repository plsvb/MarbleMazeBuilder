export type RacerId = 'circle' | 'square' | 'triangle';

export type GameState = 'building' | 'idle' | 'racing' | 'finished';

export type BuildTool = 'draw' | 'erase';

export type RandomShapeType = 'dots' | 'platforms' | 'triangles' | 'funnels';

export interface Racer {
  id: RacerId;
  color: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface LineWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  shapeType?: RandomShapeType;
  touchCount?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifespan: number;
  maxLifespan: number;
  size: number;
  color: string;
}
