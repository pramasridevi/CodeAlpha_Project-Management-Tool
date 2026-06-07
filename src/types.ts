/**
 * Shared Type Definitions for Project Management Tool
 */

export interface User {
  id: string;
  _id?: string; // MongoDB compatibility
  name: string;
  email: string;
  profilePicture?: string;
  role: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  user?: User; // hydrated user info
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  description: string;
  owner: string; // User ID
  members: string[]; // User IDs
  createdAt: string;
  joinRequests?: JoinRequest[];
}

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  _id?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string; // User ID
  dueDate?: string;
  projectId: string;
  createdAt: string;
  subtasks?: Subtask[];
}

export interface Comment {
  id: string;
  _id?: string;
  taskId: string;
  userId: string;
  user?: User; // Dynamically populated
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  _id?: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface RecentActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: 'project' | 'task' | 'comment';
  targetName: string;
  projectId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  user?: User;
  message: string;
  createdAt: string;
}

