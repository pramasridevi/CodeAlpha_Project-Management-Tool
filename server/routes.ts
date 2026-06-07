import { Router } from 'express';
import { protect } from './middleware';
import { authController, projectController, taskController, commentController, notificationController, dashboardController, chatController } from './controllers';

const router = Router();

// AUTH ROUTES
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', protect as any, authController.getProfile);
router.put('/auth/profile', protect as any, authController.updateProfile);

// DASHBOARD STATS
router.get('/dashboard/stats', protect as any, dashboardController.getStats);

// PROJECT ROUTES
router.get('/projects', protect as any, projectController.getProjects);
router.get('/projects/discoverable', protect as any, projectController.getDiscoverableProjects);
router.post('/projects', protect as any, projectController.createProject);
router.get('/projects/:id', protect as any, projectController.getProjectDetails);
router.put('/projects/:id', protect as any, projectController.updateProject);
router.delete('/projects/:id', protect as any, projectController.deleteProject);
router.post('/projects/:id/invite', protect as any, projectController.inviteMember);
router.post('/projects/:id/join-request', protect as any, projectController.submitJoinRequest);
router.post('/projects/:id/join-request/:requestId', protect as any, projectController.processJoinRequest);

// TASK ROUTES
router.get('/tasks', protect as any, taskController.getTasks);
router.post('/tasks', protect as any, taskController.createTask);
router.put('/tasks/:id', protect as any, taskController.updateTask);
router.delete('/tasks/:id', protect as any, taskController.deleteTask);

// COMMENT ROUTES
router.get('/comments', protect as any, commentController.getComments);
router.post('/comments', protect as any, commentController.addComment);

// CHAT ROUTES
router.get('/chat', protect as any, chatController.getMessages);
router.post('/chat', protect as any, chatController.postMessage);

// NOTIFICATION ROUTES
router.get('/notifications', protect as any, notificationController.getNotifications);
router.post('/notifications/read-all', protect as any, notificationController.markAllRead);
router.post('/notifications/:id/read', protect as any, notificationController.markRead);

export default router;
