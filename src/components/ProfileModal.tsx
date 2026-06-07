import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User as UserIcon, Briefcase, Camera, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [role, setRole] = useState('Member');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role || 'Member');
      setAvatar(user.profilePicture || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setSaving(true);
    const result = await updateProfile(name, role, avatar);
    setSaving(false);

    if (result.success) {
      toast.success('Professional identity saved successfully!');
      onClose();
    } else {
      toast.error(result.error || 'Failed to update profile settings.');
    }
  };

  const handleSelectPreset = (url: string) => {
    setAvatar(url);
  };

  // Safe callback when clicking backdrop to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Initial avatar helper based on initials
  const setInitialsAvatar = () => {
    const freshUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || user.name)}`;
    setAvatar(freshUrl);
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#0a1128]/95 backdrop-blur-lg border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 text-left">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-indigo-400 font-bold">
            <UserIcon className="h-5 w-5" />
            <span className="text-sm font-bold text-slate-100 font-sans">Self Profile Management</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email read-only badge */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-mono text-[10px] tracking-wider uppercase font-semibold">User Credentials</span>
            <span className="text-slate-300 font-mono truncate max-w-[240px]">{user.email}</span>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                maxLength={40}
                placeholder="Manager / Developer Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder-slate-600"
              />
            </div>
          </div>

          {/* Role selector field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Corporate Role</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 cursor-pointer text-slate-200 font-sans"
              >
                <option value="Lead Developer">Lead Developer</option>
                <option value="Senior Developer">Senior Developer</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="QA Specialist">QA Specialist</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="Member">General Contributor</option>
              </select>
            </div>
          </div>

          {/* Avatar Options Selection Area */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Profile Avatar</label>
            
            {/* Active Preview */}
            <div className="flex items-center gap-4 bg-slate-950/45 p-3.5 rounded-xl border border-white/5">
              <img
                src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || user.name)}`}
                alt="Selected avatar"
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl object-cover bg-indigo-950 border border-white/10 shadow-lg"
                onError={(e) => {
                  (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
                }}
              />
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs text-slate-300 font-semibold">Interactive Image Vector</span>
                <button
                  type="button"
                  onClick={setInitialsAvatar}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-all select-none self-start font-mono font-bold"
                >
                  [ Use initials-based generator ]
                </button>
              </div>
            </div>

            {/* Presets Grid Selection */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-500 font-sans tracking-wide block">Select professional preset:</span>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = avatar === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:scale-105 transition-all ${
                        isSelected ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-md' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-950/40 flex items-center justify-center">
                          <Check className="h-4.5 w-4.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Link input option */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] text-slate-500 font-sans tracking-wide block">Or custom image URL address:</span>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatar.startsWith('https://api.dicebear.com') ? '' : avatar}
                  onChange={e => setAvatar(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-white/5 rounded-xl text-[11px] text-slate-300 focus:outline-none focus:border-indigo-400 transition-all font-mono placeholder-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:shadow-indigo-500/10 hover:shadow-md transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <span>Save Profile Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
