import React, { useState, useRef, useEffect } from 'react';
import { MediaFile, Folder } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, Play, Folder as FolderIcon } from 'lucide-react';

interface GalleryGridProps {
  items: (MediaFile | Folder)[];
  isFolderView: boolean;
  columnCount: number;
  selectedIds: Set<string>;
  onSelect: (id: string, multi: boolean, shift: boolean) => void;
  onClick: (item: MediaFile | Folder) => void;
  onRefresh: () => void;
}

export default function GalleryGrid({
  items,
  isFolderView,
  columnCount,
  selectedIds,
  onSelect,
  onClick,
  onRefresh
}: GalleryGridProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  
  // Pull to refresh logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && touchStartY.current > 0) {
      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;
      if (diff > 80 && !refreshing) {
        setRefreshing(true);
        setTimeout(() => {
          onRefresh();
          setRefreshing(false);
          touchStartY.current = 0;
        }, 1000);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = 0;
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-y-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="flex justify-center items-center py-4 text-app-text-muted">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent"></div>
        </div>
      )}
      
      <div 
        className="grid gap-1 p-1" 
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => (
          <GridItem 
            key={item.id}
            item={item}
            isFolder={isFolderView}
            isSelected={selectedIds.has(item.id)}
            onSelect={(multi, shift) => onSelect(item.id, multi, shift)}
            onClick={() => onClick(item)}
          />
        ))}
      </div>
      
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-app-text-muted p-8 text-center">
          <p className="mb-4">No items found</p>
          <button 
            onClick={onRefresh}
            className="px-6 py-2 bg-app-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            Refresh Gallery
          </button>
          <p className="mt-4 text-xs max-w-xs">
            If your media isn't showing, make sure you've added a storage source in Settings.
          </p>
        </div>
      )}
    </div>
  );
}

interface GridItemProps {
  key?: string;
  item: any;
  isFolder: boolean;
  isSelected: boolean;
  onSelect: (multi: boolean, shift: boolean) => void;
  onClick: () => void;
}

function GridItem({ item, isFolder, isSelected, onSelect, onClick }: GridItemProps) {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onSelect(true, e.shiftKey);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isLongPress.current) {
      onClick();
    }
  };

  const handlePointerLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div 
      className={cn(
        "relative aspect-square bg-app-surface overflow-hidden cursor-pointer select-none",
        isSelected && "ring-2 ring-app-accent ring-inset opacity-80"
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background Image */}
      {item.thumbnailUrl || item.url ? (
        <img 
          src={item.thumbnailUrl || item.url} 
          alt={item.name}
          className="w-full h-full object-cover"
          draggable={false}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
          {isFolder ? <FolderIcon size={32} /> : <Play size={32} />}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-1 left-1 text-app-accent bg-white rounded-full">
          <CheckCircle2 size={20} className="fill-white" />
        </div>
      )}

      {/* Overlays */}
      {isFolder ? (
        <div className="absolute bottom-0 right-0 left-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-end text-right">
          <span className="text-white text-xs font-medium truncate w-full">{item.name}</span>
          <span className="text-white/70 text-[10px]">{item.fileCount || 0} files</span>
        </div>
      ) : (
        <>
          {item.type === 'video' && (
            <div className="absolute top-1 left-1 bg-black/60 px-1 rounded text-[10px] text-white font-medium">
              {item.duration || '00:00'}
            </div>
          )}
          {item.type === 'video' && (
            <div className="absolute bottom-0 right-0 left-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
              <span className="text-white text-[10px] font-medium line-clamp-2 leading-tight">
                {item.name}
              </span>
            </div>
          )}
          {item.type === 'gif' && (
            <div className="absolute top-1 left-1 bg-black/60 px-1 rounded text-[10px] text-white font-medium uppercase">
              GIF
            </div>
          )}
        </>
      )}
    </div>
  );
}
