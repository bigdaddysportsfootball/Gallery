import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MediaFile, Folder } from './types';
import { Folder as FolderIcon, Plus, Trash2, MoreVertical, Info } from 'lucide-react';
import TopBar from './components/TopBar';
import GalleryGrid from './components/GalleryGrid';
import ImageViewer from './components/ImageViewer';
import SettingsModal from './components/SettingsModal';
import DetailsModal from './components/DetailsModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import { get, set, del } from 'idb-keyval';

export default function App() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [storageRoots, setStorageRoots] = useState<FileSystemDirectoryHandle[]>([]);
  
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
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionStep, setPermissionStep] = useState<'request' | 'settings' | 'granted'>(files.length > 0 ? 'granted' : 'request');
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted storage roots on mount
  useEffect(() => {
    const loadRoots = async () => {
      try {
        const savedRoots = await get<FileSystemDirectoryHandle[]>('storage-roots');
        const savedHasPermission = await get<boolean>('has-permission');
        const savedFiles = await get<MediaFile[]>('saved-files');
        
        if (savedHasPermission) {
          setHasPermission(true);
          setPermissionStep('granted');
          
          let allMedia: MediaFile[] = [];

          // Re-create Blob URLs for saved files (fallback mode)
          if (savedFiles && savedFiles.length > 0) {
            allMedia = savedFiles.map(f => {
              if (f.file) {
                const url = URL.createObjectURL(f.file);
                return { ...f, url, thumbnailUrl: f.type === 'video' ? url : undefined };
              }
              return f;
            });
          }

          // Include media from additional storage roots (SD cards, etc)
          if (savedRoots && savedRoots.length > 0) {
            setStorageRoots(savedRoots);
            setIsScanning(true);
            for (const root of savedRoots) {
              try {
                // @ts-ignore
                const permission = await root.queryPermission({ mode: 'read' });
                if (permission === 'granted') {
                  const rootMedia = await scanDirectory(root);
                  allMedia.push(...rootMedia);
                }
              } catch (err) {
                console.error(`Error querying permission for ${root.name}:`, err);
              }
            }
          }
          setFiles(allMedia);
          
          // If permission is granted but no files found (e.g. first run of APK)
          // we trigger the native scan
          if (allMedia.length === 0) {
            setIsScanning(true);
            const nativeMedia = await fetchNativeMedia();
            setFiles(nativeMedia);
          }
          
          setIsScanning(false);
        }
      } catch (err) {
        console.error("Error loading saved state:", err);
      }
    };
    loadRoots();
  }, []);

  // Persist files state
  useEffect(() => {
    if (files.length > 0) {
      // We don't save the Blob URLs as they are invalid after refresh
      // But we keep the File objects
      const filesToSave = files.map(f => ({ ...f, url: '', thumbnailUrl: undefined }));
      set('saved-files', filesToSave);
    }
  }, [files]);

  const handleRefreshAll = async (forcePicker = false) => {
    console.log("Refresh All triggered", { forcePicker, storageRootsCount: storageRoots.length });
    
    setIsScanning(true);
    const allMedia: MediaFile[] = [];
    
    // 1. Re-process existing manual files (from fallback picker)
    const existingManualFiles = files.filter(f => f.file);
    if (existingManualFiles.length > 0) {
      for (const f of existingManualFiles) {
        if (f.file) {
          const media = await processFile(f.file, f.folderId);
          if (media) allMedia.push(media);
        }
      }
    }

    // 2. Scan directory handles (if supported/available)
    if (storageRoots.length > 0) {
      for (const root of storageRoots) {
        try {
          // @ts-ignore
          let permission = await root.queryPermission({ mode: 'read' });
          if (permission !== 'granted') {
            // @ts-ignore
            permission = await root.requestPermission({ mode: 'read' });
          }
          
          if (permission === 'granted') {
            const rootMedia = await scanDirectory(root);
            allMedia.push(...rootMedia);
          }
        } catch (err) {
          console.error(`Error refreshing ${root.name}:`, err);
        }
      }
    } else if (hasPermission && files.length === 0) {
      // 3. If permission granted but no files, simulate device media
      const simulatedMedia = await fetchNativeMedia();
      allMedia.push(...simulatedMedia);
    } else if (forcePicker && allMedia.length === 0) {
      // 4. Trigger picker if forced and no files found
      console.log("No storage roots and no manual files, triggering Add Storage Root");
      handleAddStorageRoot();
      setIsScanning(false);
      return;
    }
    
    if (allMedia.length > 0) {
      // Merge and avoid duplicates by ID
      const existingIds = new Set(allMedia.map(m => m.id));
      // Keep any files that weren't re-processed (unlikely but safe)
      const otherFiles = files.filter(f => !existingIds.has(f.id));
      setFiles([...otherFiles, ...allMedia]);
    }
    
    setIsScanning(false);
  };

  // Recursive Scanner Logic
  const scanDirectory = async (handle: FileSystemDirectoryHandle, path = '') => {
    const newFiles: MediaFile[] = [];
    try {
      // @ts-ignore
      for await (const entry of handle.values()) {
        if (entry.kind === 'directory') {
          const subFiles = await scanDirectory(entry, `${path}${entry.name}/`);
          newFiles.push(...subFiles);
        } else if (entry.kind === 'file') {
          const file = await entry.getFile();
          const mediaFile = await processFile(file, path);
          if (mediaFile) newFiles.push(mediaFile);
        }
      }
    } catch (err) {
      console.error("Error scanning directory", err);
    }
    return newFiles;
  };

  const processFile = async (file: File, path: string): Promise<MediaFile | null> => {
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
        isHidden: false,
        file: file
      };
    }
    return null;
  };

  const handleRequestAllow = () => {
    setPermissionStep('settings');
  };

  const fetchNativeMedia = async (): Promise<MediaFile[]> => {
    // Check if we are running in a native environment (e.g., Capacitor, Cordova, or custom APK bridge)
    // @ts-ignore
    const isNative = window.Capacitor || window.cordova || window.androidBridge;

    if (isNative) {
      console.log("Native environment detected. Scanning device storage...");
      try {
        // This is where the real native call happens for the APK
        // @ts-ignore
        if (window.androidBridge && window.androidBridge.getMedia) {
          // @ts-ignore
          const json = await window.androidBridge.getMedia();
          return JSON.parse(json);
        }
        // Fallback or other bridge types (Capacitor etc)
        return []; 
      } catch (err) {
        console.error("Native scan failed:", err);
        return [];
      }
    }

    // ONLY for the AI Studio Browser Preview:
    // We show mock data so you can test the "Toggle" flow without browser security errors.
    console.log("Browser environment detected. Showing preview mock data.");
    return [
      { id: 'dev-1', folderId: 'Camera', name: 'IMG_20240405_1021.jpg', type: 'image', url: 'https://picsum.photos/seed/cam1/1200/800', size: 3450000, dateModified: Date.now() - 3600000, format: 'jpg', isFavorite: false, isHidden: false },
      { id: 'dev-2', folderId: 'Camera', name: 'IMG_20240405_1022.jpg', type: 'image', url: 'https://picsum.photos/seed/cam2/1200/800', size: 2800000, dateModified: Date.now() - 7200000, format: 'jpg', isFavorite: false, isHidden: false },
      { id: 'dev-3', folderId: 'Downloads', name: 'wallpaper_4k.png', type: 'image', url: 'https://picsum.photos/seed/wall1/1200/800', size: 1200000, dateModified: Date.now() - 86400000, format: 'png', isFavorite: false, isHidden: false },
      { id: 'dev-4', folderId: 'WhatsApp', name: 'IMG-WA0001.jpg', type: 'image', url: 'https://picsum.photos/seed/wa1/1200/800', size: 450000, dateModified: Date.now() - 172800000, format: 'jpg', isFavorite: false, isHidden: false },
      { id: 'dev-5', folderId: 'Instagram', name: 'Post_123.jpg', type: 'image', url: 'https://picsum.photos/seed/ig1/1200/800', size: 890000, dateModified: Date.now() - 259200000, format: 'jpg', isFavorite: false, isHidden: false },
      { id: 'dev-6', folderId: 'Camera', name: 'VIDEO_001.mp4', type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumbnailUrl: 'https://picsum.photos/seed/vid1/1200/800', size: 15000000, dateModified: Date.now() - 432000000, format: 'mp4', isFavorite: false, isHidden: false }
    ];
  };

  const handleGrantInSettings = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPermission = !hasPermission;
    setHasPermission(newPermission);
    await set('has-permission', newPermission);
    
    if (newPermission) {
      setIsScanning(true);
      // Simulate the scan delay
      setTimeout(async () => {
        const media = await fetchNativeMedia();
        setFiles(media);
        setIsScanning(false);
      }, 1500);
    } else {
      setFiles([]);
      setStorageRoots([]);
      await del('storage-roots');
    }
  };

  const handleManualFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsScanning(true);
    const newMediaFiles: MediaFile[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      // @ts-ignore
      const path = file.webkitRelativePath || '';
      const media = await processFile(file, path);
      if (media) newMediaFiles.push(media);
    }

    setFiles(prev => [...prev, ...newMediaFiles]);
    setIsScanning(false);
    setPermissionStep('granted');
  };

  const handleAddStorageRoot = async () => {
    console.log("Add Storage Root clicked");
    try {
      // @ts-ignore
      if (window.showDirectoryPicker) {
        console.log("Using FileSystem Access API");
        // @ts-ignore
        const directoryHandle = await window.showDirectoryPicker({
          mode: 'read'
        });

        const newRoots = [...storageRoots, directoryHandle];
        setStorageRoots(newRoots);
        await set('storage-roots', newRoots);

        setIsScanning(true);
        const allMedia = await scanDirectory(directoryHandle);
        setFiles(prev => [...prev, ...allMedia]);
        setIsScanning(false);
      } else if (fileInputRef.current) {
        console.log("Using File Input Fallback");
        fileInputRef.current.click();
      } else {
        console.error("No file input ref or directory picker available");
        setScanError("Your device does not support direct folder access. Please use the 'Add Source' button to select files.");
      }
    } catch (err: any) {
      console.error("Error adding storage root:", err);
      if (err.name !== 'AbortError') {
        setScanError(`Error: ${err.message}`);
      }
    }
  };

  const handleRemoveStorageRoot = async (index: number) => {
    const rootToRemove = storageRoots[index];
    const newRoots = storageRoots.filter((_, i) => i !== index);
    setStorageRoots(newRoots);
    await set('storage-roots', newRoots);
    
    // Remove files associated with this root (simplified: just re-scan others or filter)
    // For now, let's just trigger a full re-scan of remaining roots
    const allMedia: MediaFile[] = [];
    setIsScanning(true);
    for (const root of newRoots) {
      const rootMedia = await scanDirectory(root);
      allMedia.push(...rootMedia);
    }
    setFiles(allMedia);
    setIsScanning(false);
  };

  const handleBackFromSettings = () => {
    if (hasPermission) {
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
    
    // Also prevent any other potential exit prompts
    const preventDefault = (e: any) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // We don't actually want to prevent exit, we want to REMOVE the prompt.
    // The user said "remove all if these" regarding "the question to exit the app".
    // This usually means a beforeunload listener was active.
    // By setting it to null we already removed it.

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

  const handleShareSelection = async () => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    if (selectedFiles.length === 0) return;

    try {
      const shareData: ShareData = {
        title: 'Shared Media',
        text: `Sharing ${selectedFiles.length} items from Gallery`,
      };

      const filesToShare: File[] = [];
      for (const file of selectedFiles) {
        try {
          const response = await fetch(file.url);
          if (response.ok) {
            const blob = await response.blob();
            filesToShare.push(new File([blob], file.name, { type: blob.type }));
          }
        } catch (err) {
          console.error('Error preparing file for share:', file.name, err);
        }
      }

      if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
        shareData.files = filesToShare;
      }

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      console.error('Error sharing selection:', err);
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
        onShare={handleShareSelection}
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
          onRefresh={() => handleRefreshAll(true)}
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
                  <p className="text-center text-[#98989d] text-sm mt-2">
                    On Android, you will be prompted to select your media folders.
                  </p>
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
            <div className="bg-[#1a1110] w-full h-full flex flex-col animate-in fade-in duration-300 text-[#e6e1e0]">
              {/* Android Settings Header */}
              <div className="p-4 pt-8 flex items-center gap-4">
                <button 
                  onClick={handleBackFromSettings} 
                  className="p-2 -ml-2 text-[#e6e1e0] active:bg-white/10 rounded-full transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <h2 className="text-[22px] font-normal">App permissions</h2>
                <div className="ml-auto">
                  <MoreVertical size={20} />
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center px-6 pt-8">
                <div className="w-20 h-20 bg-[#f86734] rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <h1 className="text-[28px] font-normal mb-12">Gallery</h1>
                
                <div className="w-full space-y-8">
                  {hasPermission ? (
                    <div>
                      <h3 className="text-[14px] font-medium text-[#d0c4c2] mb-6 px-1">Allowed</h3>
                      <div 
                        className="flex items-center gap-6 p-1 cursor-pointer active:opacity-70 transition-opacity"
                        onClick={handleGrantInSettings}
                      >
                        <div className="w-6 h-6 flex items-center justify-center text-[#e6e1e0]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-[18px] font-normal">Photos and videos</div>
                          <div className="text-[14px] text-[#d0c4c2]">Allowed</div>
                        </div>
                        <div 
                          className="w-[44px] h-[24px] rounded-full p-1 transition-colors duration-300 bg-[#f86734]"
                        >
                          <div className="w-[16px] h-[16px] bg-white rounded-full shadow-md transform transition-transform duration-300 translate-x-[20px]"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-[14px] font-medium text-[#d0c4c2] mb-6 px-1">Not allowed</h3>
                      <div 
                        className="flex items-center gap-6 p-1 cursor-pointer active:opacity-70 transition-opacity"
                        onClick={handleGrantInSettings}
                      >
                        <div className="w-6 h-6 flex items-center justify-center text-[#e6e1e0]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-[18px] font-normal">Photos and videos</div>
                          <div className="text-[14px] text-[#d0c4c2]">Not allowed</div>
                        </div>
                        <div 
                          className="w-[44px] h-[24px] rounded-full p-1 transition-colors duration-300 bg-[#4d4443]"
                        >
                          <div className="w-[16px] h-[16px] bg-white rounded-full shadow-md transform transition-transform duration-300 translate-x-0"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[14px] font-medium text-[#d0c4c2] mb-6 px-1">{hasPermission ? 'Not allowed' : ''}</h3>
                    <div className="flex items-center gap-6 p-1 opacity-60">
                      <div className="w-6 h-6 flex items-center justify-center text-[#e6e1e0]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-[18px] font-normal">Notifications</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-[#4d4443]">
                    <div className="flex items-center justify-between p-1">
                      <div className="flex-1">
                        <div className="text-[18px] font-normal">Manage app if unused</div>
                        <div className="text-[14px] text-[#d0c4c2] pr-8">Remove permissions, delete temporary files, stop notifications and archive the app</div>
                      </div>
                      <div className="w-[44px] h-[24px] bg-[#f86734] rounded-full p-1">
                        <div className="w-[16px] h-[16px] bg-white rounded-full shadow-md translate-x-[20px]"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto w-full flex justify-between p-4 pb-8">
                  <div className="p-2 text-[#e6e1e0] opacity-80"><Info size={24} /></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Silent Indexing Overlay (No progress bar, just a subtle spinner) */}
      {isScanning && (
        <div className="fixed inset-0 z-[130] bg-app-bg flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-4 border-app-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-app-text-muted font-medium">Indexing media...</p>
        </div>
      )}

      {/* Hidden File Input for Mobile Fallback */}
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,video/*"
        // @ts-ignore
        webkitdirectory=""
        // @ts-ignore
        directory=""
        onChange={handleManualFileSelect}
      />

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
          storageRoots={storageRoots}
          onAddStorageRoot={handleAddStorageRoot}
          onRemoveStorageRoot={handleRemoveStorageRoot}
          onRefreshAll={() => handleRefreshAll(true)}
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
