import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { TaskDetailsModal } from './TaskDetailsModal';
import { Plus, UserPlus, X, Briefcase, Mail, ChevronRight, Users, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  searchText: string;
  priorityFilter: string;
  assigneeFilter: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  searchText,
  priorityFilter,
  assigneeFilter
}) => {
  const { activeProject, tasks, createTask, updateTask, inviteMember, updateProject, processJoinRequest } = useProjects();
  const { user } = useAuth();

  // Dialog / Modal Controllers
  const [showTaskDetails, setShowTaskDetails] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState<TaskStatus | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditProjModal, setShowEditProjModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const pendingRequests = (activeProject?.joinRequests || []).filter((r: any) => r.status === 'pending');

  // New task inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Collaborators invitation inputs
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Edit project info inputs
  const [editProjName, setEditProjName] = useState(activeProject?.name || '');
  const [editProjDesc, setEditProjDesc] = useState(activeProject?.description || '');
  const [editingProject, setEditingProject] = useState(false);

  // Drag highlights
  const [activeOverColumn, setActiveOverColumn] = useState<string | null>(null);

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-4rem)] select-none">
        <Briefcase className="h-12 w-12 text-indigo-400 mb-4 animate-bounce" />
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">No Workspace Loaded</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          Select or launch a project collaborative workspace from the left panel to begin managing tasks and milestones.
        </p>
      </div>
    );
  }

  // Filter Tasks dynamically
  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      t.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesAssignee = !assigneeFilter || t.assignedTo === assigneeFilter;
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Kanban Columns Configurations
  const columns: { id: TaskStatus; title: string; color: string; border: string }[] = [
    { id: 'To Do', title: 'To Do', color: 'bg-slate-400/10 text-slate-400', border: 'border-white/10' },
    { id: 'In Progress', title: 'In Progress', color: 'bg-indigo-550/10 text-indigo-400', border: 'border-indigo-500/10' },
    { id: 'Review', title: 'Under Review', color: 'bg-[#f59e0b]/10 text-[#f59e0b]', border: 'border-[#f59e0b]/15' },
    { id: 'Completed', title: 'Completed', color: 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/15', border: 'border-emerald-500/15' }
  ];

  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (activeOverColumn !== columnId) {
      setActiveOverColumn(columnId);
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    
    // Only cancel the highlight if pointer coordinates truly left column bounds
    if (
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom
    ) {
      setActiveOverColumn(null);
    }
  };

  const handleDropColumn = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setActiveOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (taskToMove && taskToMove.status !== status) {
      await updateTask(taskId, { status });
      toast.success(`Milestone moved to "${status}"`);
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskDesc || !showCreateTask) return;

    const ok = await createTask({
      title: newTaskTitle,
      description: newTaskDesc,
      priority: newTaskPriority,
      status: showCreateTask,
      assignedTo: newTaskAssignee || undefined,
      dueDate: newTaskDueDate || undefined,
      projectId: activeProject.id
    });

    if (ok) {
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('Medium');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      setShowCreateTask(null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    const res = await inviteMember(activeProject.id, inviteEmail);
    if (res.success) {
      setInviteEmail('');
      setShowInviteModal(false);
    } else {
      toast.error(res.error || 'Failed connection to workspace.');
    }
    setInviting(false);
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjName || !editProjDesc) return;
    setEditingProject(true);
    const ok = await updateProject(activeProject.id, editProjName, editProjDesc);
    if (ok) {
      setShowEditProjModal(false);
    }
    setEditingProject(false);
  };

  const handleProcessRequest = async (requestId: string, decision: 'accepted' | 'declined') => {
    setProcessingRequestId(requestId);
    const res = await processJoinRequest(activeProject.id, requestId, decision);
    if (res.success) {
      toast.success(`Request successfully ${decision}!`);
      const remainingPending = (activeProject.joinRequests || []).filter(r => r.status === 'pending' && r.id !== requestId);
      if (remainingPending.length === 0) {
        setShowRequestsModal(false);
      }
    } else {
      toast.error(res.error || 'Failed processing request.');
    }
    setProcessingRequestId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden select-none">
      
      {/* 1. Kanban Board Header bar (Membership Invite & Configurations) */}
      <div className="bg-[#0a1128]/20 border-b border-white/10 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shrink-0">
        <div className="space-y-1.5 flex flex-col items-start text-left">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{activeProject.name} Workspace</h2>
            {activeProject.owner === user?.id && (
              <button
                onClick={() => {
                  setEditProjName(activeProject.name);
                  setEditProjDesc(activeProject.description);
                  setShowEditProjModal(true);
                }}
                className="text-slate-450 hover:text-indigo-400 p-1 hover:bg-white/5 rounded transition-colors cursor-pointer"
                title="Edit Project parameters"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10.5px] text-slate-450 max-w-xl leading-relaxed truncate">
            {activeProject.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          
          {/* Members bubble streams */}
          <div className="flex items-center gap-1 bg-slate-950/40 border border-white/10 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shrink-0 max-w-[200px]">
            <Users className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
            <div className="flex -space-x-1.5">
              <img
                src={activeProject.ownerUser?.profilePicture}
                alt={activeProject.ownerUser?.name || 'Owner'}
                title={`${activeProject.ownerUser?.name} (Owner)`}
                className="h-5 w-5 rounded-full ring-2 ring-[#0a1128] object-cover bg-slate-800"
              />
              {((activeProject as any).membersUsers || []).slice(0, 3).map((m: any) => (
                <img
                  key={m.id}
                  src={m.profilePicture}
                  alt={m.name}
                  title={m.name}
                  className="h-5 w-5 rounded-full ring-2 ring-[#0a1128] object-cover bg-slate-800"
                />
              ))}
            </div>
            {((activeProject as any).membersUsers || []).length > 3 && (
              <span className="text-[9px] font-bold text-slate-450 ml-1">
                +{((activeProject as any).membersUsers).length - 3}
              </span>
            )}
          </div>

          {/* Pending Application Requests for Owner */}
          {activeProject.owner === user?.id && pendingRequests.length > 0 && (
            <button
              onClick={() => setShowRequestsModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 px-3 py-1.5 border border-amber-500/20 hover:border-amber-500 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer animate-pulse"
              title={`${pendingRequests.length} candidate join request(s) awaiting approval`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Requests ({pendingRequests.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs hover:shadow-indigo-500/10 hover:shadow-md transition-all shrink-0 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Collaborator</span>
          </button>
        </div>
      </div>

      {/* Workspace live summary statistics bar */}
      <div className="bg-[#0a1128]/10 border-b border-white/5 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0 text-slate-450 text-xs">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Milestones:</span>
            <span className="text-slate-200 font-bold font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{tasks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Active:</span>
            <span className="text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">
              {tasks.filter(t => t.status === 'In Progress').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Review:</span>
            <span className="text-amber-400 font-bold font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/15">
              {tasks.filter(t => t.status === 'Review').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Completed:</span>
            <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/15">
              {tasks.filter(t => t.status === 'Completed').length}
            </span>
          </div>
        </div>

        {/* Dynamic progress bar indicators */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider shrink-0">Progress:</span>
          <div className="h-2 w-32 bg-slate-950/60 rounded-full overflow-hidden shrink-0 relative border border-white/5">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-300 shadow-sm shadow-emerald-400/30"
              style={{ width: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-400">
            {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* 2. Primary 4-Columns Container */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 bg-transparent select-none pb-24">
        {columns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = activeOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDropColumn(e, col.id)}
              className={`w-72 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-full shrink-0 transition-all ${
                isOver ? 'ring-2 ring-indigo-500/30 border-indigo-500/25 bg-white/10' : ''
              }`}
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </span>
                  <span className="text-slate-500 text-[10px] font-bold font-mono">
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateTask(col.id)}
                  className="text-slate-500 hover:text-indigo-400 p-1 hover:bg-white/5 rounded transition-all cursor-pointer"
                  title="Add Task to column"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Task Items Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[160px]">
                {columnTasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-6 border border-dashed border-white/10 rounded-xl bg-white/1">
                    <span className="text-[10px] text-slate-650 text-center uppercase tracking-wider font-semibold">Drop zone empty</span>
                  </div>
                ) : (
                  columnTasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onOpenDetails={(task) => setShowTaskDetails(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. POPUPS & WORKSPACE MODALS */}

      {/* TASK DETAILS VIEW MODAL */}
      {showTaskDetails && (
        <TaskDetailsModal
          task={showTaskDetails}
          onClose={() => setShowTaskDetails(null)}
        />
      )}

      {/* CREATE NEW TASK MODAL */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-lg border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-400" />
                <span>Publish Milestone: {showCreateTask}</span>
              </span>
              <button
                onClick={() => setShowCreateTask(null)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Milestone Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth Flow"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Milestone Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Add details, expected outcomes, requirements..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Urgency Level</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-950/60 border border-white/10 text-xs rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 text-xs rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    <option value={activeProject.owner}>
                      Owner ({activeProject.ownerUser?.name || 'Admin'})
                    </option>
                    {((activeProject as any).membersUsers || []).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-755 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-xl text-xs hover:shadow-indigo-500/15 hover:shadow-md transition-all cursor-pointer"
                >
                  Publish Task
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* INVITE NEW MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-lg border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-400" />
                <span>Invite Workspace Collaborator</span>
              </span>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-5 space-y-4 text-left">
              <div className="bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10 text-[10.5px] text-indigo-300 leading-relaxed flex items-start gap-2">
                <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Invited team members must already possess a registered Sphere account associated with this email address to establish collaboration.</span>
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Collaborator Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-xl text-xs hover:shadow-indigo-500/10 hover:shadow-md transition-all cursor-pointer"
                >
                  {inviting ? 'Inviting...' : 'Invite Collaborator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT DETAILS MODAL */}
      {showEditProjModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-lg border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-indigo-400" />
                <span>Configure Project Parameters</span>
              </span>
              <button
                onClick={() => setShowEditProjModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditProjectSubmit} className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo SaaS Platform"
                  value={editProjName}
                  onChange={e => setEditProjName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Detailed Mandate / Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter objectives, requirements, milestones..."
                  value={editProjDesc}
                  onChange={e => setEditProjDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-xs text-slate-100 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProjModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingProject}
                  className="flex-1 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {editingProject ? 'Saving...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN REQUESTS REVIEW MODAL */}
      {showRequestsModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between col-span-1 border-white/10">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold">
                <Users className="h-5 w-5" />
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Candidate Join Requests ({pendingRequests.length})</span>
              </div>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="text-slate-450 hover:text-slate-200 p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 max-h-[350px] overflow-y-auto space-y-4">
              {pendingRequests.map((req: any) => {
                const requester = req.user || { name: 'Unknown User', email: 'No email', role: 'Collaborator', profilePicture: `https://api.dicebear.com/7.x/initials/svg?seed=Candidate` };
                return (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-950/60 border border-white/5 rounded-xl flex flex-col gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={requester.profilePicture}
                        alt={requester.name}
                        className="h-9 w-9 rounded-xl object-cover ring-2 ring-indigo-500/20 bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 font-sans">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{requester.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{requester.email} • {requester.role}</p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {req.message && (
                      <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 font-sans">
                        <p className="text-xs italic text-slate-400 leading-relaxed font-sans">
                          "{req.message}"
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2.5 pt-1 justify-end font-sans">
                      <button
                        onClick={() => handleProcessRequest(req.id, 'declined')}
                        disabled={processingRequestId !== null}
                        className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-600 hover:text-slate-950 text-rose-450 font-bold rounded-xl text-xs border border-rose-500/20 hover:border-rose-600 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleProcessRequest(req.id, 'accepted')}
                        disabled={processingRequestId !== null}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {processingRequestId === req.id ? 'Admitting...' : 'Approve & Admit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
