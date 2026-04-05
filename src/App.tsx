import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MediaFile, Folder } from './types';
import { Folder as FolderIcon } from 'lucide-react';
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

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recursive Scanner Logic for Desktop
  const scanDirectory = async (handle: FileSystemDirectoryHandle, path = '') => {
    const newFiles: MediaFile[] = [];
    try {
      for await (const entry of (handle as any).values()) {
        if (entry.kind === 'directory') {
          const subFiles = await scanDirectory(entry, `${path}${entry.name}/`);
          newFiles.push(...subFiles);
        } else if (entry.kind === 'file') {
          const file = await entry.getFile();
          const mediaFile = processFile(file, path);
          if (mediaFile) newFiles.push(mediaFile);
        }
      }
    } catch (err) {
      console.error("Error scanning directory", err);
    }
    return newFiles;
  };

  const processFile = (file: File, path: string): MediaFile | null => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';

    if (isImage || isVideo) {
      const url = URL.createObjectURL(file);
      const folderName = path.split('/').filter(Boolean).pop() || 'Storage';
      
      return {
        id: `device-${Date.now()}-${Math.random()}`,
        folderId: folderName,
        name: file.name,
        type: isGif ? 'gif' : (isImage ? 'image' : 'video'),
        url: url,
        thumbnailUrl: isVideo ? url : undefined,
        size: file.size,
        dateModified: file.lastModified || Date.now(),
        format: file.name.split('.').pop() || '',
        isFavorite: false,
        isHidden: false
      };
    }
    return null;
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    setIsScanning(true);
    setScanProgress(0);
    setHasPermission(true);

    const newMediaFiles: MediaFile[] = [];
    Array.from(selectedFiles).forEach((file) => {
      // On mobile, we try to get the path if available, otherwise use 'Media'
      const path = (file as any).webkitRelativePath || '';
      const media = processFile(file, path);
      if (media) newMediaFiles.push(media);
    });

    finishScan(newMediaFiles);
  };

  const finishScan = (allMedia: MediaFile[]) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setFiles(allMedia);
        setIsScanning(false);
      }
    }, 20);
  };

  const performAutoScan = async () => {
    setScanError(null);
    
    // 1. Try the advanced Directory Picker (Desktop Chrome/Edge)
    if ('showDirectoryPicker' in window) {
      try {
        const directoryHandle = await (window as any).showDirectoryPicker();
        setIsScanning(true);
        setScanProgress(0);
        setHasPermission(true);
        const allMedia = await scanDirectory(directoryHandle);
        finishScan(allMedia);
        return; // Success
      } catch (err: any) {
        console.warn("Advanced picker failed or blocked, trying fallback...", err);
        // If it's a security error (common in iframes), we fall through to the input fallback
        if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
          // Fall through
        } else {
          setScanError(err.message || "Scan cancelled.");
          setIsScanning(false);
          return;
        }
      }
    }

    // 2. Fallback for Android/Mobile/Blocked Iframes: Trigger the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      setScanError("Your device does not support direct storage access. Please try a different browser.");
    }
  };

  // Revert hidden files on close (simulated by effect on mount)
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

      {/* Permission Overlay (APK Native Bridge Fallback) */}
      {!hasPermission && !isScanning && files.length === 0 && (
        <div className="fixed inset-0 z-[120] bg-app-surface flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-app-accent/10 rounded-full flex items-center justify-center mb-6">
            <FolderIcon size={48} className="text-app-accent" />
          </div>
          <h1 className="text-2xl font-bold text-app-text mb-2">Media Gallery</h1>
          <p className="text-app-text-muted mb-8 max-w-xs">
            To automatically find your photos and videos across all folders, please grant storage access.
          </p>
          
          {scanError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {scanError}
            </div>
          )}

          <button 
            onClick={performAutoScan}
            className="w-full max-w-xs bg-app-accent text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            Start Device Scan
          </button>

          {/* Hidden input for mobile fallback */}
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleManualFileSelect}
          />
        </div>
      )}

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
