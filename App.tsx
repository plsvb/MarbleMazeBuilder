import React, { useState } from 'react';
import { useRaceLogic } from './hooks/useRaceLogic';
import RaceBoard from './components/RaceBoard';
import WinnerModal from './components/WinnerModal';
import { LineWall, RacerId, BuildTool, RandomShapeType } from './types';
import { ensureAudioContext, toggleBackgroundMusic, loadSounds } from './hooks/audio';

// Constants from useRaceLogic to be used in maze generation
const LEVEL_WIDTH = 450;

const App: React.FC = () => {
  const [levelHeight, setLevelHeight] = useState<number>(800);
  const { 
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
  } = useRaceLogic({ levelHeight });
  
  const [buildTool, setBuildTool] = useState<BuildTool>('draw');
  const [randomShape, setRandomShape] = useState<RandomShapeType>('dots');
  const [randomCount, setRandomCount] = useState<number>(150);
  const [isMuted, setIsMuted] = useState(true);


  const getRacerName = (id: RacerId) => {
    switch (id) {
      case 'circle':
        return 'Circle';
      case 'square':
        return 'Square';
      case 'triangle':
        return 'Triangle';
    }
  };
  
  const handleGenerateRandomMaze = () => {
    const newWalls: LineWall[] = [];
    const count = randomCount;
    const padding = 0; // Padding from level edges
    const startY = 150; // Don't spawn things right at the top
    const endY = levelHeight - 50; // Don't spawn things right at the bottom
    const spawnHeight = endY - startY;

    switch (randomShape) {
        case 'dots':
            const dotSize = 1;
            for (let i = 0; i < count; i++) {
                const x = Math.random() * (LEVEL_WIDTH - padding * 2) + padding;
                const y = Math.random() * spawnHeight + startY;
                newWalls.push({ x1: x - dotSize / 2, y1: y, x2: x + dotSize / 2, y2: y, shapeType: randomShape });
            }
            break;
        
        case 'platforms':
            const minLength = 40;
            const maxLength = 120;
            for (let i = 0; i < count; i++) {
                const length = Math.random() * (maxLength - minLength) + minLength;
                const x = Math.random() * (LEVEL_WIDTH - length - padding * 2) + padding;
                const y = Math.random() * spawnHeight + startY;
                newWalls.push({ x1: x, y1: y, x2: x + length, y2: y, shapeType: randomShape });
            }
            break;

        case 'triangles':
            const triangleSize = 30;
            for (let i = 0; i < count; i++) {
                const cx = Math.random() * (LEVEL_WIDTH - padding * 2) + padding;
                const cy = Math.random() * spawnHeight + startY;
                const angle = Math.random() * Math.PI * 2;
                
                const points = [];
                for (let j = 0; j < 3; j++) {
                    const theta = angle + (j * 2 * Math.PI / 3);
                    points.push({
                        x: cx + Math.cos(theta) * triangleSize,
                        y: cy + Math.sin(theta) * triangleSize
                    });
                }

                newWalls.push({ x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y, shapeType: randomShape });
                newWalls.push({ x1: points[1].x, y1: points[1].y, x2: points[2].x, y2: points[2].y, shapeType: randomShape });
                newWalls.push({ x1: points[2].x, y1: points[2].y, x2: points[0].x, y2: points[0].y, shapeType: randomShape });
            }
            break;

        case 'funnels':
            const funnelArmLength = 60;
            const funnelAngle = Math.PI / 4; // 45 degrees
            for (let i = 0; i < count; i++) {
                const cx = Math.random() * (LEVEL_WIDTH - padding * 2) + padding;
                const cy = Math.random() * spawnHeight + startY;
                
                const p1 = { x: cx, y: cy };
                const p2 = {
                    x: cx - Math.cos(funnelAngle) * funnelArmLength,
                    y: cy + Math.sin(funnelAngle) * funnelArmLength
                };
                const p3 = {
                    x: cx + Math.cos(funnelAngle) * funnelArmLength,
                    y: cy + Math.sin(funnelAngle) * funnelArmLength
                };
                
                newWalls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, shapeType: randomShape });
                newWalls.push({ x1: p1.x, y1: p1.y, x2: p3.x, y2: p3.y, shapeType: randomShape });
            }
            break;
    }
    setWalls(newWalls);
  };

  const handleAddWall = (wall: LineWall) => {
    setWalls(prevWalls => [...prevWalls, wall]);
  };
  
  const handleDeleteWall = (index: number) => {
    setWalls(prev => prev.filter((_, i) => i !== index));
  }
  
  const handleRaceAgain = () => {
    ensureAudioContext();
    resetRace();
    setGameState('idle');
    // Use a timeout to allow state to update before starting the race
    // This ensures startRace's internal condition (gameState === 'idle') passes
    setTimeout(() => {
        startRace();
    }, 0);
  };
  
  const handleEditMaze = () => {
    resetRace();
    setGameState('building');
  };

  const handleLockMaze = () => {
    ensureAudioContext();
    loadSounds(); // Load custom sounds when the user is ready to play
    setGameState('idle');
  }

  const handleStartRace = () => {
    ensureAudioContext();
    startRace();
  }
  
  const handleClearMaze = () => {
    setWalls([]);
  }

  const handleRestartRace = () => {
    ensureAudioContext();
    restartCurrentRace();
  }
  
  const handleToggleMusic = () => {
    // The toggle function returns the new "muted" state.
    setIsMuted(toggleBackgroundMusic());
  }

  return (
    <div className="bg-slate-800 text-slate-100 min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 font-sans">
      <header className="relative w-full max-w-[450px] text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Marble Maze Mayhem</h1>
        <p className="text-slate-400">Build the course. Just draw or use Generator below. Race to the finish.</p>
        <button onClick={handleToggleMusic} className="absolute top-0 right-0 p-2 text-slate-400 hover:text-white transition-colors" aria-label="Toggle background music">
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .89-1.077 1.337-1.707.707L5.586 15zM17 14l-4-4m0 4l4-4" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .89-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </header>

      <main className="w-full max-w-[450px] flex flex-col items-center">
        <RaceBoard 
          racers={racers}
          walls={walls}
          particles={particles}
          isBuilding={gameState === 'building'}
          buildTool={buildTool}
          onAddWall={handleAddWall}
          onDeleteWall={handleDeleteWall}
          levelHeight={levelHeight}
          cameraY={cameraY}
        />
      </main>

      <footer className="w-full max-w-[450px] mt-4 p-3 bg-slate-700 rounded-lg shadow-lg">
        {gameState === 'building' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-slate-300">TOOLS</span>
              <div className="flex items-center bg-slate-800 rounded-full p-1">
                <button onClick={() => setBuildTool('draw')} className={`px-3 py-1 rounded-full text-xs sm:text-sm transition-colors ${buildTool === 'draw' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-600'}`}>Draw</button>
                <button onClick={() => setBuildTool('erase')} className={`px-3 py-1 rounded-full text-xs sm:text-sm transition-colors ${buildTool === 'erase' ? 'bg-red-500 text-white' : 'text-slate-400 hover:bg-slate-600'}`}>Erase</button>
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-300 text-center">Level Settings</p>
              <div className="flex items-center gap-3">
                <label htmlFor="levelHeight" className="text-sm text-slate-400">Height:</label>
                <input 
                  id="levelHeight"
                  type="range" 
                  min="400" 
                  max="1600" 
                  step="50" 
                  value={levelHeight} 
                  onChange={e => setLevelHeight(parseInt(e.target.value))} 
                  className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono w-12 text-center text-white">{levelHeight}px</span>
              </div>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-slate-300 text-center">Random Maze Generator</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={randomShape} onChange={e => setRandomShape(e.target.value as RandomShapeType)} className="bg-slate-600 text-white rounded-md px-2 py-1 flex-grow focus:ring-2 focus:ring-sky-500 outline-none text-sm">
                  <option value="dots">Dots</option>
                  <option value="platforms">Platforms</option>
                  <option value="triangles">Triangles</option>
                  <option value="funnels">Funnels</option>
                </select>
                <input type="number" value={randomCount} onChange={e => setRandomCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} className="bg-slate-600 text-white rounded-md px-2 py-1 w-20 focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
                <button onClick={handleGenerateRandomMaze} className="px-4 py-1 font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 text-sm">Generate</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleClearMaze} className="w-full px-4 py-2 font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Clear</button>
              <button onClick={handleLockMaze} className="w-full px-4 py-2 font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">Race Mode</button>
            </div>
          </div>
        )}
        {gameState === 'idle' && (
          <div className="flex gap-4 justify-center">
            <button onClick={handleStartRace} className="flex-grow px-6 py-3 text-lg font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">Start Race</button>
            <button onClick={handleEditMaze} className="px-6 py-3 text-lg font-semibold rounded-lg bg-slate-500 text-white hover:bg-slate-600 transition-colors">Edit Maze</button>
          </div>
        )}
        {gameState === 'racing' && (
          <div className="flex gap-4 justify-center">
            <button onClick={handleRestartRace} className="w-full px-6 py-3 text-lg font-bold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors">Restart Race</button>
          </div>
        )}
      </footer>

      {gameState === 'finished' && winner && (
        <WinnerModal 
          winner={winner}
          onRaceAgain={handleRaceAgain}
          onEditMaze={handleEditMaze}
        />
      )}
    </div>
  );
};

export default App;