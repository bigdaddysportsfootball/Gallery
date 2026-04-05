import React, { useState } from 'react';
import { MoreVertical, Search, ArrowUpDown, Info, Trash2, Share2, FolderInput, Copy, CheckSquare, X, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  onOpenDetails: () => void;
  sortConfig: { by: string; asc: boolean };
  onSortChange: (config: { by: string; asc: boolean }) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: { images: boolean; videos: boolean; gifs: boolean };
  onFilterChange: (f: any) => void;
  columnCount: number;
  onColumnCountChange: (c: number) => void;
  showHidden: boolean;
  onShowHiddenChange: (s: boolean) => void;
  appPassword: string;
  isRoot: boolean;
  onBack: () => void;
}

export default function TopBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onOpenSettings,
  onOpenDetails,
  sortConfig,
  onSortChange,
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  columnCount,
  onColumnCountChange,
  showHidden,
  onShowHiddenChange,
  appPassword,
  isRoot,
  onBack
}: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const handleSortClick = () => {
    if (sortConfig.by === 'date') {
      if (!sortConfig.asc) onSortChange({ by: 'date', asc: true });
      else onSortChange({ by: 'name', asc: false });
    } else if (sortConfig.by === 'name') {
      if (!sortConfig.asc) onSortChange({ by: 'name', asc: true });
      else onSortChange({ by: 'size', asc: false });
    } else {
      if (!sortConfig.asc) onSortChange({ by: 'size', asc: true });
      else onSortChange({ by: 'date', asc: false });
    }
  };

  const handleShowHiddenClick = () => {
    if (!showHidden) {
      setPasswordPrompt(true);
      setIsMenuOpen(false);
    } else {
      onShowHiddenChange(false);
      setIsMenuOpen(false);
    }
  };

  const submitPassword = () => {
    if (passwordInput === appPassword) {
      onShowHiddenChange(true);
      setPasswordPrompt(false);
      setPasswordInput('');
    } else {
      // Removed alert as per user request
      setPasswordInput('');
    }
  };

  if (selectedCount > 0) {
    return (
      <div className="h-14 bg-app-surface flex items-center justify-between px-2 shadow-md z-10 border-b border-app-border">
        <div className="flex items-center">
          <button onClick={onClearSelection} className="p-2 text-app-text-muted hover:text-app-text">
            <X size={24} />
          </button>
          <span className="ml-2 text-lg font-medium text-app-text">{selectedCount} selected</span>
        </div>
        <div className="flex items-center space-x-1">
          {!isRoot && (
            <button 
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: 'Shared Media',
                      text: `Sharing ${selectedCount} items from Gallery`,
                      // In a real app we'd share the actual files, but for now we share a generic text
                    });
                  } catch (err) {
                    console.error('Error sharing:', err);
                  }
                }
              }}
              className="p-2 text-app-text-muted hover:text-app-text"
            >
              <Share2 size={20} />
            </button>
          )}
          
          {isDeleteConfirm ? (
            <button 
              onClick={() => { onDelete(); setIsDeleteConfirm(false); }}
              className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse"
            >
              DELETE?
            </button>
          ) : (
            <button onClick={() => setIsDeleteConfirm(true)} className="p-2 text-app-text-muted hover:text-red-500">
              <Trash2 size={20} />
            </button>
          )}

          {!isRoot && (
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-app-text-muted hover:text-app-text">
                <MoreVertical size={20} />
              </button>
              
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-app-surface rounded shadow-lg py-1 border border-app-border z-50">
                    <button className="w-full text-left px-4 py-2 hover:bg-app-bg text-app-text">Move To</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-app-bg text-app-text">Copy To</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-app-bg text-app-text">Select All</button>
                    <button onClick={() => { setIsMenuOpen(false); onOpenDetails(); }} className="w-full text-left px-4 py-2 hover:bg-app-bg text-app-text">Details</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-14 bg-app-surface flex items-center justify-between px-2 shadow-md z-10 relative border-b border-app-border">
      <div className="flex items-center flex-1">
        {!isRoot && (
          <button onClick={onBack} className="p-2 -ml-1 mr-1 text-app-text-muted hover:text-app-text">
            <ArrowLeft size={24} />
          </button>
        )}
        <span className={cn("text-xl font-semibold tracking-tight text-app-text", isRoot ? "ml-2" : "")}>Gallery</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button onClick={onOpenDetails} className="p-2 text-app-text-muted hover:text-app-text">
          <Info size={20} />
        </button>
        
        <button onClick={handleSortClick} className="p-2 text-app-text-muted hover:text-app-text relative">
          <ArrowUpDown size={20} />
          <span className="absolute bottom-0 right-0 text-[10px] font-bold bg-app-bg px-1 rounded text-app-text">
            {sortConfig.by.charAt(0).toUpperCase()}
          </span>
        </button>
        
        {isSearchOpen ? (
          <div className="flex items-center bg-app-bg rounded px-2 py-1 border border-app-border">
            <input 
              autoFocus
              type="text" 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent text-app-text outline-none w-24 text-sm"
              placeholder="Search..."
            />
            <button onClick={() => { setIsSearchOpen(false); onSearchChange(''); }} className="text-app-text-muted hover:text-app-text ml-1">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setIsSearchOpen(true)} className="p-2 text-app-text-muted hover:text-app-text">
            <Search size={20} />
          </button>
        )}

        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-app-text-muted hover:text-app-text">
            <MoreVertical size={20} />
          </button>
          
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 w-48 bg-app-surface rounded shadow-lg py-1 border border-app-border z-50">
                <div className="px-4 py-2 text-xs font-semibold text-app-text-muted uppercase tracking-wider">Filter Media</div>
              <label className="flex items-center px-4 py-2 hover:bg-app-bg cursor-pointer text-app-text">
                <input type="checkbox" checked={filters.images} onChange={(e) => onFilterChange({...filters, images: e.target.checked})} className="mr-2 accent-app-accent" />
                Images
              </label>
              <label className="flex items-center px-4 py-2 hover:bg-app-bg cursor-pointer text-app-text">
                <input type="checkbox" checked={filters.videos} onChange={(e) => onFilterChange({...filters, videos: e.target.checked})} className="mr-2 accent-app-accent" />
                Videos
              </label>
              <label className="flex items-center px-4 py-2 hover:bg-app-bg cursor-pointer text-app-text">
                <input type="checkbox" checked={filters.gifs} onChange={(e) => onFilterChange({...filters, gifs: e.target.checked})} className="mr-2 accent-app-accent" />
                Gifs
              </label>
              
              <div className="border-t border-app-border my-1"></div>
              <div className="px-4 py-2 text-xs font-semibold text-app-text-muted uppercase tracking-wider">Columns</div>
              <div className="flex justify-around px-4 py-2">
                {[2, 3, 4, 5].map(c => (
                  <button 
                    key={c} 
                    onClick={() => onColumnCountChange(c)}
                    className={cn("w-6 h-6 rounded flex items-center justify-center text-sm", columnCount === c ? "bg-app-accent text-white" : "bg-app-bg text-app-text-muted")}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="border-t border-app-border my-1"></div>
              <button onClick={handleShowHiddenClick} className="w-full text-left px-4 py-2 hover:bg-app-bg text-app-text">
                {showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'}
              </button>
              <button onClick={() => { setIsMenuOpen(false); onOpenSettings(); }} className="w-full text-left px-4 py-2 hover:bg-app-bg text-app-text">
                Settings
              </button>
            </div>
          </>
          )}
        </div>
      </div>

      {passwordPrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-app-surface p-6 rounded-lg w-80 border border-app-border">
            <h3 className="text-lg font-medium mb-4 text-app-text">Enter Password</h3>
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded p-2 mb-4 text-app-text outline-none focus:border-app-accent"
              placeholder={`Password (${appPassword})`}
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setPasswordPrompt(false)} className="px-4 py-2 text-app-text-muted hover:text-app-text">Cancel</button>
              <button onClick={submitPassword} className="px-4 py-2 bg-app-accent text-white rounded hover:opacity-90">Unlock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
