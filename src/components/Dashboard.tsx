import React, { useEffect, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Layers, CheckCircle2, MessageSquare, AlertTriangle, Play, Calendar, UserCheck, RefreshCw, Send, HelpCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardProps {
  searchText: string;
  onSelectProject: (id: string) => void;
  onSelectNav: (view: 'board') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ searchText, onSelectProject, onSelectNav }) => {
  const { 
    dashboardStats, 
    dashboardLoading, 
    loadDashboardStats, 
    projects, 
    selectProject,
    discoverableProjects,
    loadDiscoverableProjects,
    submitJoinRequest
  } = useProjects();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [submittingProjectId, setSubmittingProjectId] = useState<string | null>(null);
  const [pitchMessage, setPitchMessage] = useState('');
  const [isPostingRequest, setIsPostingRequest] = useState(false);

  useEffect(() => {
    loadDashboardStats();
    loadDiscoverableProjects();
  }, []);

  // Filter projects by search text
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredDiscoverable = discoverableProjects.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleJoinSubmit = async (projectId: string) => {
    setIsPostingRequest(true);
    const result = await submitJoinRequest(projectId, pitchMessage);
    if (result.success) {
      toast.success('Join request submitted! The workspace team will review it.');
      setSubmittingProjectId(null);
      setPitchMessage('');
    } else {
      toast.error(result.error || 'Failed sending join request.');
    }
    setIsPostingRequest(false);
  };

  if (dashboardLoading || !dashboardStats) {
    return (
      <div className="p-8 space-y-10 max-w-7xl mx-auto h-screen overflow-y-auto select-none">
        
        {/* Header Loading Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-850 rounded animate-pulse" />
          </div>
        </div>

        {/* Numeric Indicators loading */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                <div className="h-8 w-8 bg-slate-850 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-12 bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Columns Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  const {
    totalProjects,
    pendingTasks,
    completedTasks,
    assignedTasks,
    statusDistribution,
    priorityDistribution,
    recentActivities
  } = dashboardStats;

  // Render recent activity description nicely
  const renderActivityDescription = (act: any) => {
    const actionColor = act.action.includes('create')
      ? 'text-indigo-400'
      : act.action.includes('delete')
      ? 'text-rose-400'
      : act.action.includes('move') || act.action.includes('status')
      ? 'text-indigo-300'
      : 'text-slate-300';

    return (
      <div className="text-xs text-slate-400 leading-relaxed font-sans">
        <span className="font-bold text-slate-200">{act.userName}</span>{' '}
        <span className={`font-semibold ${actionColor}`}>{act.action}</span>{' '}
        <span className="font-semibold text-slate-300">
          {act.targetType}: "{act.targetName}"
        </span>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto h-screen overflow-y-auto select-none pb-24">
      
      {/* 1. Header greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-100">
            Welcome Back, {user?.name}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            System status operational. Here is an overview of active deliverables and milestones.
          </p>
        </div>
        <button
          onClick={loadDashboardStats}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-350 hover:bg-white/10 hover:text-slate-100 transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Synchronize Grid</span>
        </button>
      </div>

      {/* 2. Unified Numerical KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        
        {/* KPI 1 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Managed Workspaces</span>
            <div className="text-2xl font-extrabold text-slate-100 font-mono tracking-tight">{totalProjects}</div>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/15">
            <Layers className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Milestones</span>
            <div className="text-2xl font-extrabold text-[#f59e0b] font-mono tracking-tight">{assignedTasks}</div>
          </div>
          <div className="bg-[#f59e0b]/10 p-3 rounded-xl border border-[#f59e0b]/15">
            <UserCheck className="h-5 w-5 text-[#f59e0b]" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Actions</span>
            <div className="text-2xl font-extrabold text-blue-400 font-mono tracking-tight">{pendingTasks}</div>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/15">
            <Play className="h-5 w-5 text-blue-400" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Actions Settled</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">{completedTasks}</div>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/15">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* 3. Analytics charts / custom grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Breakdown list */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-4">Milestone Progress status</span>
          
          <div className="space-y-4">
            {/* Status Item 1: To Do */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>To Do</span>
                <span className="font-mono text-slate-200">{statusDistribution.todo}</span>
              </div>
              <div className="h-2 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-450 rounded-full transition-all animate-pulse"
                  style={{ width: `${(statusDistribution.todo / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Status Item 2: In Progress */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>In Progress</span>
                <span className="font-mono text-slate-200">{statusDistribution.inProgress}</span>
              </div>
              <div className="h-2 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all shadow-md shadow-indigo-400/20"
                  style={{ width: `${(statusDistribution.inProgress / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Status Item 3: Review */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>Review</span>
                <span className="font-mono text-slate-200">{statusDistribution.review}</span>
              </div>
              <div className="h-2 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(statusDistribution.review / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Status Item 4: Completed */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>Completed</span>
                <span className="font-mono text-slate-200">{statusDistribution.completed}</span>
              </div>
              <div className="h-2 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all shadow-md shadow-emerald-400/20"
                  style={{ width: `${(statusDistribution.completed / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Allocation list */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-4">Urgency Profile allocation</span>
          
          <div className="space-y-4">
            {/* Low */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>Low Priority</span>
                <span className="font-mono text-slate-200">{priorityDistribution.low}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500 rounded-full transition-all"
                  style={{ width: `${(priorityDistribution.low / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Medium */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>Medium Priority</span>
                <span className="font-mono text-slate-200">{priorityDistribution.medium}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all shadow-md shadow-indigo-500/25"
                  style={{ width: `${(priorityDistribution.medium / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* High */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                <span>High Priority</span>
                <span className="font-mono text-slate-200">{priorityDistribution.high}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all shadow-md shadow-rose-550/25"
                  style={{ width: `${(priorityDistribution.high / (pendingTasks + completedTasks || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent collaborators logs stream */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col h-[280px]">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3.5">Recent Activities Feed</span>
          
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5">
            {recentActivities.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-xs text-slate-500 block leading-relaxed">No actions recorded on workstreams.</span>
              </div>
            ) : (
              recentActivities.map(act => (
                <div key={act.id} className="flex gap-3 items-start border-b border-slate-850/40 pb-2 bg-transparent">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0 mt-2 shadow-sm shadow-indigo-400/80" />
                  <div className="space-y-0.5">
                    {renderActivityDescription(act)}
                    <span className="text-[9px] text-slate-650 font-mono block">
                      {new Date(act.createdAt).toLocaleDateString()} at{' '}
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Active Workspaces Deck */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('my')}
              className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer relative ${
                activeTab === 'my' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              My Workspaces ({filteredProjects.length})
              {activeTab === 'my' && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer relative ${
                activeTab === 'discover' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Find Teams & Open Projects ({filteredDiscoverable.length})
              {activeTab === 'discover' && (
                <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {activeTab === 'my' ? (
          filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
              <p className="text-sm font-semibold text-slate-300">No workspaces matching search found.</p>
              <p className="text-xs text-slate-600 mt-1">Initiative one on the left sidebar to start collaborating.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map(p => {
                const isMine = p.owner === user?.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      selectProject(p.id);
                      onSelectNav('board');
                    }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-500/40 p-5 rounded-2xl shadow-xl transition-all cursor-pointer hover:shadow-indigo-500/5 group flex flex-col justify-between hover:translate-y-[-1px] min-h-[160px]"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{p.name}</h4>
                        {isMine ? (
                          <span className="bg-indigo-500/10 text-indigo-400 font-extrabold uppercase text-[9px] tracking-wide px-2 py-0.5 rounded-lg border border-indigo-500/10 shrink-0">
                            Owner
                          </span>
                        ) : (
                          <span className="bg-white/5 text-slate-400 font-bold text-[9px] px-2 py-0.5 rounded-lg shrink-0">
                            Collaborator
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-450 leading-relaxed line-clamp-3">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850/60 pt-3 mt-4 text-[10px] text-slate-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      {p.members && (
                        <span className="bg-slate-850 px-2 py-0.5 rounded-lg text-slate-300 font-semibold font-sans">
                          {p.members.length + 1} Member{p.members.length !== 0 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredDiscoverable.length === 0 ? (
            <div className="p-12 text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
              <p className="text-sm font-semibold text-slate-300">No other recruitments or open projects available.</p>
              <p className="text-xs text-slate-600 mt-1">Check back later or invite new members to join your workspace!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDiscoverable.map(p => {
                const pendingRequest = (p.joinRequests || []).find((r: any) => r.userId === user?.id && r.status === 'pending');
                const isDeclined = (p.joinRequests || []).some((r: any) => r.userId === user?.id && r.status === 'declined');

                return (
                  <div
                    key={p.id}
                    className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[220px]"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2 text-left">
                        <h4 className="text-xs font-bold text-slate-200 truncate uppercase tracking-tight">{p.name}</h4>
                        {p.ownerUser && (
                          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg text-slate-400 text-[10px] shrink-0">
                            <img
                              src={p.ownerUser.profilePicture}
                              alt={p.ownerUser.name}
                              className="h-3.5 w-3.5 rounded-full object-cover bg-slate-800"
                              referrerPolicy="no-referrer"
                            />
                            <span className="truncate max-w-[60px] font-medium text-slate-300">{p.ownerUser.name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 text-left">
                        {p.description}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-4 space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>Launch: {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                        {p.members && (
                          <span className="bg-slate-850 px-2 py-0.5 rounded-lg text-slate-450 font-bold font-sans">
                            {p.members.length + 1} Collaborators
                          </span>
                        )}
                      </div>

                      {/* Request and Expansion Area */}
                      {pendingRequest ? (
                        <div className="w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider rounded-xl text-center">
                          ● Application Pending Review
                        </div>
                      ) : isDeclined ? (
                        <div className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-wider rounded-xl text-center">
                          ● Application Declined
                        </div>
                      ) : submittingProjectId === p.id ? (
                        <div className="space-y-2 pt-1 text-left">
                          <textarea
                            placeholder="Write a brief message: why would you like to build with this team?"
                            value={pitchMessage}
                            required
                            onChange={e => setPitchMessage(e.target.value)}
                            className="w-full p-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400 resize-none h-16 leading-relaxed"
                          />
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => setSubmittingProjectId(null)}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleJoinSubmit(p.id)}
                              disabled={isPostingRequest || !pitchMessage.trim()}
                              className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-450 text-slate-950 rounded-lg text-[10px] font-extrabold cursor-pointer disabled:opacity-40"
                            >
                              {isPostingRequest ? 'Sending...' : 'Send Pitch'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSubmittingProjectId(p.id);
                            setPitchMessage('');
                          }}
                          className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl text-center transition-all cursor-pointer"
                        >
                          Request to Join Team
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
};
