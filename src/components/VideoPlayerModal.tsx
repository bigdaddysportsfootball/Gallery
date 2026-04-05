import React, { useState, useEffect } from 'react';
import { MediaFile } from '../types';
import { X, PlayCircle } from 'lucide-react';

interface VideoPlayerModalProps {
  file: MediaFile;
  defaultPlayer: string | null;
  onSetDefaultPlayer: (player: string) => void;
  onClose: () => void;
}

export default function VideoPlayerModal({ file, defaultPlayer, onSetDefaultPlayer, onClose }: VideoPlayerModalProps) {
  const [showSelection, setShowSelection] = useState(!defaultPlayer);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(defaultPlayer);
  const [rememberChoice, setRememberChoice] = useState(false);

  const players = [
    { id: 'system', name: 'System Default Player' },
    { id: 'vlc', name: 'VLC for Android' },
    { id: 'mx', name: 'MX Player' }
  ];

  const handlePlay = (playerId: string) => {
    if (rememberChoice) {
      onSetDefaultPlayer(playerId);
    }
    setSelectedPlayer(playerId);
    setShowSelection(false);
  };

  if (showSelection) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center sm:items-center">
        <div className="bg-app-surface w-full sm:w-96 rounded-t-xl sm:rounded-xl border border-app-border overflow-hidden pb-safe">
          <div className="p-4 border-b border-app-border flex justify-between items-center">
            <h3 className="text-lg font-medium text-app-text">Open with</h3>
            <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X size={20} /></button>
          </div>
          <div className="p-2">
            {players.map(p => (
              <button 
                key={p.id}
                onClick={() => handlePlay(p.id)}
                className="w-full text-left px-4 py-3 hover:bg-app-bg text-app-text flex items-center space-x-3 rounded"
              >
                <PlayCircle size={24} className="text-app-accent" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-app-border">
            <label className="flex items-center text-app-text-muted text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="mr-2 w-4 h-4 rounded border-app-border bg-app-bg accent-app-accent"
              />
              Remember my choice
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/60 to-transparent flex items-center px-2 z-10">
        <button onClick={onClose} className="p-2 text-white">
          <X size={24} />
        </button>
        <span className="ml-2 text-white font-medium truncate flex-1">{file.name}</span>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative">
        {/* Simulated external player view */}
        <video 
          src={file.url} 
          controls 
          autoPlay 
          className="w-full max-h-full"
          poster={file.thumbnailUrl}
        />
        
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white text-sm pointer-events-none">
          Playing in {players.find(p => p.id === selectedPlayer)?.name || 'External Player'}
        </div>
      </div>
    </div>
  );
}
