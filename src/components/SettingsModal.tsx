import React, { useState } from 'react';
import { X, Plus, Trash2, HardDrive, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  appPassword?: string;
  onPasswordChange?: (pw: string) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  accentColor: 'blue' | 'red' | 'green' | 'purple';
  onAccentColorChange: (color: 'blue' | 'red' | 'green' | 'purple') => void;
  storageRoots?: FileSystemDirectoryHandle[];
  onAddStorageRoot?: () => void;
  onRemoveStorageRoot?: (index: number) => void;
  onRefreshAll?: () => void;
  hasPermission?: boolean;
  onPermissionToggle?: (e: React.MouseEvent) => void;
  onManagePermissions?: () => void;
  onClose: () => void;
}

export default function SettingsModal({ 
  appPassword = '1234', 
  onPasswordChange, 
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
  storageRoots = [],
  onAddStorageRoot,
  onRemoveStorageRoot,
  onRefreshAll,
  hasPermission = false,
  onPermissionToggle,
  onManagePermissions,
  onClose 
}: SettingsModalProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPassword !== appPassword) {
      // Removed alert as per user request
      return;
    }
    if (newPassword.length < 4) {
      // Removed alert as per user request
      return;
    }
    if (onPasswordChange) {
      onPasswordChange(newPassword);
      // Removed alert as per user request
      setIsChangingPassword(false);
      setOldPassword('');
      setNewPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-app-surface w-full max-w-md rounded-xl border border-app-border overflow-hidden">
        <div className="p-4 border-b border-app-border flex justify-between items-center">
          <h2 className="text-xl font-semibold text-app-text">Settings</h2>
          <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X size={24} /></button>
        </div>
        
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-app-text-muted uppercase tracking-wider mb-3">Appearance</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-app-text">
                <span>Theme</span>
                <select 
                  value={theme}
                  onChange={(e) => onThemeChange(e.target.value as 'dark' | 'light')}
                  className="bg-app-bg border border-app-border rounded px-2 py-1 outline-none text-app-text"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label className="flex items-center justify-between text-app-text">
                <span>Accent Color</span>
                <div className="flex space-x-2">
                  {(['blue', 'red', 'green', 'purple'] as const).map(color => (
                    <button
                      key={color}
                      onClick={() => onAccentColorChange(color)}
                      className={`w-6 h-6 rounded-full bg-${color}-500 ${accentColor === color ? 'ring-2 ring-app-text' : ''}`}
                    />
                  ))}
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-app-text-muted uppercase tracking-wider mb-3">Permissions</h3>
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-3 bg-app-bg/50 rounded-lg border border-app-border cursor-pointer active:bg-app-border/50 transition-colors"
                onClick={onPermissionToggle}
              >
                <div className="flex flex-col">
                  <span className="text-app-text font-medium">Photos and videos</span>
                  <span className="text-[11px] text-app-text-muted">Allow app to access all media on device</span>
                </div>
                <div 
                  className={`w-[44px] h-[24px] rounded-full p-1 transition-colors duration-300 ${hasPermission ? 'bg-[#f86734]' : 'bg-app-border'}`}
                >
                  <div className={`w-[16px] h-[16px] bg-white rounded-full shadow-md transform transition-transform duration-300 ${hasPermission ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <button 
                onClick={onManagePermissions}
                className="w-full py-2 text-sm text-app-accent hover:bg-app-accent/10 rounded transition-colors border border-app-accent/20"
              >
                Manage App Permissions
              </button>
              <p className="text-[11px] text-app-text-muted leading-tight">
                This permission is required for the app to automatically find and display your media. If disabled, you must manually add folders using "Add Source".
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-app-text-muted uppercase tracking-wider mb-3">Storage Management</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-app-text">Storage Sources</span>
                <div className="flex gap-2">
                  <button 
                    onClick={onRefreshAll}
                    className="px-3 py-1 bg-app-bg border border-app-border text-app-text rounded-lg text-sm font-medium hover:bg-app-border"
                  >
                    Refresh All
                  </button>
                  <button 
                    onClick={onAddStorageRoot}
                    className="flex items-center gap-1 px-3 py-1 bg-app-accent text-white rounded-lg text-sm font-medium hover:opacity-90"
                  >
                    <Plus size={16} />
                    Add Source
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {storageRoots.length === 0 ? (
                  <p className="text-xs text-app-text-muted italic">No storage sources added yet.</p>
                ) : (
                  storageRoots.map((root, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-app-bg/50 rounded-lg border border-app-border">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <HardDrive size={18} className="text-app-accent shrink-0" />
                        <span className="text-sm text-app-text truncate">{root.name || 'Main Storage'}</span>
                      </div>
                      <button 
                        onClick={() => onRemoveStorageRoot?.(index)}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-[11px] text-app-text-muted leading-tight">
                On Android, use "Add Source" to select your media folders. The app will remember these files and you can "Refresh All" to re-index them.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-app-text-muted uppercase tracking-wider mb-3">Security</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-app-text">
                <span>Hidden Files Password</span>
                <button 
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="px-3 py-1 bg-app-bg hover:bg-app-border rounded text-sm"
                >
                  {isChangingPassword ? 'Cancel' : 'Change'}
                </button>
              </div>
              <p className="text-xs text-app-text-muted">Password is required to view hidden files. Hidden files are automatically hidden when the app is closed.</p>
              
              {isChangingPassword && (
                <form onSubmit={handlePasswordChangeSubmit} className="mt-4 p-4 bg-app-bg/50 rounded-lg border border-app-border">
                  <div className="space-y-3">
                    <div className="relative">
                      <input 
                        type={showPasswords ? "text" : "password"} 
                        placeholder="Current Password" 
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full bg-app-bg border border-app-border rounded p-2 text-app-text outline-none focus:border-app-accent pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text"
                      >
                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPasswords ? "text" : "password"} 
                        placeholder="New Password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-app-bg border border-app-border rounded p-2 text-app-text outline-none focus:border-app-accent pr-10"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-app-accent text-white rounded hover:opacity-90 font-medium">
                      Save New Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
