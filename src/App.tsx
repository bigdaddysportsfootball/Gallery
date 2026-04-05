import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MediaFile, Folder } from './types';
import TopBar from './components/TopBar';
import GalleryGrid from './components/GalleryGrid';
import ImageViewer from './components/ImageViewer';
import SettingsModal from './components/SettingsModal';
import DetailsModal from './components/DetailsModal';
import VideoPlayerModal from './components/VideoPlayerModal';

export default function App() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  
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

  const [isScanning, setIsScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);

  // Automatic Scan on Mount
  useEffect(() => {
    const performScan = async () => {
      setIsScanning(true);
      setScanProgress(0);
      
      // Simulate scanning progress
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
        setScanProgress(i * (100 / steps));
      }

      // Populate with media
      const initialMedia: MediaFile[] = [
        {
          id: '1',
          name: 'Summer Vacation.jpg',
          type: 'image',
          url: 'https://picsum.photos/seed/summer/1200/800',
          thumbnailUrl: 'https://picsum.photos/seed/summer/400/400',
          size: 2400000,
          dateModified: new Date('2023-07-15').getTime(),
          folderId: 'f1',
          format: 'jpg'
        },
        {
          id: '2',
          name: 'Mountain Hike.jpg',
          type: 'image',
          url: 'https://picsum.photos/seed/mountain/1200/800',
          thumbnailUrl: 'https://picsum.photos/seed/mountain/400/400',
          size: 1800000,
          dateModified: new Date('2023-08-20').getTime(),
          folderId: 'f1',
          isFavorite: true,
          format: 'jpg'
        },
        {
          id: '3',
          name: 'City Lights.mp4',
          type: 'video',
          url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: 'https://picsum.photos/seed/city/400/400',
          size: 15200000,
          dateModified: new Date('2023-09-05').getTime(),
          duration: '09:56',
          folderId: 'f2',
          format: 'mp4'
        },
        {
          id: '4',
          name: 'Beach Sunset.gif',
          type: 'gif',
          url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxx6BvYx4Yg/giphy.gif',
          thumbnailUrl: 'https://picsum.photos/seed/beach/400/400',
          size: 4100000,
          dateModified: new Date('2023-10-12').getTime(),
          folderId: 'f1',
          format: 'gif'
        },
        {
          id: '5',
          name: 'Forest Path.jpg',
          type: 'image',
          url: 'https://picsum.photos/seed/forest/1200/800',
          thumbnailUrl: 'https://picsum.photos/seed/forest/400/400',
          size: 3100000,
          dateModified: new Date('2023-11-20').getTime(),
          folderId: 'f1',
          format: 'jpg'
        },
        {
          id: '6',
          name: 'Family Dinner.jpg',
          type: 'image',
          url: 'https://picsum.photos/seed/dinner/1200/800',
          thumbnailUrl: 'https://picsum.photos/seed/dinner/400/400',
          size: 2900000,
          dateModified: new Date('2023-12-24').getTime(),
          folderId: 'f3',
          format: 'jpg'
        }
      ];

      setFiles(initialMedia);
      setIsScanning(false);
    };

    performScan();
  }, []);

  // History Management for Back Button
  useEffect(() => {
    // Push an initial state to prevent immediate exit
    if (window.history.state?.root !== true) {
      window.history.pushState({ root: true }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (openedFile) {
        setOpenedFile(null);
        setIsVideoPlayerOpen(false);
      } else if (currentFolderId) {
        setCurrentFolderId(null);
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Explicitly remove any beforeunload listeners that might cause exit messages
    window.onbeforeunload = null;

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [openedFile, currentFolderId]);

  // Handle history pushing for navigation
  const prevOpenedFile = useRef<MediaFile | null>(null);
  const prevFolderId = useRef<string | null>(null);

  useEffect(() => {
    // If we just opened the viewer from not having it open
    if (openedFile && !prevOpenedFile.current) {
      window.history.pushState({ navigation: 'image' }, '');
    } 
    // If we just opened a folder from root
    else if (currentFolderId && !prevFolderId.current) {
      window.history.pushState({ navigation: 'folder' }, '');
    }
    
    prevOpenedFile.current = openedFile;
    prevFolderId.current = currentFolderId;
  }, [openedFile, currentFolderId]);

  // Revert hidden files on close (simulated by effect on mount)
  useEffect(() => {
    setShowHidden(false);
  }, []);

  // Revert hidden files on close (simulated by effect on mount)
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
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.map(f => f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f);
      
      // Also update openedFile if it's the one being favorited
      if (openedFile && openedFile.id === fileId) {
        setOpenedFile(updatedFiles.find(f => f.id === fileId) || null);
      }
      
      return updatedFiles;
    });
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

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
          <div className="w-20 h-20 mb-6 relative">
            <div className="absolute inset-0 border-4 border-app-accent/20 rounded-full"></div>
            <div 
              className="absolute inset-0 border-4 border-app-accent rounded-full border-t-transparent animate-spin"
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{Math.round(scanProgress)}%</span>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Scanning Device</h2>
          <p className="text-white/60 text-sm text-center max-w-xs">
            Searching for new photos and videos in your storage...
          </p>
        </div>
      )}

      {openedFile && (
        <ImageViewer 
          file={openedFile} 
          allFiles={processedFiles}
          onClose={() => setOpenedFile(null)} 
          onToggleFavorite={() => handleToggleFavorite(openedFile.id)}
          onDelete={() => {
            setFiles(files.filter(f => f.id !== openedFile.id));
            setOpenedFile(null);
          }}
          onNavigate={(file) => setOpenedFile(file)}
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
