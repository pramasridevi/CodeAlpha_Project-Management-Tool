import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Plus, FolderKanban, Trash2, X, FilePlus, Settings } from 'lucide-react';

interface SidebarProps {
  onSelectNav: (view: 'dashboard' | 'board') => void;
  currentView: 'dashboard' | 'board';
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelectNav, currentView, onOpenProfile }) => {
  const { projects, activeProject, selectProject, createProject, deleteProject } = useProjects();
  const { user } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const HandleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projDesc) return;
    setCreating(true);
    const ok = await createProject(projName, projDesc);
    if (ok) {
      setProjName('');
      setProjDesc('');
      setShowModal(false);
      onSelectNav('board');
    }
    setCreating(false);
  };

  const HandleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to permanently delete project "${name}"? This will delete all tasks and comment histories.`)) {
      await deleteProject(id);
      onSelectNav('dashboard');
    }
  };

  return (
    <aside className="w-64 bg-[#0a1128]/40 backdrop-blur-md border-r border-white/10 flex flex-col h-screen overflow-y-auto shrink-0 select-none">
      {/* Platform Title */}
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="bg-indigo-500/15 p-1.5 rounded-lg border border-indigo-500/10 shadow-lg shadow-indigo-500/10">
          <LayoutGrid className="h-5 w-5 text-indigo-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-bold text-slate-100 tracking-tight text-sm">Sphere Workspace</span>
          <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold">Enterprise Hub</span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="p-4 space-y-1">
        <button
          onClick={() => {
            selectProject(''); // reset
            onSelectNav('dashboard');
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-xs cursor-pointer ${
            currentView === 'dashboard' && !activeProject
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Hub Dashboard</span>
        </button>
      </div>

      {/* Project Selector Lists */}
      <div className="flex-1 px-4 py-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2 px-1">
          <span>Active Projects</span>
          <button
            onClick={() => setShowModal(true)}
            className="text-slate-400 hover:text-indigo-400 p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            title="Create Project"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-3 text-center bg-white/5 rounded-xl border border-dashed border-white/10 mt-1">
            <span className="text-[11px] text-slate-500 text-center leading-relaxed block">
              No projects hosted. Create one below!
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map(p => {
              const isSelected = activeProject?.id === p.id && currentView === 'board';
              const isOwner = p.owner === user?.id;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    selectProject(p.id);
                    onSelectNav('board');
                  }}
                  className={`group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all font-medium text-xs border cursor-pointer border-transparent ${
                    isSelected
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FolderKanban className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="truncate">{p.name}</span>
                  </div>

                  {isOwner && (
                    <button
                      onClick={(e) => HandleDelete(e, p.id, p.name)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition-all cursor-pointer flex-shrink-0"
                      title="Delete Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account display bar */}
      <div 
        onClick={onOpenProfile}
        className="p-4 border-t border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all cursor-pointer mt-auto"
        title="Manage profile settings"
      >
        <div className="flex items-center gap-3">
          <img
            src={user?.profilePicture}
            alt={user?.name}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-xl object-cover ring-2 ring-indigo-500/20 bg-indigo-950"
          />
          <div className="flex flex-col items-start truncate leading-tight">
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{user?.name}</span>
            <span className="text-[10px] text-slate-500 truncate max-w-[140px] font-mono">{user?.role || 'Collaborator'}</span>
          </div>
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-lg border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold">
                <FilePlus className="h-5 w-5" />
                <span className="text-sm font-bold text-slate-100">Initiate Workspace</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={HandleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo SaaS Platform"
                  value={projName}
                  onChange={e => setProjName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detailed Mandate / Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter high level objectives, milestones and roles..."
                  value={projDesc}
                  onChange={e => setProjDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs hover:shadow-indigo-500/10 hover:shadow-md transition-all cursor-pointer"
                >
                  {creating ? 'Spawning...' : 'Launch Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
