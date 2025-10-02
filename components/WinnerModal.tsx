import React, { useEffect, useState } from 'react';
import type { RacerId } from '../types';
import { GeometricShape } from './GeometricShape';

interface WinnerModalProps {
  winner: {
    id: RacerId;
    name: string;
    color: string;
  };
  onRaceAgain: () => void;
  onEditMaze: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ winner, onRaceAgain, onEditMaze }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay visibility for animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const bgColor = winner.color.replace('fill-', 'bg-');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div 
        className={`bg-white rounded-2xl shadow-2xl p-8 sm:p-10 text-center transform transition-all duration-500 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
      >
        <h2 className="text-2xl font-bold text-slate-500">We have a winner!</h2>
        <div className="my-6 flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${bgColor}`}>
                <GeometricShape shapeId={winner.id} className="w-14 h-14 text-white" />
            </div>
          <p className="mt-4 text-4xl font-extrabold text-slate-800">{winner.name} wins!</p>
        </div>
        <div className="flex gap-4 justify-center">
            <button
              onClick={onRaceAgain}
              className="px-6 py-3 text-lg font-semibold rounded-full shadow-md transform transition-transform duration-200 ease-in-out focus:outline-none focus:ring-4 bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-300 active:scale-95"
            >
              Race Again
            </button>
            <button
              onClick={onEditMaze}
              className="px-6 py-3 text-lg font-semibold rounded-full shadow-md transform transition-transform duration-200 ease-in-out focus:outline-none focus:ring-4 bg-slate-500 text-white hover:bg-slate-600 focus:ring-slate-300 active:scale-95"
            >
              Edit Maze
            </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;
