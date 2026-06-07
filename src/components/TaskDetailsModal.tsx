import React, { useState, useEffect, useRef } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Task, Comment, Subtask } from '../types';
import { X, Send, Calendar, Clock, AlertCircle, Trash2, UserPlus, FileText, CheckSquare2, Square, ListTodo, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose }) => {
  const { activeProject, updateTask, deleteTask, addComment, loadCommentsForTask } = useProjects();
  const { user } = useAuth();

  // Task inline editing state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || '');
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.substring(0, 10) : '');

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Implement subtasks helpers
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const items = [
      ...subtasks,
      {
        id: 'sub_' + Math.random().toString(36).substring(2, 9),
        title: newSubtaskTitle.trim(),
        isCompleted: false
      }
    ];
    setSubtasks(items);
    setNewSubtaskTitle('');
    handleFieldChange({ subtasks: items });
    toast.success('Subtask added');
  };

  const handleToggleSubtask = (subId: string) => {
    const items = subtasks.map(item =>
      item.id === subId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setSubtasks(items);
    handleFieldChange({ subtasks: items });
  };

  const handleDeleteSubtask = (subId: string) => {
    const items = subtasks.filter(item => item.id !== subId);
    setSubtasks(items);
    handleFieldChange({ subtasks: items });
    toast.success('Subtask removed');
  };

  // Initialize and load comments
  useEffect(() => {
    let active = true;
    
    // Load existing comments
    loadCommentsForTask(task.id).then(res => {
      if (active) {
        setComments(res);
        setLoadingComments(false);
      }
    });

    // Handle real-time socket updates for comments in sync
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_project', task.projectId);
    });

    socket.on('comment_added', (data: { comment: Comment }) => {
      if (active && data.comment.taskId === task.id) {
        setComments(prev => {
          // Avoid duplicate comments
          if (prev.some(c => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
      }
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [task.id]);

  // Handle task property saves
  const handleFieldChange = async (fields: Partial<Task>) => {
    await updateTask(task.id, fields);
  };

  // Create new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const added = await addComment(task.id, newComment);
    if (added) {
      setNewComment('');
      setComments(prev => {
        if (prev.some(c => c.id === added.id)) return prev;
        return [...prev, added];
      });
    } else {
      toast.error('Could not submit comment.');
    }
    setSubmittingComment(false);
  };

  const handleDeleteTask = async () => {
    if (confirm(`Are you sure you want to permanently delete task "${task.title}"?`)) {
      await deleteTask(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1128]/95 backdrop-blur-lg border border-white/10 w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Side: Task Specifications & Parameters */}
        <div className="flex-1 p-6 md:p-7 overflow-y-auto border-r border-white/10 space-y-6 text-left selection-none">
          <div className="flex justify-between items-start gap-4">
            <span className="bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 text-indigo-400 font-bold text-[10px] uppercase px-3 py-1.5 rounded-xl tracking-wider border border-white/10">
              Sphere Milestone Tracker
            </span>
            <button
              onClick={handleDeleteTask}
              className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Interactive Title details */}
          <div className="space-y-1.5">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => handleFieldChange({ title })}
              placeholder="Milestone Title"
              className="w-full bg-transparent border-0 border-b border-transparent hover:border-white/10 focus:border-indigo-400 p-1 text-base font-extrabold text-slate-100 placeholder-slate-600 focus:ring-0 focus:outline-none transition-all"
            />
          </div>

          {/* Core Select grids */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Status Selector */}
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Operational Status</label>
              <select
                value={status}
                onChange={e => {
                  setStatus(e.target.value as any);
                  handleFieldChange({ status: e.target.value as any });
                }}
                className="w-full bg-slate-950/60 border border-white/10 text-xs rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-400 cursor-pointer text-slate-200 font-medium"
              >
                <option value="To Do">🔘 To Do</option>
                <option value="In Progress">🟡 In Progress</option>
                <option value="Review">🟠 Review</option>
                <option value="Completed">🟢 Completed</option>
              </select>
            </div>
                    {/* Priority Selector */}
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Urgency Priority</label>
              <select
                value={priority}
                onChange={e => {
                  setPriority(e.target.value as any);
                  handleFieldChange({ priority: e.target.value as any });
                }}
                className="w-full bg-slate-950/60 border border-white/10 text-xs rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-400 cursor-pointer text-slate-200 font-medium"
              >
                <option value="Low">Low Urgency</option>
                <option value="Medium">Medium Urgency</option>
                <option value="High">High Urgency</option>
              </select>
            </div>

            {/* Assignee Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Assigned Owner</label>
              <select
                value={assignedTo}
                onChange={e => {
                  setAssignedTo(e.target.value);
                  handleFieldChange({ assignedTo: e.target.value || undefined });
                }}
                className="w-full bg-slate-950/60 border border-white/10 text-xs rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-400 cursor-pointer text-slate-200 font-medium"
              >
                <option value="">Unassigned</option>
                {activeProject && (
                  <option value={activeProject.owner}>
                    Owner ({activeProject.ownerUser?.name || 'Admin'})
                  </option>
                )}
                {activeProject && ((activeProject as any).membersUsers || []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date Calendar picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Target Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  handleFieldChange({ dueDate: e.target.value });
                }}
                className="w-full bg-slate-950/60 border border-white/10 text-xs rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-400 cursor-pointer"
              />
            </div>

          </div>

          {/* Description Block */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>Technical Mandate Description</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => handleFieldChange({ description })}
              rows={4}
              placeholder="Provide architectural requirements, tasks breakdown, APIs specifications, mock payload parameters..."
              className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-655 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none leading-relaxed"
            />
          </div>

          {/* Subtasks Checklist Block */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <ListTodo className="h-3.5 w-3.5 text-slate-500" />
                <span>Checklist & Breakdowns</span>
              </label>
              {subtasks.length > 0 && (
                <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-400/5 px-2 py-0.5 rounded border border-indigo-500/10">
                  {subtasks.filter(s => s.isCompleted).length} / {subtasks.length} Done ({Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100)}%)
                </span>
              )}
            </div>

            {/* Subtasks Progress Bar Indicator */}
            {subtasks.length > 0 && (
              <div className="h-1.5 w-full bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300 shadow-sm shadow-indigo-400/40"
                  style={{ width: `${Math.round((subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100)}%` }}
                />
              </div>
            )}

            {/* Subtasks List */}
            {subtasks.length === 0 ? (
              <div className="p-3 text-center bg-slate-950/20 rounded-xl border border-dashed border-white/5">
                <span className="text-[10px] text-slate-500 leading-relaxed block font-mono">
                  No broken-down deliverables. Formulate one below to align precise goals!
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {subtasks.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 bg-slate-950/40 hover:bg-slate-950/60 border border-white/5 rounded-xl transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(item.id)}
                      className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                    >
                      {item.isCompleted ? (
                        <CheckSquare2 className="h-4 w-4 text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-500 hover:text-indigo-400 shrink-0" />
                      )}
                      <span className={`text-xs ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {item.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-650 hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Subtask Add Bar */}
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Break down next item..."
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                className="flex-1 bg-slate-100/5 hover:bg-slate-100/10 focus:bg-slate-950/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-450"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-slate-950 disabled:opacity-30 text-indigo-400 font-bold border border-indigo-500/15 hover:border-indigo-500 rounded-xl transition-all cursor-pointer shrink-0 text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Segment Thread & Collaborative Comments */}
        <div className="w-full md:w-[320px] bg-[#0a1128]/45 p-6 flex flex-col h-full border-t border-white/10 md:border-t-0 text-left selection-none relative">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
            <span className="text-xs font-bold text-slate-200">Activity & Comments</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Comments Scroller */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 min-h-[160px]">
            {loadingComments ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Spinner className="h-5 w-5 text-indigo-400" />
                <span className="text-[10px] text-slate-500 font-mono">Syncing comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 px-4">
                <span className="text-[11px] text-slate-500 leading-relaxed block font-mono text-center">
                  Collaborative thread is empty. Leave a question or milestone update below to sync team!
                </span>
              </div>
            ) : (
              comments.map(c => {
                const isMe = c.userId === user?.id;
                return (
                  <div key={c.id} className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400">{c.user?.name || 'Team member'}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe ? 'bg-indigo-500/10 border border-indigo-500/10 text-indigo-100' : 'bg-slate-950/60 border border-white/5 text-slate-300 font-sans'
                    }`}>
                      {c.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New Comment Submission Input Form */}
          <form onSubmit={handleAddComment} className="pt-4 border-t border-white/10 mt-4 shrink-0 flex items-center gap-2">
            <input
              type="text"
              placeholder="Leave a comment..."
              required
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-455"
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="p-2.5 bg-indigo-500 disabled:opacity-50 hover:bg-indigo-400 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};

// Simple visual spinner component
const Spinner = ({ className = '' }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
