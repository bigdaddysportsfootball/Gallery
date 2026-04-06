import React, { useState } from 'react';
import { X, Plus, Trash2, HardDrive, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  appPassword?: string;
  onPasswordChange?: (pw: string) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  accentColor: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' | 'cyan';
  onAccentColorChange: (color: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' | 'cyan') => void;
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
  appPassword = '12345', 
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
      return;
    }
    if (newPassword.length < 5) {
      return;
    }
    if (onPasswordChange) {
      onPasswordChange(newPassword);
      setIsChangingPassword(false);
      setOldPassword('');
      setNewPassword('');
    }
  };

  const NumericKeypad = ({ value, onChange, onComplete }: { value: string, onChange: (val: string) => void, onComplete: () => void }) => {
    const handleNumberClick = (num: string) => {
      if (value.length < 5) {
        onChange(value + num);
      }
    };

    const handleBackspace = () => {
      onChange(value.slice(0, -1));
    };

    return (
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberClick(num.toString())}
            className="h-12 bg-app-bg border border-app-border rounded-lg text-app-text text-xl font-medium active:bg-app-border transition-colors"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={handleBackspace}
          className="h-12 bg-app-bg border border-app-border rounded-lg text-app-text text-sm font-medium active:bg-app-border transition-colors"
        >
          DEL
        </button>
        <button
          type="button"
          onClick={() => handleNumberClick('0')}
          className="h-12 bg-app-bg border border-app-border rounded-lg text-app-text text-xl font-medium active:bg-app-border transition-colors"
        >
          0
        </button>
        <button
          type="button"
          disabled={value.length < 5}
          onClick={onComplete}
          className="h-12 bg-app-accent text-white rounded-lg text-sm font-bold active:opacity-80 transition-opacity disabled:opacity-50"
        >
          OK
        </button>
      </div>
    );
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
                <div className="flex flex-wrap gap-2 justify-end max-w-[200px]">
                  {(['blue', 'red', 'green', 'purple', 'orange', 'pink', 'yellow', 'cyan'] as const).map(color => {
                    const colorMap: Record<string, string> = {
                      blue: 'bg-blue-500',
                      red: 'bg-red-500',
                      green: 'bg-green-500',
                      purple: 'bg-purple-500',
                      orange: 'bg-orange-500',
                      pink: 'bg-pink-500',
                      yellow: 'bg-yellow-500',
                      cyan: 'bg-cyan-500'
                    };
                    return (
                      <button
                        key={color}
                        onClick={() => onAccentColorChange(color)}
                        className={`w-6 h-6 rounded-full ${colorMap[color]} ${accentColor === color ? 'ring-2 ring-app-text' : ''}`}
                      />
                    );
                  })}
                </div>
              </label>
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
              <p className="text-xs text-app-text-muted">Password is required to view hidden files. Must be 5 digits.</p>
              
              {isChangingPassword && (
                <div className="mt-4 p-4 bg-app-bg/50 rounded-lg border border-app-border">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs text-app-text-muted">Current Password ({oldPassword.length}/5)</label>
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className={`w-8 h-10 border-b-2 flex items-center justify-center text-app-text text-xl ${oldPassword.length > i ? 'border-app-accent' : 'border-app-border'}`}>
                            {oldPassword.length > i ? '•' : ''}
                          </div>
                        ))}
                      </div>
                      {oldPassword.length === 5 && oldPassword !== appPassword && (
                        <p className="text-[10px] text-red-500 text-center">Incorrect current password</p>
                      )}
                    </div>

                    {oldPassword === appPassword && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-xs text-app-text-muted">New Password ({newPassword.length}/5)</label>
                        <div className="flex justify-center gap-2">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className={`w-8 h-10 border-b-2 flex items-center justify-center text-app-text text-xl ${newPassword.length > i ? 'border-app-accent' : 'border-app-border'}`}>
                              {newPassword.length > i ? '•' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <NumericKeypad 
                      value={oldPassword === appPassword ? newPassword : oldPassword}
                      onChange={oldPassword === appPassword ? setNewPassword : setOldPassword}
                      onComplete={() => {
                        if (oldPassword === appPassword && newPassword.length === 5) {
                          onPasswordChange?.(newPassword);
                          setIsChangingPassword(false);
                          setOldPassword('');
                          setNewPassword('');
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
