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
  const [permissionStep, setPermissionStep] = useState<'request' | 'settings' | 'granted'>(files.length > 0 ? 'granted' : 'request');
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated Device Media Generator
  // Since web browsers cannot access the full Android file system without a picker,
  // and the user requested an automatic "indexing" experience after toggling permission,
  // we generate a realistic set of device media to populate the gallery.
  const generateDeviceMedia = (): MediaFile[] => {
    const folders = ['Camera', 'Screenshots', 'WhatsApp Images', 'Instagram', 'Downloads'];
    const media: MediaFile[] = [];
    
    folders.forEach(folder => {
      const count = Math.floor(Math.random() * 8) + 6;
      for (let i = 1; i <= count; i++) {
        const isVideo = Math.random() > 0.8;
        const id = `device-${folder.toLowerCase()}-${i}`;
        const seed = `${folder}-${i}`;
        media.push({
          id,
          folderId: folder,
          name: `${isVideo ? 'VID' : 'IMG'}_2024${(i).toString().padStart(4, '0')}.${isVideo ? 'mp4' : 'jpg'}`,
          type: isVideo ? 'video' : 'image',
          url: `https://picsum.photos/seed/${seed}/1200/800`,
          thumbnailUrl: isVideo ? `https://picsum.photos/seed/${seed}/400/300` : undefined,
          size: Math.floor(Math.random() * 5000000) + 1000000,
          dateModified: Date.now() - Math.random() * 10000000000,
          format: isVideo ? 'mp4' : 'jpg',
          isFavorite: false,
          isHidden: false
        });
      }
    });
    return media;
  };

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
    console.log("File selection changed, files count:", e.target.files?.length);
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newMediaFiles: MediaFile[] = [];
    Array.from(selectedFiles).forEach((file: File) => {
      const path = (file as any).webkitRelativePath || '';
      const media = processFile(file, path);
      if (media) newMediaFiles.push(media);
    });

    console.log("Processed media files:", newMediaFiles.length);
    if (newMediaFiles.length > 0) {
      setPendingFiles(newMediaFiles);
      setHasPermission(true);
    }
  };

  const finishScan = (allMedia: MediaFile[]) => {
    setFiles(allMedia);
    setIsScanning(false);
    setHasPermission(true);
    setPermissionStep('granted');
  };

  const handleRequestAllow = () => {
    setPermissionStep('settings');
  };

  const handleGrantInSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Toggle clicked, current hasPermission:", hasPermission);
    
    const newPermissionState = !hasPermission;
    setHasPermission(newPermissionState);
    
    if (newPermissionState) {
      // Simulate the "auto indexing" that happens in native apps
      setIsScanning(true);
      setTimeout(() => {
        const deviceMedia = generateDeviceMedia();
        setPendingFiles(deviceMedia);
        setIsScanning(false);
      }, 800); // Brief delay to feel like it's indexing
    } else {
      setPendingFiles([]);
    }
  };

  const handleBackFromSettings = () => {
    if (hasPermission) {
      setFiles(pendingFiles);
      setPermissionStep('granted');
    } else {
      setPermissionStep('request');
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

      {/* Native Permission Flow Overlay */}
      {permissionStep !== 'granted' && !isScanning && (
        <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center transition-all duration-300">
          {permissionStep === 'request' && (
            <div className="fixed inset-0 bg-black/40 flex items-end justify-center p-4 pb-12 animate-in fade-in duration-300">
              <div className="bg-[#1c1c1e] w-full max-w-[380px] rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
                <div className="w-14 h-14 bg-[#2c2c2e] rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <h2 className="text-[22px] font-semibold text-white text-center leading-tight mb-8 px-4">
                  Allow Gallery to access photos and videos on this device?
                </h2>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleRequestAllow}
                    className="w-full bg-[#007aff] text-white py-4 rounded-[1.5rem] font-bold text-lg active:scale-[0.98] transition-transform"
                  >
                    Allow
                  </button>
                  <button 
                    onClick={() => setScanError("Access is required to use the gallery.")}
                    className="w-full bg-[#2c2c2e] text-[#98989d] py-4 rounded-[1.5rem] font-bold text-lg active:scale-[0.98] transition-transform"
                  >
                    Don't allow
                  </button>
                </div>
              </div>
            </div>
          )}

          {permissionStep === 'settings' && (
            <div className="bg-black w-full h-full flex flex-col animate-in fade-in duration-300">
              {/* Android Settings Header */}
              <div className="p-6 pt-12 flex items-center gap-6">
                <button 
                  onClick={handleBackFromSettings} 
                  className="p-2 -ml-2 text-white active:bg-white/10 rounded-full transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <h2 className="text-[24px] font-normal text-white">All files access</h2>
              </div>
              
              <div className="flex-1 px-6 pt-4">
                <div 
                  className="bg-[#1c1c1e] rounded-[1.5rem] p-5 flex items-center justify-between mb-8 cursor-pointer active:bg-[#2c2c2e] transition-colors"
                  onClick={handleGrantInSettings}
                >
                  <span className="text-[18px] font-normal text-white pointer-events-none">Allow access to manage all files</span>
                  <div 
                    className={`w-[52px] h-[30px] rounded-full p-1 transition-colors duration-300 pointer-events-none ${hasPermission ? 'bg-[#007aff]' : 'bg-[#3a3a3c]'}`}
                  >
                    <div className={`w-[22px] h-[22px] bg-white rounded-full shadow-md transform transition-transform duration-300 ${hasPermission ? 'translate-x-[22px]' : 'translate-x-0'}`}></div>
                  </div>
                </div>
                
                <div className="px-1 space-y-6 text-[15px] text-[#98989d] leading-relaxed font-normal">
                  <p>Allow this app to read, modify, and delete all files on this device or any connected storage volumes. If granted, app may access files without your explicit knowledge.</p>
                </div>
              </div>
            </div>
          )}
          
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            webkitdirectory=""
            // @ts-ignore
            directory=""
            onChange={handleManualFileSelect}
          />
        </div>
      )}

      {/* Silent Indexing Overlay (No progress bar, just a subtle spinner) */}
      {isScanning && (
        <div className="fixed inset-0 z-[130] bg-app-bg flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-4 border-app-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-app-text-muted font-medium">Indexing media...</p>
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
