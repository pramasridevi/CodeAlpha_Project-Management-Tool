import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { AuthenticatedRequest } from './middleware';
import { TaskStatus, TaskPriority } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pm_tool_key';

// Global Socket Broadcast Helper (set in server.ts)
export let socketRoomsManager: {
  broadcastToProject: (projectId: string, eventName: string, data: any) => void;
  broadcastToUser: (userId: string, eventName: string, data: any) => void;
} = {
  broadcastToProject: () => {},
  broadcastToUser: () => {}
};

export function setSocketRoomsManager(manager: typeof socketRoomsManager) {
  socketRoomsManager = manager;
}

// Helper to log recent activities
function logActivity(
  userId: string,
  userName: string,
  action: string,
  targetType: 'project' | 'task' | 'comment',
  targetName: string,
  projectId: string
) {
  const act = db.createActivity({
    userId,
    userName,
    action,
    targetType,
    targetName,
    projectId
  });
  
  // Real-time broadcast of activity
  socketRoomsManager.broadcastToProject(projectId, 'activity_logged', act);
  return act;
}

// AUTHENTICATION CONTROLLER
export const authController = {
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Please provide name, email, and password' });
        return;
      }

      // Check duplicate
      const existingUser = db.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      const newUser = db.createUser({
        name,
        email,
        passwordHash,
        profilePicture: defaultAvatar,
        role: role || 'Member'
      });

      // Token
      const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          profilePicture: newUser.profilePicture,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  },

  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Please provide email and password' });
        return;
      }

      const user = db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isMatch = await bcrypt.compare(password, (user as any).passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  },

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const user = db.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { name, profilePicture, role } = req.body;
      const updated = db.updateUser(req.user.id, { name, profilePicture, role });
      if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(200).json({
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          profilePicture: updated.profilePicture,
          role: updated.role
        }
      });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ error: 'Internal server error updating profile' });
    }
  }
};

// PROJECT CONTROLLER
export const projectController = {
  async createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      if (!name || !description) {
        res.status(400).json({ error: 'Name and description are required' });
        return;
      }

      const ownerId = req.user!.id;
      const newProj = db.createProject({
        name,
        description,
        owner: ownerId,
        members: []
      });

      logActivity(ownerId, req.user!.name, 'created project', 'project', name, newProj.id);

      res.status(201).json(newProj);
    } catch (error) {
      res.status(500).json({ error: 'Error creating project' });
    }
  },

  async getProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const projects = db.getProjectsForUser(req.user!.id);
      // Attach owner and member names/details
      const populatedProjects = projects.map(p => {
        const ownerInfo = db.getUserById(p.owner);
        const membersInfo = p.members.map(mid => db.getUserById(mid)).filter(Boolean);
        const joinRequestsPopulated = (p.joinRequests || []).map(r => {
          const u = db.getUserById(r.userId);
          return {
            ...r,
            user: u ? { id: u.id, name: u.name, email: u.email, profilePicture: u.profilePicture, role: u.role } : undefined
          };
        });
        return {
          ...p,
          ownerUser: ownerInfo ? { id: ownerInfo.id, name: ownerInfo.name, email: ownerInfo.email } : null,
          membersUsers: membersInfo.map(m => ({ id: m!.id, name: m!.name, email: m!.email })),
          joinRequests: joinRequestsPopulated
        };
      });
      res.status(200).json(populatedProjects);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching projects' });
    }
  },

  async getProjectDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const project = db.getProjectById(id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Auth validation
      if (project.owner !== req.user!.id && !project.members.includes(req.user!.id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const ownerInfo = db.getUserById(project.owner);
      const membersInfo = project.members.map(mid => db.getUserById(mid)).filter(Boolean);
      const joinRequestsPopulated = (project.joinRequests || []).map(r => {
        const u = db.getUserById(r.userId);
        return {
          ...r,
          user: u ? { id: u.id, name: u.name, email: u.email, profilePicture: u.profilePicture, role: u.role } : undefined
        };
      });

      res.status(200).json({
        ...project,
        ownerUser: ownerInfo ? { id: ownerInfo.id, name: ownerInfo.name, email: ownerInfo.email, profilePicture: ownerInfo.profilePicture } : null,
        membersUsers: membersInfo.map(m => ({ id: m!.id, name: m!.name, email: m!.email, profilePicture: m!.profilePicture })),
        joinRequests: joinRequestsPopulated
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching project details' });
    }
  },

  async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const project = db.getProjectById(id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.owner !== req.user!.id) {
        res.status(403).json({ error: 'Only owners can update projects' });
        return;
      }

      const updated = db.updateProject(id, { name, description });
      logActivity(req.user!.id, req.user!.name, 'updated project', 'project', name || project.name, id);
      
      // Notify other members
      socketRoomsManager.broadcastToProject(id, 'project_updated', updated);

      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Error updating project' });
    }
  },

  async deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const project = db.getProjectById(id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.owner !== req.user!.id) {
        res.status(403).json({ error: 'Only owners can delete projects' });
        return;
      }

      const projName = project.name;
      const members = [...project.members];
      
      const deleted = db.deleteProject(id);
      if (deleted) {
        logActivity(req.user!.id, req.user!.name, 'deleted project', 'project', projName, id);
        
        // Notify members of deleted project
        socketRoomsManager.broadcastToProject(id, 'project_deleted', { id, name: projName });
        
        // Also send notification directly
        members.forEach(mId => {
          const mNotif = db.createNotification(mId, `Project "${projName}" has been deleted by its owner.`);
          socketRoomsManager.broadcastToUser(mId, 'new_notification', mNotif);
        });

        res.status(200).json({ message: 'Project deleted successfully' });
      } else {
        res.status(400).json({ error: 'Could not delete project' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error deleting project' });
    }
  },

  async inviteMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const project = db.getProjectById(id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Check access
      if (project.owner !== req.user!.id && !project.members.includes(req.user!.id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = db.inviteMemberToProject(id, email);
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      const member = result.member!;
      logActivity(req.user!.id, req.user!.name, `invited ${member.name}`, 'project', project.name, id);
      
      // Create notification for invited member
      const notifMessage = `${req.user!.name} invited you to collaborate in project "${project.name}"`;
      const notif = db.createNotification(member.id, notifMessage);
      
      // Distribute real-time updates
      socketRoomsManager.broadcastToUser(member.id, 'new_notification', notif);
      socketRoomsManager.broadcastToProject(id, 'member_joined', {
        projectId: id,
        member: { id: member.id, name: member.name, email: member.email, profilePicture: member.profilePicture }
      });

      res.status(200).json({
        message: 'Member invited successfully',
        member: { id: member.id, name: member.name, email: member.email, profilePicture: member.profilePicture }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error inviting member' });
    }
  },

  async getDiscoverableProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const projects = db.getDiscoverableProjects(req.user!.id);
      const populated = projects.map(p => {
        const ownerInfo = db.getUserById(p.owner);
        const joinRequestsPopulated = (p.joinRequests || []).map(r => {
          const u = db.getUserById(r.userId);
          return {
            ...r,
            user: u ? { id: u.id, name: u.name, email: u.email, profilePicture: u.profilePicture, role: u.role } : undefined
          };
        });
        return {
          ...p,
          ownerUser: ownerInfo ? { id: ownerInfo.id, name: ownerInfo.name, email: ownerInfo.email, profilePicture: ownerInfo.profilePicture } : null,
          joinRequests: joinRequestsPopulated
        };
      });
      res.status(200).json(populated);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching discoverable projects' });
    }
  },

  async submitJoinRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      const result = db.createJoinRequest(id, req.user!.id, message);
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      const project = result.project!;
      
      // Alert owner of new request
      const ownerNotif = db.createNotification(
        project.owner,
        `${req.user!.name} requested to join your project "${project.name}"`
      );
      socketRoomsManager.broadcastToUser(project.owner, 'new_notification', ownerNotif);

      // Notify project listeners
      const joinRequestsPopulated = (project.joinRequests || []).map(r => {
        const u = db.getUserById(r.userId);
        return {
          ...r,
          user: u ? { id: u.id, name: u.name, email: u.email, profilePicture: u.profilePicture, role: u.role } : undefined
        };
      });
      
      socketRoomsManager.broadcastToProject(id, 'project_updated', {
        ...project,
        joinRequests: joinRequestsPopulated
      });
      
      res.status(200).json({ message: 'Request sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error submitting join request' });
    }
  },

  async processJoinRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, requestId } = req.params;
      const { decision } = req.body; // 'accepted' | 'declined'

      if (!decision || (decision !== 'accepted' && decision !== 'declined')) {
        res.status(400).json({ error: 'Valid decision ("accepted" or "declined") required' });
        return;
      }

      const project = db.getProjectById(id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.owner !== req.user!.id) {
        res.status(403).json({ error: 'Only project owners can approve or decline join requests' });
        return;
      }

      const result = db.handleJoinRequest(id, requestId, decision);
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      const reqUser = db.getUserById(result.requestUserId!);
      if (reqUser) {
        const choiceWord = decision === 'accepted' ? 'approved' : 'declined';
        const applicantNotif = db.createNotification(
          reqUser.id,
          `Your request to join team project "${project.name}" was ${choiceWord}!`
        );
        socketRoomsManager.broadcastToUser(reqUser.id, 'new_notification', applicantNotif);

        if (decision === 'accepted') {
          logActivity(reqUser.id, reqUser.name, 'joined project', 'project', project.name, id);
          
          socketRoomsManager.broadcastToProject(id, 'member_joined', {
            projectId: id,
            member: { id: reqUser.id, name: reqUser.name, email: reqUser.email, profilePicture: reqUser.profilePicture }
          });
        }
      }

      const updatedProject = result.project!;
      const joinRequestsPopulated = (updatedProject.joinRequests || []).map(r => {
        const u = db.getUserById(r.userId);
        return {
          ...r,
          user: u ? { id: u.id, name: u.name, email: u.email, profilePicture: u.profilePicture, role: u.role } : undefined
        };
      });
      
      socketRoomsManager.broadcastToProject(id, 'project_updated', {
        ...updatedProject,
        joinRequests: joinRequestsPopulated
      });

      res.status(200).json({
        message: `Request successfully ${decision}`,
        project: {
          ...updatedProject,
          joinRequests: joinRequestsPopulated
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Error processing join request' });
    }
  }
};

// TASK CONTROLLER
export const taskController = {
  async createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, description, priority, status, assignedTo, dueDate, projectId } = req.body;

      if (!title || !description || !projectId) {
        res.status(400).json({ error: 'Title, description, and project ID are required' });
        return;
      }

      const project = db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Auth validation
      if (project.owner !== req.user!.id && !project.members.includes(req.user!.id)) {
        res.status(403).json({ error: 'Access denied to this project' });
        return;
      }

      const newTask = db.createTask({
        title,
        description,
        priority: (priority as TaskPriority) || 'Medium',
        status: (status as TaskStatus) || 'To Do',
        assignedTo,
        dueDate,
        projectId
      });

      logActivity(req.user!.id, req.user!.name, 'created task', 'task', title, projectId);

      // System notification if assigned
      if (assignedTo && assignedTo !== req.user!.id) {
        const assignedUser = db.getUserById(assignedTo);
        if (assignedUser) {
          const mNotif = db.createNotification(assignedTo, `Task "${title}" in "${project.name}" has been assigned to you by ${req.user!.name}.`);
          socketRoomsManager.broadcastToUser(assignedTo, 'new_notification', mNotif);
        }
      }

      // Multi-user update broadcast
      socketRoomsManager.broadcastToProject(projectId, 'task_created', { task: newTask });

      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Error creating task' });
    }
  },

  async getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const project = db.getProjectById(projectId as string);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.owner !== req.user!.id && !project.members.includes(req.user!.id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const tasks = db.getTasksByProject(projectId as string);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tasks' });
    }
  },

  async updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, priority, status, assignedTo, dueDate, subtasks } = req.body;

      const task = db.getTaskById(id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const project = db.getProjectById(task.projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.owner !== req.user!.id && !project.members.includes(req.user!.id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check for changes to alert/notify
      const isStatusChanged = status && status !== task.status;
      const isAssigneeChanged = assignedTo !== undefined && assignedTo !== task.assignedTo;

      const updated = db.updateTask(id, {
        title,
        description,
        priority,
        status,
        assignedTo,
        dueDate,
        subtasks
      });

      if (!updated) {
        res.status(400).json({ error: 'Could not update task' });
        return;
      }

      let actMsg = 'updated task';
      if (isStatusChanged) actMsg = `moved task to "${status}"`;

      logActivity(req.user!.id, req.user!.name, actMsg, 'task', title || task.title, task.projectId);

      // Handle assignment changes
      if (isAssigneeChanged && assignedTo && assignedTo !== req.user!.id) {
        const assignedUser = db.getUserById(assignedTo);
        if (assignedUser) {
          const mNotif = db.createNotification(assignedTo, `Task "${updated.title}" in "${project.name}" has been assigned to you.`);
          socketRoomsManager.broadcastToUser(assignedTo, 'new_notification', mNotif);
        }
      }

      // Handle status change alert (if someone else is assigned to it, let them know)
      if (isStatusChanged && updated.assignedTo && updated.assignedTo !== req.user!.id) {
        const mNotif = db.createNotification(updated.assignedTo, `Assigned task "${updated.title}" status changed to "${status}" by ${req.user!.name}.`);
        socketRoomsManager.broadcastToUser(updated.assignedTo, 'new_notification', mNotif);
      }

      // Broadcast update
      socketRoomsManager.broadcastToProject(task.projectId, 'task_updated', { task: updated });

      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Error updating task' });
    }
  },

  async deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = db.getTaskById(id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const project = db.getProjectById(task.projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.owner !== req.user!.id && !project.members.includes(req.user!.id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const taskTitle = task.title;
      const pId = task.projectId;

      const deleted = db.deleteTask(id);
      if (deleted) {
        logActivity(req.user!.id, req.user!.name, 'deleted task', 'task', taskTitle, pId);
        
        // Broadcast task removal
        socketRoomsManager.broadcastToProject(pId, 'task_deleted', { id });

        res.status(200).json({ message: 'Task deleted successfully' });
      } else {
        res.status(400).json({ error: 'Could not delete task' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error deleting task' });
    }
  }
};

// COMMENTS CONTROLLER
export const commentController = {
  async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { taskId, message } = req.body;
      if (!taskId || !message) {
        res.status(400).json({ error: 'Task ID and message are required' });
        return;
      }

      const task = db.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const project = db.getProjectById(task.projectId);
      if (!project || (project.owner !== req.user!.id && !project.members.includes(req.user!.id))) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const newComment = db.createComment({
        taskId,
        userId: req.user!.id,
        message
      });

      // Attach user profile reference before returning or broadcasting
      const author = db.getUserById(req.user!.id);
      const populatedComment = {
        ...newComment,
        user: author ? { id: author.id, name: author.name, email: author.email, profilePicture: author.profilePicture, role: author.role } : undefined
      };

      logActivity(req.user!.id, req.user!.name, 'commented on', 'comment', task.title, task.projectId);

      // Notify task assignee if someone else is sharing responsibilities
      if (task.assignedTo && task.assignedTo !== req.user!.id) {
        const mNotif = db.createNotification(task.assignedTo, `${req.user!.name} commented on your task "${task.title}": "${message.substring(0, 30)}..."`);
        socketRoomsManager.broadcastToUser(task.assignedTo, 'new_notification', mNotif);
      }

      // Broadcast comment addition
      socketRoomsManager.broadcastToProject(task.projectId, 'comment_added', { comment: populatedComment });

      res.status(201).json(populatedComment);
    } catch (error) {
      res.status(500).json({ error: 'Error adding comment' });
    }
  },

  async getComments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { taskId } = req.query;
      if (!taskId) {
        res.status(400).json({ error: 'Task ID is required' });
        return;
      }

      const task = db.getTaskById(taskId as string);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const comments = db.getCommentsForTask(taskId as string);
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching comments' });
    }
  }
};

// NOTIFICATION CONTROLLER
export const notificationController = {
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const notifications = db.getNotificationsForUser(req.user!.id);
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Error gathering notifications' });
    }
  },

  async markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      db.markAllNotificationsRead(req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error clearing notifications' });
    }
  },

  async markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      db.markNotificationRead(id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error updating notification status' });
    }
  },
};

// DASHBOARD STATS CONTROLLER
export const dashboardController = {
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // 1. Total projects
      const myProjects = db.getProjectsForUser(userId);
      const totalProjects = myProjects.length;

      // Make a list of those project IDs for tracking tasks
      const projectIds = myProjects.map(p => p.id);

      // 2. Filter tasks within user's projects
      const allTasks = db.getTasks().filter(t => projectIds.includes(t.projectId));

      // 3. Pending Tasks (Status !== 'Completed')
      const pendingTasks = allTasks.filter(t => t.status !== 'Completed').length;

      // 4. Completed Tasks
      const completedTasks = allTasks.filter(t => t.status === 'Completed').length;

      // 5. Assigned to current User
      const assignedTasks = allTasks.filter(t => t.assignedTo === userId).length;

      // 6. Recent activities synced
      const activities = db.getRecentActivities(userId);

      // 7. Dynamic Task distribution for simple charts
      const statusDistribution = {
        todo: allTasks.filter(t => t.status === 'To Do').length,
        inProgress: allTasks.filter(t => t.status === 'In Progress').length,
        review: allTasks.filter(t => t.status === 'Review').length,
        completed: completedTasks,
      };

      const priorityDistribution = {
        low: allTasks.filter(t => t.priority === 'Low').length,
        medium: allTasks.filter(t => t.priority === 'Medium').length,
        high: allTasks.filter(t => t.priority === 'High').length,
      };

      res.status(200).json({
        totalProjects,
        pendingTasks,
        completedTasks,
        assignedTasks,
        statusDistribution,
        priorityDistribution,
        recentActivities: activities
      });
    } catch (error) {
      res.status(500).json({ error: 'Error generating dashboard insights' });
    }
  }
};

// CHAT INTEGRATION CONTROLLER
export const chatController = {
  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;
      if (!projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      // Check if user has access to this project
      const project = db.getProjectById(projectId as string);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const hasAccess = project.owner === req.user?.id || project.members.includes(req.user?.id || '');
      if (!hasAccess) {
        res.status(403).json({ error: 'No access to this workspace' });
        return;
      }

      const messages = db.getChatMessages(projectId as string);
      res.status(200).json(messages);
    } catch (error) {
      console.error('getMessages Error:', error);
      res.status(500).json({ error: 'Internal server error getting messages' });
    }
  },

  async postMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, message } = req.body;
      if (!projectId || !message) {
        res.status(400).json({ error: 'projectId and message are required' });
        return;
      }

      // Check access
      const project = db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const hasAccess = project.owner === req.user?.id || project.members.includes(req.user?.id || '');
      if (!hasAccess) {
        res.status(403).json({ error: 'No access to this workspace' });
        return;
      }

      const newMessage = db.createChatMessage({
        projectId,
        userId: req.user!.id,
        message
      });

      // Populate user info
      const sender = db.getUserById(req.user!.id);
      const populatedMsg = {
        ...newMessage,
        user: sender ? {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          profilePicture: sender.profilePicture,
          role: sender.role
        } : undefined
      };

      // Broadcast
      socketRoomsManager.broadcastToProject(projectId, 'new_chat_message', populatedMsg);

      res.status(201).json(populatedMsg);
    } catch (error) {
      console.error('postMessage Error:', error);
      res.status(500).json({ error: 'Internal server error sending message' });
    }
  }
};
