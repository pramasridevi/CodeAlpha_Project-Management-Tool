import fs from 'fs';
import path from 'path';
import { User, Project, Task, Comment, Notification, RecentActivity, ChatMessage } from '../src/types';

const STORE_PATH = path.join(process.cwd(), 'data_db.json');

// Interface for our database structure
interface DatabaseStructure {
  users: User[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  notifications: Notification[];
  activities: RecentActivity[];
  chatMessages: ChatMessage[];
}

const INITIAL_DB: DatabaseStructure = {
  users: [],
  projects: [],
  tasks: [],
  comments: [],
  notifications: [],
  activities: [],
  chatMessages: []
};

// Lowdb-like simple implementation for thread-safe JSON-based storage
class LocalDatabase {
  private data: DatabaseStructure = { ...INITIAL_DB };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const fileContent = fs.readFileSync(STORE_PATH, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure defaults if any array is missing
        this.data.users = this.data.users || [];
        this.data.projects = this.data.projects || [];
        this.data.tasks = this.data.tasks || [];
        this.data.comments = this.data.comments || [];
        this.data.notifications = this.data.notifications || [];
        this.data.activities = this.data.activities || [];
        this.data.chatMessages = this.data.chatMessages || [];
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Error loading database file, initializing empty', error);
      this.data = { ...INITIAL_DB };
    }
  }

  private save() {
    try {
      // Create folder if it doesn't exist
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing to database file', error);
    }
  }

  // --- USERS ---
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: Omit<User, 'id'> & { passwordHash: string }): User & { passwordHash: string } {
    const id = 'usr_' + Math.random().toString(36).substr(2, 9);
    const newUser = { id, ...user };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'email'>>): User | undefined {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) return undefined;

    const updatedUser = {
      ...this.data.users[userIndex],
      ...updates
    };
    this.data.users[userIndex] = updatedUser as any;
    this.save();
    return updatedUser as any;
  }

  // --- PROJECTS ---
  getProjects(): Project[] {
    return this.data.projects;
  }

  getProjectById(id: string): Project | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  getProjectsForUser(userId: string): Project[] {
    return this.data.projects.filter(p => p.owner === userId || p.members.includes(userId));
  }

  createProject(project: Omit<Project, 'id' | 'createdAt'>): Project {
    const id = 'prj_' + Math.random().toString(36).substr(2, 9);
    const newProject = {
      id,
      ...project,
      createdAt: new Date().toISOString()
    };
    this.data.projects.push(newProject);
    this.save();
    return newProject;
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'owner' | 'createdAt'>>): Project | undefined {
    const projectIndex = this.data.projects.findIndex(p => p.id === id);
    if (projectIndex === -1) return undefined;

    const updatedProject = {
      ...this.data.projects[projectIndex],
      ...updates
    };
    this.data.projects[projectIndex] = updatedProject;
    this.save();
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    const originalLen = this.data.projects.length;
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    
    // Cascading delete: clean up associated tasks/comments
    const tasksToDelete = this.data.tasks.filter(t => t.projectId === id).map(t => t.id);
    this.data.tasks = this.data.tasks.filter(t => t.projectId !== id);
    this.data.comments = this.data.comments.filter(c => !tasksToDelete.includes(c.taskId));
    
    this.save();
    return this.data.projects.length !== originalLen;
  }

  inviteMemberToProject(projectId: string, email: string): { success: boolean; message: string; member?: User } {
    const project = this.getProjectById(projectId);
    if (!project) return { success: false, message: 'Project not found' };

    const member = this.getUserByEmail(email);
    if (!member) {
      return { success: false, message: `User with email ${email} not registered` };
    }

    if (project.owner === member.id) {
      return { success: false, message: 'User is the owner of this project' };
    }

    if (project.members.includes(member.id)) {
      return { success: false, message: 'User is already a member of this project' };
    }

    project.members.push(member.id);
    this.save();
    return { success: true, message: 'Member added successfully', member };
  }

  // --- JOIN REQUESTS & RECRUITMENT ---
  getDiscoverableProjects(userId: string): Project[] {
    return (this.data.projects || []).filter(p => p.owner !== userId && !p.members.includes(userId));
  }

  createJoinRequest(projectId: string, userId: string, message: string): { success: boolean; message: string; project?: Project } {
    const project = this.getProjectById(projectId);
    if (!project) return { success: false, message: 'Project not found' };

    if (project.owner === userId || project.members.includes(userId)) {
      return { success: false, message: 'You are already a member of this project' };
    }

    if (!project.joinRequests) {
      project.joinRequests = [];
    }

    const existingPending = project.joinRequests.find(r => r.userId === userId && r.status === 'pending');
    if (existingPending) {
      return { success: false, message: 'You already have a pending request for this project' };
    }

    const newRequest = {
      id: 'req_' + Math.random().toString(36).substr(2, 9),
      userId,
      message: message || '',
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    project.joinRequests.push(newRequest);
    this.save();
    return { success: true, message: 'Join request sent successfully', project };
  }

  handleJoinRequest(projectId: string, requestId: string, decision: 'accepted' | 'declined'): { success: boolean; message: string; project?: Project; requestUserId?: string } {
    const project = this.getProjectById(projectId);
    if (!project) return { success: false, message: 'Project not found' };

    if (!project.joinRequests) {
      project.joinRequests = [];
    }

    const requestIndex = project.joinRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
      return { success: false, message: 'Join request not found or already processed' };
    }

    const req = project.joinRequests[requestIndex];
    req.status = decision;

    if (decision === 'accepted') {
      if (!project.members.includes(req.userId)) {
        project.members.push(req.userId);
      }
    }

    this.save();
    return { success: true, message: `Request successfully ${decision}`, project, requestUserId: req.userId };
  }

  // --- TASKS ---
  getTasks(): Task[] {
    return this.data.tasks;
  }

  getTaskById(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  getTasksByProject(projectId: string): Task[] {
    return this.data.tasks.filter(t => t.projectId === projectId);
  }

  createTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const id = 'tsk_' + Math.random().toString(36).substr(2, 9);
    const newTask: Task = {
      id,
      ...task,
      createdAt: new Date().toISOString()
    };
    this.data.tasks.push(newTask);
    this.save();
    return newTask;
  }

  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>): Task | undefined {
    const taskIndex = this.data.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return undefined;

    const updatedTask = {
      ...this.data.tasks[taskIndex],
      ...updates
    };
    this.data.tasks[taskIndex] = updatedTask;
    this.save();
    return updatedTask;
  }

  deleteTask(id: string): boolean {
    const originalLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.data.comments = this.data.comments.filter(c => c.taskId !== id);
    this.save();
    return this.data.tasks.length !== originalLen;
  }

  // --- COMMENTS ---
  getCommentsForTask(taskId: string): Comment[] {
    return this.data.comments
      .filter(c => c.taskId === taskId)
      .map(c => {
        const user = this.getUserById(c.userId);
        return {
          ...c,
          user: user ? { id: user.id, name: user.name, email: user.email, profilePicture: user.profilePicture, role: user.role } : undefined
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Comment {
    const id = 'cmt_' + Math.random().toString(36).substr(2, 9);
    const newComment: Comment = {
      id,
      ...comment,
      createdAt: new Date().toISOString()
    };
    this.data.comments.push(newComment);
    this.save();
    return newComment;
  }

  // --- NOTIFICATIONS ---
  getNotificationsForUser(userId: string): Notification[] {
    return this.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createNotification(userId: string, message: string): Notification {
    const id = 'ntf_' + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      userId,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.push(newNotification);
    this.save();
    return newNotification;
  }

  markAllNotificationsRead(userId: string): void {
    this.data.notifications = this.data.notifications.map(n => {
      if (n.userId === userId) {
        return { ...n, isRead: true };
      }
      return n;
    });
    this.save();
  }

  markNotificationRead(id: string): void {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.save();
    }
  }

  // --- RECENT ACTIVITIES ---
  getRecentActivities(userId: string): RecentActivity[] {
    // Get activities for projects the user belongs to
    const userProjectIds = this.getProjectsForUser(userId).map(p => p.id);
    return this.data.activities
      .filter(act => userProjectIds.includes(act.projectId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
  }

  createActivity(activity: Omit<RecentActivity, 'id' | 'createdAt'>): RecentActivity {
    const id = 'act_' + Math.random().toString(36).substr(2, 9);
    const newAct: RecentActivity = {
      id,
      ...activity,
      createdAt: new Date().toISOString()
    };
    this.data.activities.push(newAct);
    // Limit to running list of 1000 items
    if (this.data.activities.length > 1000) {
      this.data.activities.shift();
    }
    this.save();
    return newAct;
  }

  // --- CHAT MESSAGES ---
  getChatMessages(projectId: string): ChatMessage[] {
    return (this.data.chatMessages || [])
      .filter(m => m.projectId === projectId)
      .map(m => {
        const user = this.getUserById(m.userId);
        return {
          ...m,
          user: user ? { id: user.id, name: user.name, email: user.email, profilePicture: user.profilePicture, role: user.role } : undefined
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createChatMessage(chat: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const id = 'msg_' + Math.random().toString(36).substr(2, 9);
    const newMessage: ChatMessage = {
      id,
      ...chat,
      createdAt: new Date().toISOString()
    };
    
    if (!this.data.chatMessages) {
      this.data.chatMessages = [];
    }
    this.data.chatMessages.push(newMessage);

    // Limit chats to 200 items per project workspace
    const projectMsgs = this.data.chatMessages.filter(m => m.projectId === chat.projectId);
    if (projectMsgs.length > 200) {
      const toRemove = projectMsgs.length - 200;
      let removed = 0;
      this.data.chatMessages = this.data.chatMessages.filter(m => {
        if (m.projectId === chat.projectId && removed < toRemove) {
          removed++;
          return false;
        }
        return true;
      });
    }

    this.save();
    return newMessage;
  }
}

export const db = new LocalDatabase();
