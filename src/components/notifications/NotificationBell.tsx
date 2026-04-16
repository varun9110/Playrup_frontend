import { useEffect, useMemo, useState } from 'react';
import axios from '@/lib/axiosConfig';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';

type NotificationItem = {
  _id: string;
  templateKey: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasSession = useMemo(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return Boolean(token && user);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/notification/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread notification count', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/notification/my', {
        params: {
          limit: 50,
          offset: 0
        }
      });
      setNotifications(res.data.items || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markOneRead = async (notificationId: string) => {
    try {
      await axios.patch(`/api/notification/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch('/api/notification/read-all');
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  useEffect(() => {
    if (!hasSession) return;

    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 8000);

    return () => clearInterval(timer);
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession || !open) return;
    fetchNotifications();
  }, [open, hasSession]);

  if (!hasSession) return null;

  return (
    <div className="fixed right-4 top-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative rounded-full shadow-md">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-2 -top-2 min-w-5 px-1.5 text-[10px] leading-5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[92vw] max-w-md overflow-hidden p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Latest updates across bookings and activities.
            </SheetDescription>
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={markAllRead}>
                Mark all as read
              </Button>
            </div>
          </SheetHeader>

          <div className="max-h-[calc(100vh-130px)] overflow-y-auto px-5 py-3">
            {loading && <p className="text-sm text-muted-foreground">Loading notifications...</p>}

            {!loading && notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}

            {!loading && notifications.length > 0 && (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const isRead = Boolean(notification.readAt);

                  return (
                    <button
                      key={notification._id}
                      type="button"
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isRead ? 'bg-background' : 'bg-primary/5 border-primary/30'
                      }`}
                      onClick={() => {
                        if (!isRead) {
                          markOneRead(notification._id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{notification.title}</p>
                        {!isRead && <Badge variant="default">New</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
