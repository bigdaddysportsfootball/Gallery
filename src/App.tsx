import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_FILES } from './mockData';
import { MediaFile, Folder } from './types';
import TopBar from './components/TopBar';
import GalleryGrid from './components/GalleryGrid';
import ImageViewer from './components/ImageViewer';
import SettingsModal from './components/SettingsModal';
import DetailsModal from './components/DetailsModal';
import VideoPlayerModal from './components/VideoPlayerModal';

export default function App() {
  const [files, setFiles] = useState<MediaFile[]>(MOCK_FILES);
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [openedFile, setOpenedFile] = useState<MediaFile | null>(null);
  
  // Settings & Filters
  const [showHidden, setShowHidden] = useState(false);
  const [appPassword, setAppPassword] = useState('1234');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState<'blue' | 'red' | 'green' | 'purple'>('blue');
  const [columnCount, setColumnCount] = useState(3);
  const [filters, setFilters] = useState({ images: true, videos: true, gifs: true });
  const [sortConfig, setSortConfig] = useState({ by: 'date', asc: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultVideoPlayer, setDefaultVideoPlayer] = useState<string | null>(null);
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState<MediaFile | null>(null);

  // Revert hidden files on close (simulated by effect on mount)
  useEffect(() => {
    setShowHidden(false);
  }, []);

  // Automatically find and index folders from files
  const folders = useMemo(() => {
    const folderMap = new Map<string, Folder>();
    
    files.forEach(file => {
      if (!folderMap.has(file.folderId)) {
        folderMap.set(file.folderId, {
          id: file.folderId,
          name: file.folderId.startsWith('.') ? file.folderId.substring(1) : file.folderId,
          dateModified: file.dateModified,
          isHidden: file.isHidden || file.folderId.startsWith('.')
        });
      } else {
        const folder = folderMap.get(file.folderId)!;
        if (file.dateModified > folder.dateModified) {
          folder.dateModified = file.dateModified;
        }
        if (file.isHidden) folder.isHidden = true;
      }
    });

    return Array.from(folderMap.values());
  }, [files]);

  // Derived Data
  const processedFolders = useMemo(() => {
    let result = folders.map(folder => {
      const folderFiles = files.filter(f => f.folderId === folder.id);
      const latestFile = folderFiles.sort((a, b) => b.dateModified - a.dateModified)[0];
      return {
        ...folder,
        dateModified: latestFile ? latestFile.dateModified : folder.dateModified,
        fileCount: folderFiles.length,
        thumbnailUrl: latestFile?.type === 'video' ? latestFile.thumbnailUrl : latestFile?.url
      };
    });

    // Add Favourites virtual folder if any
    const favoriteFiles = files.filter(f => f.isFavorite);
    if (favoriteFiles.length > 0) {
      const latestFav = favoriteFiles.sort((a, b) => b.dateModified - a.dateModified)[0];
      result.unshift({
        id: 'favourites',
        name: 'Favourites',
        dateModified: latestFav.dateModified,
        isVirtual: true,
        fileCount: favoriteFiles.length,
        thumbnailUrl: latestFav.type === 'video' ? latestFav.thumbnailUrl : latestFav.url
      } as any);
    }

    if (!showHidden) {
      result = result.filter(f => !f.isHidden);
    }

    if (searchQuery) {
      result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.by === 'date') comparison = a.dateModified - b.dateModified;
      if (sortConfig.by === 'name') comparison = a.name.localeCompare(b.name);
      // Add size if needed, but folders don't have direct size easily without summing
      return sortConfig.asc ? comparison : -comparison;
    });

    return result;
  }, [folders, files, showHidden, sortConfig, searchQuery]);

  const processedFiles = useMemo(() => {
    let result = files;
    
    if (currentFolderId === 'favourites') {
      result = result.filter(f => f.isFavorite);
    } else if (currentFolderId) {
      result = result.filter(f => f.folderId === currentFolderId);
    } else {
      return []; // In root, we show folders
    }

    if (!showHidden) {
      result = result.filter(f => !f.isHidden);
    }

    result = result.filter(f => {
      if (f.type === 'image' && !filters.images) return false;
      if (f.type === 'video' && !filters.videos) return false;
      if (f.type === 'gif' && !filters.gifs) return false;
      return true;
    });

    if (searchQuery) {
      result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.by === 'date') comparison = a.dateModified - b.dateModified;
      if (sortConfig.by === 'name') comparison = a.name.localeCompare(b.name);
      if (sortConfig.by === 'size') comparison = a.size - b.size;
      return sortConfig.asc ? comparison : -comparison;
    });

    return result;
  }, [files, currentFolderId, showHidden, filters, sortConfig, searchQuery]);

  // Actions
  const handleRefresh = () => {
    // Simulate refresh
    console.log('Refreshed');
  };

  const handleDelete = () => {
    if (currentFolderId) {
      setFiles(files.filter(f => !selectedIds.has(f.id)));
    } else {
      setFiles(files.filter(f => !selectedIds.has(f.folderId)));
    }
    setSelectedIds(new Set());
  };

  const handleToggleFavorite = (fileId: string) => {
    setFiles(files.map(f => f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f));
  };

  const handleOpenFile = (file: MediaFile) => {
    if (file.type === 'video') {
      if (defaultVideoPlayer) {
        setVideoToPlay(file);
        setIsVideoPlayerOpen(true);
      } else {
        setVideoToPlay(file);
        setIsVideoPlayerOpen(true); // Will show selection dialog first
      }
    } else {
      setOpenedFile(file);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen flex items-center justify-center sm:p-4">
      <div 
        className="flex flex-col h-[100dvh] w-full max-w-[400px] bg-app-bg text-app-text overflow-hidden select-none relative sm:h-[800px] sm:max-h-[90dvh] sm:rounded-[2.5rem] sm:border-[8px] sm:border-zinc-900 shadow-2xl transform-gpu"
        data-theme={theme}
        data-accent={accentColor}
      >
        <TopBar 
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onDelete={handleDelete}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDetails={() => setIsDetailsOpen(true)}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={setFilters}
        columnCount={columnCount}
        onColumnCountChange={setColumnCount}
        showHidden={showHidden}
        onShowHiddenChange={setShowHidden}
        appPassword={appPassword}
        isRoot={!currentFolderId}
        onBack={() => {
          setCurrentFolderId(null);
          setSelectedIds(new Set());
        }}
      />

      <div className="flex-1 overflow-y-auto relative">
        <GalleryGrid 
          items={currentFolderId ? processedFiles : processedFolders}
          isFolderView={!currentFolderId}
          columnCount={columnCount}
          selectedIds={selectedIds}
          onSelect={(id, multi, shift) => {
            const newSet = new Set(selectedIds);
            
            // If we have a last selected ID and we are long pressing again (which we treat as range select if already selecting)
            if (selectedIds.size > 0 && lastSelectedId && lastSelectedId !== id) {
              const currentItems = currentFolderId ? processedFiles : processedFolders;
              const startIndex = currentItems.findIndex(i => i.id === lastSelectedId);
              const endIndex = currentItems.findIndex(i => i.id === id);
              
              if (startIndex !== -1 && endIndex !== -1) {
                const min = Math.min(startIndex, endIndex);
                const max = Math.max(startIndex, endIndex);
                for (let i = min; i <= max; i++) {
                  newSet.add(currentItems[i].id);
                }
              }
            } else {
              if (newSet.has(id)) {
                newSet.delete(id);
              } else {
                newSet.add(id);
              }
            }
            setSelectedIds(newSet);
            setLastSelectedId(id);
          }}
          onClick={(item) => {
            if (selectedIds.size > 0) {
              const newSet = new Set(selectedIds);
              if (newSet.has(item.id)) newSet.delete(item.id);
              else newSet.add(item.id);
              setSelectedIds(newSet);
              setLastSelectedId(item.id);
              return;
            }
            if (!currentFolderId) {
              setCurrentFolderId(item.id);
            } else {
              handleOpenFile(item as MediaFile);
            }
          }}
          onRefresh={handleRefresh}
        />
      </div>

      {openedFile && (
        <ImageViewer 
          file={openedFile} 
          onClose={() => setOpenedFile(null)} 
          onToggleFavorite={() => handleToggleFavorite(openedFile.id)}
          onDelete={() => {
            setFiles(files.filter(f => f.id !== openedFile.id));
            setOpenedFile(null);
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
          appPassword={appPassword}
          onPasswordChange={setAppPassword}
          theme={theme}
          onThemeChange={setTheme}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      {isDetailsOpen && (
        <DetailsModal 
          items={currentFolderId ? processedFiles.filter(f => selectedIds.has(f.id)) : processedFolders.filter(f => selectedIds.has(f.id))}
          onClose={() => setIsDetailsOpen(false)} 
        />
      )}

      {isVideoPlayerOpen && videoToPlay && (
        <VideoPlayerModal 
          file={videoToPlay}
          defaultPlayer={defaultVideoPlayer}
          onSetDefaultPlayer={setDefaultVideoPlayer}
          onClose={() => {
            setIsVideoPlayerOpen(false);
            setVideoToPlay(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
