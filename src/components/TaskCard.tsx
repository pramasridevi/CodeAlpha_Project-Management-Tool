import React from 'react';
import { Task } from '../types';
import { useProjects } from '../context/ProjectContext';
import { Calendar, User, Clock, MessageSquare, AlertCircle, ListTodo } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onOpenDetails: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onOpenDetails }) => {
  const { activeProject } = useProjects();

  // Find assignee name
  let assigneeName = 'Unassigned';
  let assigneePic = '';
  
  if (task.assignedTo === activeProject?.owner) {
    assigneeName = activeProject?.ownerUser?.name || 'Owner';
    assigneePic = activeProject?.ownerUser?.profilePicture || '';
  } else if (activeProject && (activeProject as any).membersUsers) {
    const found = ((activeProject as any).membersUsers || []).find((m: any) => m.id === task.assignedTo);
    if (found) {
      assigneeName = found.name;
      assigneePic = found.profilePicture;
    }
  }

  // Priority layout settings
  const priorityStyles = {
    Low: { bg: 'bg-slate-800/30', text: 'text-slate-400', border: 'border-white/5' },
    Medium: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/15' },
    High: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/25' }
  };

  const prioritySelected = priorityStyles[task.priority] || priorityStyles.Medium;

  // Drag handles
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Aesthetic: give dragging style effect
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onOpenDetails(task)}
      className="bg-white/5 backdrop-blur-sm border border-white/10 hover:border-indigo-500/30 p-4 rounded-2xl shadow-sm hover:shadow-indigo-500/5 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-[1.5px] select-none text-left space-y-3"
    >
      
      {/* Header labels */}
      <div className="flex justify-between items-center">
        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${prioritySelected.bg} ${prioritySelected.text} border ${prioritySelected.border}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
            <Clock className="h-3 w-3 text-slate-500" />
            <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>

      {/* Main Core info */}
      <div className="space-y-1.5">
        <h5 className="text-xs font-bold text-slate-100 tracking-tight leading-snug line-clamp-2">
          {task.title}
        </h5>
        <p className="text-[10.5px] text-slate-450 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      </div>

      {/* Footer statistics */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1.5 text-[9px] font-medium">
        
        {/* Assignee pill */}
        <div className="flex items-center gap-1.5 max-w-[130px]">
          {assigneePic ? (
            <img
              src={assigneePic}
              alt={assigneeName}
              referrerPolicy="no-referrer"
              className="h-4.5 w-4.5 rounded-full object-cover bg-slate-850"
            />
          ) : (
            <div className="h-4.5 w-4.5 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <User className="h-2.5 w-2.5 text-slate-400" />
            </div>
          )}
          <span className="text-slate-400 truncate max-w-[100px]">{assigneeName}</span>
        </div>

        {/* Subtasks checklist ratio indicator */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10" title="Checklist progress">
            <ListTodo className="h-3 w-3 text-indigo-400" />
            <span>
              {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
            </span>
          </div>
        )}

        {/* View Details triggers */}
        <span className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300">
          Details &rarr;
        </span>

      </div>

    </div>
  );
};
