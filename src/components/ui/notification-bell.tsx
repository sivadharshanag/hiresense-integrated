import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, X, Briefcase, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { notificationsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationData {
  jobId?: {
    _id: string;
    title: string;
    company: string;
    location: string;
    employmentType: string;
  };
  matchPercentage?: number;
  matchedSkills?: string[];
}

interface Notification {
  _id: string;
  type: 'job_match' | 'application_update' | 'interview_scheduled' | 'system';
  title: string;
  message: string;
  data: NotificationData;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const { toast } = useToast();
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notificationsApi.getAll(1, 20, false);
      if (response.data?.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({
        title: 'All notifications marked as read',
        description: 'Your notification inbox is now clear.',
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Auto-apply from notification
  const handleAutoApply = async (notification: Notification) => {
    setApplyingId(notification._id);
    try {
      const response = await notificationsApi.autoApply(notification._id);
      toast({
        title: '🎉 Application Submitted!',
        description: response.message || `You've applied to ${notification.data.jobId?.title}`,
      });
      // Mark as read and refresh
      setNotifications(prev =>
        prev.map(n => (n._id === notification._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      toast({
        title: 'Application Failed',
        description: error.message || 'Could not submit application',
        variant: 'destructive',
      });
    } finally {
      setApplyingId(null);
    }
  };

  // Delete notification
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      const notification = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Poll for unread count
  useEffect(() => {
    fetchUnreadCount();
    pollInterval.current = setInterval(fetchUnreadCount, 30000); // Poll every 30s

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [fetchUnreadCount]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">Job matches will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification._id}
                  className={cn(
                    'p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group',
                    !notification.isRead && 'bg-primary/5'
                  )}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                >
                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                  )}

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(notification._id, e)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className={cn('pl-3', !notification.isRead && 'pl-4')}>
                    {/* Icon and title */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {notification.type === 'job_match' && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* Job match details */}
                        {notification.type === 'job_match' && notification.data.matchPercentage && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="success" className="text-[10px] px-2 py-0.5">
                              {notification.data.matchPercentage}% Match
                            </Badge>
                            {notification.data.matchedSkills?.slice(0, 2).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-[10px] px-2 py-0.5">
                                {skill}
                              </Badge>
                            ))}
                            {(notification.data.matchedSkills?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{(notification.data.matchedSkills?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Time and action */}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>

                          {notification.type === 'job_match' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoApply(notification);
                              }}
                              disabled={applyingId === notification._id}
                            >
                              {applyingId === notification._id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Applying...
                                </>
                              ) : (
                                <>
                                  Apply Now
                                  <ChevronRight className="h-3 w-3" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
