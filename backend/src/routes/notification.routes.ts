import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  autoApplyFromNotification
} from '../controllers/notification.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', markAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

// Auto-apply from a job match notification
router.post('/:id/auto-apply', autoApplyFromNotification);

export default router;
