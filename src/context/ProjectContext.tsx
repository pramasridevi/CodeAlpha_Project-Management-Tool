import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Project, Task, Notification, RecentActivity, Comment, ChatMessage } from '../types';
import toast from 'react-hot-toast';

interface ProjectContextType {
  projects: Project[];
  discoverableProjects: Project[];
  activeProject: Project | null;
  tasks: Task[];
  notifications: Notification[];
  onlineUsers: string[];
  recentActivities: RecentActivity[];
  chatMessages: ChatMessage[];
  dashboardStats: any;
  loading: boolean;
  dashboardLoading: boolean;

  // Projects API
  loadProjects: () => Promise<void>;
  loadDiscoverableProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  createProject: (name: string, description: string) => Promise<boolean>;
  updateProject: (id: string, name: string, description: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  inviteMember: (projectId: string, email: string) => Promise<{ success: boolean; error?: string }>;
  submitJoinRequest: (projectId: string, message: string) => Promise<{ success: boolean; error?: string }>;
  processJoinRequest: (projectId: string, requestId: string, decision: 'accepted' | 'declined') => Promise<{ success: boolean; error?: string }>;

  // Tasks API
  loadTasks: (projectId: string) => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<boolean>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;

  // Comments
  addComment: (taskId: string, message: string) => Promise<Comment | null>;
  loadCommentsForTask: (taskId: string) => Promise<Comment[]>;

  // Notifications
  loadNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  // Dashboard
  loadDashboardStats: () => Promise<void>;

  // Chat
  sendChatMessage: (message: string) => Promise<boolean>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, getAuthHeaders } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [discoverableProjects, setDiscoverableProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // 1. Manage Socket Connection
  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect socket
    const socketUrl = window.location.origin;
    console.log('[Socket] Connecting to', socketUrl);
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket] Registered connection to server stream.');
      newSocket.emit('join_user', user.id);
    });

    // Real-time Event listeners
    newSocket.on('online_users', (usersList: string[]) => {
      setOnlineUsers(usersList);
    });

    newSocket.on('new_notification', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      toast(notif.message, {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#1e293b',
          color: '#fff',
        }
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  // 2. Subscribe/Unsubscribe to Active Project Room
  useEffect(() => {
    if (!socket || !activeProject) return;

    const projectId = activeProject.id;
    socket.emit('join_project', projectId);

    const handleTaskCreated = (data: { task: Task }) => {
      setTasks(prev => {
        if (prev.some(t => t.id === data.task.id)) return prev; // Avoid duplicate races
        return [...prev, data.task];
      });
    };

    const handleTaskUpdated = (data: { task: Task }) => {
      setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
    };

    const handleTaskDeleted = (data: { id: string }) => {
      setTasks(prev => prev.filter(t => t.id !== data.id));
    };

    const handleActivityLogged = (act: RecentActivity) => {
      setRecentActivities(prev => [act, ...prev].slice(0, 50));
    };

    const handleProjectUpdated = (proj: Project) => {
      setProjects(prev => prev.map(p => p.id === proj.id ? proj : p));
      if (activeProject && activeProject.id === proj.id) {
        setActiveProject(prev => prev ? { ...prev, ...proj } : null);
      }
    };

    const handleProjectDeleted = (data: { id: string; name: string }) => {
      setProjects(prev => prev.filter(p => p.id !== data.id));
      if (activeProject && activeProject.id === data.id) {
        setActiveProject(null);
        toast.error(`The current project "${data.name}" was deleted by its owner.`);
      }
    };

    const handleMemberJoined = (data: { projectId: string; member: any }) => {
      if (activeProject && activeProject.id === data.projectId) {
        setActiveProject(prev => {
          if (!prev) return null;
          const membersUsers = [...(prev as any).membersUsers || []];
          if (membersUsers.some(m => m.id === data.member.id)) return prev;
          return {
            ...prev,
            members: [...prev.members, data.member.id],
            membersUsers: [...membersUsers, data.member]
          } as any;
        });
      }
    };

    const handleNewChatMessage = (msg: ChatMessage) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('activity_logged', handleActivityLogged);
    socket.on('project_updated', handleProjectUpdated);
    socket.on('project_deleted', handleProjectDeleted);
    socket.on('member_joined', handleMemberJoined);
    socket.on('new_chat_message', handleNewChatMessage);

    return () => {
      socket.emit('leave_project', projectId);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('activity_logged', handleActivityLogged);
      socket.off('project_updated', handleProjectUpdated);
      socket.off('project_deleted', handleProjectDeleted);
      socket.off('member_joined', handleMemberJoined);
      socket.off('new_chat_message', handleNewChatMessage);
    };
  }, [socket, activeProject]);

  // Loading initial user profile data on mount
  useEffect(() => {
    if (user) {
      loadProjects();
      loadDiscoverableProjects();
      loadNotifications();
    } else {
      setProjects([]);
      setDiscoverableProjects([]);
      setActiveProject(null);
      setTasks([]);
      setNotifications([]);
      setChatMessages([]);
    }
  }, [user]);

  // PROJECTS API IMPL
  const loadProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects dashboard:', err);
    }
  };

  const loadDiscoverableProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/projects/discoverable', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDiscoverableProjects(data);
      }
    } catch (err) {
      console.error('Error fetching discoverable projects:', err);
    }
  };

  const submitJoinRequest = async (projectId: string, message: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/projects/${projectId}/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        await loadDiscoverableProjects();
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || 'Failed to submit join request' };
      }
    } catch (err: any) {
      console.error('Error in submitJoinRequest:', err);
      return { success: false, error: 'Internal connection error' };
    }
  };

  const processJoinRequest = async (projectId: string, requestId: string, decision: 'accepted' | 'declined'): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/projects/${projectId}/join-request/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ decision })
      });
      if (res.ok) {
        const data = await res.json();
        if (activeProject && activeProject.id === projectId) {
          setActiveProject(data.project);
        }
        await loadProjects();
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || 'Failed to process request' };
      }
    } catch (err: any) {
      console.error('Error in processJoinRequest:', err);
      return { success: false, error: 'Internal connection error' };
    }
  };

  const selectProject = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setActiveProject(data);
        await Promise.all([
          loadTasks(projectId),
          loadChatMessages(projectId)
        ]);
      } else {
        toast.error('Failure opening project.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (projectId: string) => {
    try {
      const res = await fetch(`/api/chat?projectId=${projectId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!activeProject) return false;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ projectId: activeProject.id, message })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error posting chat message:', err);
      return false;
    }
  };

  const createProject = async (name: string, description: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, description })
      });

      if (res.ok) {
        const data = await res.json();
        setProjects(prev => [...prev, data]);
        // Set active immediately
        await selectProject(data.id);
        toast.success(`Project "${name}" launched!`);
        return true;
      }
      return false;
    } catch (err) {
      toast.error('Could not spawn project.');
      return false;
    }
  };

  const updateProject = async (id: string, name: string, description: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, description })
      });

      if (res.ok) {
        const data = await res.json();
        setProjects(prev => prev.map(p => p.id === id ? data : p));
        if (activeProject && activeProject.id === id) {
          setActiveProject(prev => prev ? { ...prev, ...data } : null);
        }
        toast.success('Workspace updated successfully.');
        return true;
      }
      return false;
    } catch (err) {
      toast.error('Exception updating workspace.');
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProject && activeProject.id === id) {
          setActiveProject(null);
          setTasks([]);
        }
        toast.success('Project workspace deleted.');
        return true;
      }
      return false;
    } catch (err) {
      toast.error('Fault deleting project workspace.');
      return false;
    }
  };

  const inviteMember = async (projectId: string, email: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: 'Connection failure' };
    }
  };

  // TASKS API IMPL
  const loadTasks = async (projectId: string) => {
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(taskData)
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => {
          if (prev.some(t => t.id === data.id)) return prev;
          return [...prev, data];
        });
        toast.success(`Task "${taskData.title}" created!`);
        return true;
      }
      return false;
    } catch (err) {
      toast.error('Error creating task.');
      return false;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic Update
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } as Task : t));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        // Rollback on rejection
        setTasks(originalTasks);
        const errObj = await res.json();
        toast.error(errObj.error || 'Failed task update.');
        return false;
      }
      return true;
    } catch (err) {
      setTasks(originalTasks);
      toast.error('Server sync failure. Rolled back.');
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        toast.success('Task permanently removed.');
        return true;
      }
      return false;
    } catch (err) {
      toast.error('Failure removing task.');
      return false;
    }
  };

  // COMMENTS SYSTEM APIS
  const addComment = async (taskId: string, message: string): Promise<Comment | null> => {
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ taskId, message })
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const loadCommentsForTask = async (taskId: string): Promise<Comment[]> => {
    try {
      const res = await fetch(`/api/comments?taskId=${taskId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // NOTIFICATION SYSTEM APIS
  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('Notifications cleared.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // DASHBOARD STATS FETCH
  const loadDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
        setRecentActivities(data.recentActivities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDashboardLoading(false);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      discoverableProjects,
      activeProject,
      tasks,
      notifications,
      onlineUsers,
      recentActivities,
      chatMessages,
      dashboardStats,
      loading,
      dashboardLoading,
      loadProjects,
      loadDiscoverableProjects,
      selectProject,
      createProject,
      updateProject,
      deleteProject,
      inviteMember,
      submitJoinRequest,
      processJoinRequest,
      loadTasks,
      createTask,
      updateTask,
      deleteTask,
      addComment,
      loadCommentsForTask,
      loadNotifications,
      markAllNotificationsRead,
      markNotificationRead,
      loadDashboardStats,
      sendChatMessage
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be inside static ProjectProvider');
  }
  return context;
};
