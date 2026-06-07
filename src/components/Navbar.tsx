import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { Bell, LogOut, CheckCheck, Loader, Users, Search, Filter, User } from 'lucide-react';

interface NavbarProps {
  searchText: string;
  onSearchChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (val: string) => void;
  currentView: 'dashboard' | 'board';
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchText,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  currentView,
  onOpenProfile
}) => {
  const { logout, user } = useAuth();
  const { notifications, onlineUsers, projects, activeProject, markAllNotificationsRead, markNotificationRead } = useProjects();
  
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUsersPopover, setShowUsersPopover] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Gather collaborators who are online
  const activeCollaborators = onlineUsers.length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#0a1128]/30 backdrop-blur-md px-6 flex items-center justify-between select-none shrink-0 relative z-30">
      
      {/* 1. Searching/Filtering Controls */}
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={
              currentView === 'board' && activeProject
                ? `Search tasks in "${activeProject.name}"...`
                : "Search active workspaces..."
            }
            value={searchText}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/40 border border-white/10 backdrop-blur-sm rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400/80 transition-all text-slate-100"
          />
        </div>

        {/* Priority Filter for Kanban Board */}
        {currentView === 'board' && activeProject && (
          <div className="flex items-center gap-2">
                    <select
              value={priorityFilter}
              onChange={e => onPriorityFilterChange(e.target.value)}
              className="bg-slate-950/80 border border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-slate-200 focus:outline-none text-xs focus:border-indigo-400 cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">Priority: All</option>
              <option value="Low" className="bg-slate-900 text-slate-200">Low</option>
              <option value="Medium" className="bg-slate-900 text-slate-200">Medium</option>
              <option value="High" className="bg-slate-900 text-slate-200">High</option>
            </select>

            {activeProject && (activeProject as any).membersUsers && (
              <select
                value={assigneeFilter}
                onChange={e => onAssigneeFilterChange(e.target.value)}
                className="bg-slate-950/80 border border-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-slate-200 focus:outline-none text-xs focus:border-indigo-400 cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-200">Assignee: All</option>
                <option value={activeProject.owner} className="bg-slate-900 text-slate-200">Owner</option>
                {((activeProject as any).membersUsers || []).map((m: any) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">{m.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* 2. Platform Status, Notifications & Profile Options */}
      <div className="flex items-center gap-4">
        
        {/* Presence Stream: Active Users badge */}
        <div className="relative">
          <button
            onClick={() => setShowUsersPopover(!showUsersPopover)}
            onBlur={() => setTimeout(() => setShowUsersPopover(false), 200)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl cursor-pointer text-xs transition-all relative"
            title="Online Users Presence"
          >
            <Users className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-emerald-300">{activeCollaborators}</span>
            <span className="text-[10px] text-slate-500 font-medium">Online</span>
          </button>

          {showUsersPopover && (
            <div className="absolute right-0 mt-2.5 w-64 bg-[#0a1128]/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl p-3 z-50 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block mb-2 px-1">
                Active Project collaborators
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/10">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs text-slate-200 truncate">{user?.name} (You)</span>
                  <span className="text-[9px] bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300 ml-auto font-mono text-[8px] tracking-wider uppercase font-extrabold font-semibold">Active</span>
                </div>
                
                {/* Simulated list of online status or others */}
                {onlineUsers.filter(uid => uid !== user?.id).map(uid => {
                  return (
                    <div key={uid} className="flex items-center gap-2 px-2 py-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-slate-400 truncate">ID: {uid.substring(0, 8)}...</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotif(!showNotif);
              setShowProfile(false);
            }}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-250 border border-white/10 rounded-xl transition-all cursor-pointer relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-full leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-3.5 w-80 bg-[#0a1128]/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Alerts feed</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/10">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="text-xs text-slate-500 block leading-relaxed">No new workspace feeds reported.</span>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer ${
                        !n.isRead ? 'bg-indigo-500/5' : 'opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-slate-300 leading-relaxed block">{n.message}</span>
                        {!n.isRead && (
                          <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600 block mt-1 font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotif(false);
            }}
            className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 cursor-pointer"
          >
            <img
              src={user?.profilePicture}
              alt={user?.name}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-lg object-cover bg-slate-800"
            />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-3.5 w-56 bg-[#0a1128]/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 text-left">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <span className="text-xs font-bold text-slate-200 block truncate">{user?.name}</span>
                <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">{user?.email}</span>
                <span className="inline-block mt-2 text-[9px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg tracking-wider">
                  {user?.role || 'Collaborator'}
                </span>
              </div>
              
              <div className="p-1.5 bg-[#0a1128]/40 space-y-1">
                <button
                  onClick={() => {
                    onOpenProfile();
                    setShowProfile(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/10 transition-all rounded-xl cursor-pointer"
                >
                  <User className="h-4 w-4 text-indigo-400" />
                  <span>Edit Profile</span>
                </button>
                
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-all rounded-xl cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Exit Arena</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
