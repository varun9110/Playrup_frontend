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

const ISO_UTC_DATE_TIME_REGEX = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\b/g;
const UNREAD_POLL_INTERVAL_MS = 30000;
const LEADER_HEARTBEAT_MS = 5000;
const LEADER_TTL_MS = 15000;
const UNREAD_BROADCAST_CHANNEL = 'playrup-unread-count-channel';
const UNREAD_LEADER_LOCK_KEY = 'playrup-unread-count-leader';
const UNREAD_SYNC_KEY = 'playrup-unread-count-sync';
// Backward-compatible aliases for stale HMR listeners in already-open tabs.
const LEADER_KEY = UNREAD_LEADER_LOCK_KEY;
const SYNC_KEY = UNREAD_SYNC_KEY;
const TAB_ID = `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;

type LeaderLockPayload = {
  tabId: string;
  expiresAt: number;
};

type UnreadSyncPayload = {
  count: number;
  updatedAt: number;
};

let sharedUnreadCount = 0;
let unreadPollTimer: ReturnType<typeof setInterval> | null = null;
let unreadLeaderHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
let unreadPollInFlight = false;
let unreadSessionActive = false;
let unreadManagerStarted = false;
let isUnreadLeader = false;
let lastUnreadUpdateAt = 0;
let unreadBroadcastChannel: BroadcastChannel | null = null;
const unreadSubscribers = new Set<(count: number) => void>();

const parseLeaderLock = (value: string | null): LeaderLockPayload | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<LeaderLockPayload>;
    if (!parsed || typeof parsed.tabId !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    return {
      tabId: parsed.tabId,
      expiresAt: parsed.expiresAt
    };
  } catch {
    return null;
  }
};

const readLeaderLock = () => parseLeaderLock(localStorage.getItem(UNREAD_LEADER_LOCK_KEY));

const writeLeaderLock = (expiresAt: number) => {
  const payload: LeaderLockPayload = { tabId: TAB_ID, expiresAt };
  localStorage.setItem(UNREAD_LEADER_LOCK_KEY, JSON.stringify(payload));
};

const clearLeaderLockIfOwned = () => {
  const lock = readLeaderLock();
  if (lock?.tabId === TAB_ID) {
    localStorage.removeItem(UNREAD_LEADER_LOCK_KEY);
  }
};

const parseUnreadSyncPayload = (value: string | null): UnreadSyncPayload | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<UnreadSyncPayload>;
    if (!parsed || typeof parsed.count !== 'number' || typeof parsed.updatedAt !== 'number') {
      return null;
    }

    return {
      count: parsed.count,
      updatedAt: parsed.updatedAt
    };
  } catch {
    return null;
  }
};

const handleUnreadRemoteUpdate = (payload: UnreadSyncPayload) => {
  if (payload.updatedAt <= lastUnreadUpdateAt) return;
  lastUnreadUpdateAt = payload.updatedAt;

  sharedUnreadCount = payload.count;
  unreadSubscribers.forEach((subscriber) => subscriber(payload.count));
};

const pushUnreadToOtherTabs = (count: number, updatedAt: number) => {
  const payload: UnreadSyncPayload = { count, updatedAt };

  if (unreadBroadcastChannel) {
    unreadBroadcastChannel.postMessage(payload);
  }

  localStorage.setItem(UNREAD_SYNC_KEY, JSON.stringify(payload));
  localStorage.removeItem(UNREAD_SYNC_KEY);
};

const broadcastUnreadCount = (count: number, options: { syncTabs?: boolean } = {}) => {
  const { syncTabs = false } = options;
  const updatedAt = Date.now();

  lastUnreadUpdateAt = updatedAt;
  sharedUnreadCount = count;
  unreadSubscribers.forEach((subscriber) => subscriber(count));

  if (syncTabs) {
    pushUnreadToOtherTabs(count, updatedAt);
  }
};

const stopUnreadPolling = () => {
  if (unreadPollTimer) {
    clearInterval(unreadPollTimer);
    unreadPollTimer = null;
  }
};

const fetchAndBroadcastUnreadCount = async () => {
  if (!unreadSessionActive || unreadPollInFlight || !isUnreadLeader || document.hidden) return;

  unreadPollInFlight = true;
  try {
    const res = await axios.get('/api/notification/unread-count');
    broadcastUnreadCount(res.data.unreadCount || 0, { syncTabs: true });
  } catch (error) {
    console.error('Failed to fetch unread notification count', error);
  } finally {
    unreadPollInFlight = false;
  }
};

const startUnreadPolling = () => {
  if (unreadPollTimer || !isUnreadLeader) return;

  unreadPollTimer = setInterval(() => {
    void fetchAndBroadcastUnreadCount();
  }, UNREAD_POLL_INTERVAL_MS);
};

const becomeUnreadLeader = () => {
  if (isUnreadLeader) return;

  isUnreadLeader = true;
  writeLeaderLock(Date.now() + LEADER_TTL_MS);
  startUnreadPolling();

  if (!unreadLeaderHeartbeatTimer) {
    unreadLeaderHeartbeatTimer = setInterval(() => {
      if (!isUnreadLeader || document.hidden) return;
      writeLeaderLock(Date.now() + LEADER_TTL_MS);
    }, LEADER_HEARTBEAT_MS);
  }

  void fetchAndBroadcastUnreadCount();
};

const stepDownUnreadLeader = () => {
  if (!isUnreadLeader) return;

  isUnreadLeader = false;
  stopUnreadPolling();
  clearLeaderLockIfOwned();

  if (unreadLeaderHeartbeatTimer) {
    clearInterval(unreadLeaderHeartbeatTimer);
    unreadLeaderHeartbeatTimer = null;
  }
};

const tryAcquireUnreadLeadership = () => {
  if (!unreadSessionActive || document.hidden) {
    stepDownUnreadLeader();
    return;
  }

  const now = Date.now();
  const currentLock = readLeaderLock();
  const lockExpired = !currentLock || currentLock.expiresAt <= now;
  const lockOwnedByCurrentTab = currentLock?.tabId === TAB_ID;

  if (lockExpired || lockOwnedByCurrentTab) {
    becomeUnreadLeader();
    return;
  }

  stepDownUnreadLeader();
};

const handleUnreadVisibilityChange = () => {
  tryAcquireUnreadLeadership();

  if (!document.hidden && isUnreadLeader) {
    void fetchAndBroadcastUnreadCount();
  }
};

const handleUnreadStorageEvent = (event: StorageEvent) => {
  if (event.key === UNREAD_SYNC_KEY) {
    const payload = parseUnreadSyncPayload(event.newValue);
    if (payload) {
      handleUnreadRemoteUpdate(payload);
    }
    return;
  }

  if (event.key === UNREAD_LEADER_LOCK_KEY) {
    tryAcquireUnreadLeadership();
  }
};

const handleUnreadBroadcastMessage = (event: MessageEvent<UnreadSyncPayload>) => {
  const payload = event.data;
  if (!payload || typeof payload.count !== 'number' || typeof payload.updatedAt !== 'number') {
    return;
  }

  handleUnreadRemoteUpdate(payload);
};

const handleUnreadPageExit = () => {
  stepDownUnreadLeader();
};

const startUnreadManager = () => {
  if (unreadManagerStarted) return;

  unreadManagerStarted = true;

  if (typeof BroadcastChannel !== 'undefined') {
    unreadBroadcastChannel = new BroadcastChannel(UNREAD_BROADCAST_CHANNEL);
    unreadBroadcastChannel.addEventListener('message', handleUnreadBroadcastMessage);
  }

  window.addEventListener('visibilitychange', handleUnreadVisibilityChange);
  window.addEventListener('storage', handleUnreadStorageEvent);
  window.addEventListener('beforeunload', handleUnreadPageExit);

  tryAcquireUnreadLeadership();
};

const stopUnreadManager = () => {
  if (!unreadManagerStarted) return;

  unreadManagerStarted = false;
  stepDownUnreadLeader();

  window.removeEventListener('visibilitychange', handleUnreadVisibilityChange);
  window.removeEventListener('storage', handleUnreadStorageEvent);
  window.removeEventListener('beforeunload', handleUnreadPageExit);

  if (unreadBroadcastChannel) {
    unreadBroadcastChannel.removeEventListener('message', handleUnreadBroadcastMessage);
    unreadBroadcastChannel.close();
    unreadBroadcastChannel = null;
  }

  unreadPollInFlight = false;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatNotificationBody = (body: string) => {
  if (!body) return body;
  return body.replace(ISO_UTC_DATE_TIME_REGEX, (match) => formatDateTime(match));
};

const formatTimeOnly = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatNotificationBodyByTemplate = (notification: NotificationItem) => {
  if (!notification.body) return notification.body;

  if (notification.templateKey === 'activity.joinRequest.sent.forHost') {
    return notification.body.replace(ISO_UTC_DATE_TIME_REGEX, (match) => formatTimeOnly(match));
  }

  return formatNotificationBody(notification.body);
};

interface NotificationBellProps {
  inline?: boolean;
}

export default function NotificationBell({ inline = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasSession = useMemo(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return Boolean(token && user);
  }, []);

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
      broadcastUnreadCount(res.data.unreadCount || 0, { syncTabs: true });
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
      broadcastUnreadCount(Math.max(0, sharedUnreadCount - 1), { syncTabs: true });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch('/api/notification/read-all');
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || now })));
      broadcastUnreadCount(0, { syncTabs: true });
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  useEffect(() => {
    if (!hasSession) return;

    unreadSessionActive = true;
    const unsubscribe = (() => {
      unreadSubscribers.add(setUnreadCount);
      setUnreadCount(sharedUnreadCount);
      return () => unreadSubscribers.delete(setUnreadCount);
    })();

    startUnreadManager();
    tryAcquireUnreadLeadership();

    return () => {
      unsubscribe();
      if (unreadSubscribers.size === 0) {
        unreadSessionActive = false;
        stopUnreadManager();
      }
    };
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession || !open) return;
    fetchNotifications();
  }, [open, hasSession]);

  if (!hasSession) return null;

  const sheetContent = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full shadow-md hover:bg-slate-100">
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
                    <p className="mt-1 text-sm text-muted-foreground">{formatNotificationBodyByTemplate(notification)}</p>
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
  );

  return inline ? sheetContent : (
    <div className="fixed right-4 top-4 z-50">
      {sheetContent}
    </div>
  );
}
