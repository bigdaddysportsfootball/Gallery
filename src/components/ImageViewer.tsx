import React, { useState, useRef, useEffect } from 'react';
import { MediaFile } from '../types';
import { Star, Edit2, Share2, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useDrag, usePinch, useGesture } from '@use-gesture/react';
import { cn } from '../lib/utils';

interface ImageViewerProps {
  file: MediaFile;
  allFiles: MediaFile[];
  onClose: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onNavigate: (file: MediaFile) => void;
}

export default function ImageViewer({ 
  file, 
  allFiles, 
  onClose, 
  onToggleFavorite, 
  onDelete,
  onNavigate
}: ImageViewerProps) {
  const [showControls, setShowControls] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [newName, setNewName] = useState(file.name);
  
  const currentIndex = allFiles.findIndex(f => f.id === file.id);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  const springScale = useSpring(scale, { stiffness: 300, damping: 30 });

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
    setNewName(file.name);
    setIsDeleteConfirm(false);
  }, [file, x, y, scale]);

  const bind = useGesture({
    onDrag: ({ active, movement: [mx, my], direction: [dx, dy], velocity: [vx, vy], cancel }) => {
      if (scale.get() > 1) {
        x.set(active ? mx : 0);
        y.set(active ? my : 0);
        return;
      }

      // Swipe down to close
      if (my > 100 && vy > 0.5 && !active) {
        onClose();
        return;
      }

      // Swipe left/right to navigate
      if (!active && Math.abs(mx) > 100) {
        if (mx > 0 && currentIndex > 0) {
          onNavigate(allFiles[currentIndex - 1]);
        } else if (mx < 0 && currentIndex < allFiles.length - 1) {
          onNavigate(allFiles[currentIndex + 1]);
        }
        x.set(0);
        y.set(0);
      } else {
        x.set(active ? mx : 0);
        y.set(active ? my : 0);
      }
    },
    onPinch: ({ offset: [d], active }) => {
      const newScale = Math.max(1, Math.min(d, 4));
      scale.set(newScale);
      if (!active && newScale === 1) {
        x.set(0);
        y.set(0);
      }
    }
  }, { drag: { filterTaps: true } });

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    file.name = newName;
    setIsRenaming(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      console.log('Attempting to share file:', file.name);
      
      // Try to fetch the blob to share as a file if supported
      const response = await fetch(file.url);
      if (!response.ok) throw new Error('Failed to fetch file for sharing');
      const blob = await response.blob();
      const shareFile = new File([blob], file.name, { type: blob.type });

      const shareData: ShareData = {
        title: file.name,
        text: `Check out this ${file.type}`,
      };

      // Check if file sharing is supported
      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        shareData.files = [shareFile];
      } else {
        // Fallback to URL if files can't be shared
        shareData.url = file.url;
      }

      if (navigator.share) {
        await navigator.share(shareData);
        console.log('Share successful');
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback: Copy link
      try {
        await navigator.clipboard.writeText(file.url);
        console.log('Link copied to clipboard');
        // We could add a toast here if we had one
      } catch (copyErr) {
        console.error('Failed to copy:', copyErr);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/60 to-transparent flex items-center px-2 z-10 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <button onClick={onClose} className="p-2 text-white">
          <ArrowLeft size={24} />
        </button>
        <span className="ml-2 text-white font-medium truncate flex-1">{file.name}</span>
      </div>

      {/* Image Container */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
        onClick={() => setShowControls(!showControls)}
        {...bind()}
      >
        <motion.img 
          ref={imageRef}
          src={file.url} 
          alt={file.name}
          className="max-w-full max-h-full object-contain"
          style={{ x: springX, y: springY, scale: springScale }}
          draggable={false}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Bottom Bar */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-safe transition-opacity duration-300 z-10",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-around h-16">
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="p-3 text-white flex flex-col items-center">
            <Star size={24} className={file.isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="p-3 text-white flex flex-col items-center">
            <Edit2 size={24} />
          </button>
          <button onClick={handleShare} className="p-3 text-white flex flex-col items-center">
            <Share2 size={24} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsDeleteConfirm(true); }} 
            className={cn(
              "p-3 flex flex-col items-center transition-colors",
              isDeleteConfirm ? "text-red-500" : "text-white"
            )}
          >
            {isDeleteConfirm ? (
              <span className="text-xs font-bold" onClick={(e) => { e.stopPropagation(); onDelete(); }}>DELETE?</span>
            ) : (
              <Trash2 size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Rename Modal */}
      {isRenaming && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleRenameSubmit} className="bg-zinc-900 p-6 rounded-lg w-full max-w-sm border border-zinc-800">
            <h3 className="text-lg font-medium text-white mb-4">Rename File</h3>
            <input 
              autoFocus
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 mb-4 text-white outline-none focus:border-blue-500"
            />
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setIsRenaming(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
