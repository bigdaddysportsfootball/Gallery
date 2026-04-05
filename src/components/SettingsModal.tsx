import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  appPassword?: string;
  onPasswordChange?: (pw: string) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  accentColor: 'blue' | 'red' | 'green' | 'purple';
  onAccentColorChange: (color: 'blue' | 'red' | 'green' | 'purple') => void;
  onClose: () => void;
}

export default function SettingsModal({ 
  appPassword = '1234', 
  onPasswordChange, 
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
  onClose 
}: SettingsModalProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

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
                    <input 
                      type="password" 
                      placeholder="Current Password" 
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded p-2 text-app-text outline-none focus:border-app-accent"
                    />
                    <input 
                      type="password" 
                      placeholder="New Password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded p-2 text-app-text outline-none focus:border-app-accent"
                    />
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
