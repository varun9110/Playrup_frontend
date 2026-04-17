import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Send,
  ImagePlus,
  Smile,
  Loader2,
  MoreVertical,
  MessageCircle,
  Trophy,
  Zap,
  History,
  PlusCircle,
  Star,
  XCircle,
  Shield,
  UserCheck,
} from 'lucide-react';
import { utcDateTimeToLocalParts } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Navbar } from '@/components/layout';
import ActivityParticipantsDialog from '@/components/activities/ActivityParticipantsDialog';

type EncryptedValue = {
  iv: string;
  content: string;
  tag: string;
};

type FeedbackStatus = {
  canSubmit: boolean;
  totalRecipients: number;
  submittedCount: number;
  isComplete: boolean;
};

type JoinedPlayer = {
  id: EncryptedValue | string;
  name?: string;
};

type Activity = {
  _id: string;
  sport: string;
  city?: string;
  location?: string;
  address?: string;
  date: string;
  fromTime: string;
  toTime: string;
  localDate?: string;
  localDateObj?: Date;
  localFromTime?: string;
  localToTime?: string;
  maxPlayers: number;
  status?: string;
  joinedPlayers?: JoinedPlayer[];
  skillLevel?: string;
  feedbackStatus?: FeedbackStatus;
  host: {
    id: EncryptedValue;
    name: string;
  };
};

type ChatParticipant = {
  id: EncryptedValue;
  name: string;
  email: string;
  isHost: boolean;
};

type ChatAttachment = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

type ChatMessage = {
  _id: string;
  activityId: string;
  message?: string;
  attachment?: ChatAttachment | null;
  sender: {
    id: EncryptedValue;
    name: string;
  };
  createdAt: string;
  isOwnMessage: boolean;
  isReadByCurrentUser: boolean;
};

type TypingUser = {
  id: EncryptedValue;
  name: string;
};

type RoleFilter = 'all' | 'host' | 'participant';

export default function MyHostedActivities() {
  const navigate = useNavigate();
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [pastActivities, setPastActivities] = useState<Activity[]>([]);
  const [cancelledActivities, setCancelledActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityToCancel, setActivityToCancel] = useState<Activity | null>(null);
  const [openCancel, setOpenCancel] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [selectedParticipantsActivity, setSelectedParticipantsActivity] = useState<Activity | null>(null);

  const [upcomingFilter, setUpcomingFilter] = useState<RoleFilter>('all');
  const [pastFilter, setPastFilter] = useState<RoleFilter>('all');
  const [cancelledFilter, setCancelledFilter] = useState<RoleFilter>('all');

  const [openChat, setOpenChat] = useState(false);
  const [selectedChatActivity, setSelectedChatActivity] = useState<Activity | null>(null);
  const [chatParticipants, setChatParticipants] = useState<ChatParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const userEmail = storedUser?.email;
  const userId = storedUser?.userId as EncryptedValue | undefined;
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, ''),
    []
  );

  const getComparableValue = (value: EncryptedValue | string | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.content || '';
  };

  const currentUserId = getComparableValue(userId);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const isUserHost = (activity: Activity) =>
    getComparableValue(activity.host.id) === currentUserId;

  const isUserParticipant = (activity: Activity) => {
    if (!activity.joinedPlayers) return false;
    return activity.joinedPlayers.some(
      (p) => getComparableValue(p.id as EncryptedValue | string) === currentUserId
    );
  };

  const applyRoleFilter = (activities: Activity[], filter: RoleFilter): Activity[] => {
    if (filter === 'host') return activities.filter(isUserHost);
    if (filter === 'participant') return activities.filter((a) => !isUserHost(a) && isUserParticipant(a));
    return activities;
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    if (!openChat || !selectedChatActivity?._id) return;

    const pollMessages = setInterval(() => {
      fetchChatMessages(selectedChatActivity._id, true);
    }, 3000);

    const pollTyping = setInterval(() => {
      fetchTypingUsers(selectedChatActivity._id);
    }, 1500);

    return () => {
      clearInterval(pollMessages);
      clearInterval(pollTyping);
    };
  }, [openChat, selectedChatActivity?._id]);

  useEffect(() => {
    if (!openChat || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, typingUsers, openChat]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const parseLocalActivityDateTime = (dateValue?: string, timeValue?: string) => {
    if (!dateValue || !timeValue) return null;

    if (String(timeValue).includes('T')) {
      const parsedFullDateTime = new Date(String(timeValue));
      return Number.isNaN(parsedFullDateTime.getTime()) ? null : parsedFullDateTime;
    }

    const dateOnly = String(dateValue).includes('T')
      ? String(dateValue).split('T')[0]
      : String(dateValue);

    const normalizedTime = String(timeValue).trim();
    const amPmMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);

    let time24 = normalizedTime;
    if (amPmMatch) {
      const [, hourPart, minutePart, meridiem] = amPmMatch;
      let hours = Number(hourPart);
      if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
      time24 = `${String(hours).padStart(2, '0')}:${minutePart}`;
    }

    const withSeconds = /^\d{2}:\d{2}$/.test(time24) ? `${time24}:00` : time24;
    const localDateTime = new Date(`${dateOnly}T${withSeconds}`);
    return Number.isNaN(localDateTime.getTime()) ? null : localDateTime;
  };

  const fetchActivities = async () => {
    if (!userEmail) return;

    try {
      const res = await axios.post(
        '/api/activity/userActivities',
        { userEmail, userId }
      );

      const now = new Date();
      const upcoming: Activity[] = [];
      const past: Activity[] = [];
      const cancelled: Activity[] = [];

      res.data.activitiesWithEncryptedData.forEach((activity: Activity) => {
        const localStart = utcDateTimeToLocalParts(activity.date, activity.fromTime);
        const localEnd = utcDateTimeToLocalParts(activity.date, activity.toTime);
        const parsedStartDateTime = parseLocalActivityDateTime(activity.date, activity.fromTime);
        const parsedEndDateTime = parseLocalActivityDateTime(activity.date, activity.toTime);
        const normalizedActivity: Activity = {
          ...activity,
          localDate: localStart?.date || activity.date,
          localDateObj: parsedStartDateTime || localStart?.dateObj,
          localFromTime: localStart?.time || activity.fromTime,
          localToTime: localEnd?.time || activity.toTime,
        };

        if (normalizedActivity.status === 'Cancelled') {
          cancelled.push(normalizedActivity);
          return;
        }

        const activityEndDateTime = parsedEndDateTime || parsedStartDateTime || localEnd?.dateObj || localStart?.dateObj;
        const isUpcoming =
          normalizedActivity.status === 'Active' &&
          activityEndDateTime instanceof Date &&
          !Number.isNaN(activityEndDateTime.getTime()) &&
          activityEndDateTime >= now;

        if (isUpcoming) {
          upcoming.push(normalizedActivity);
        } else {
          past.push(normalizedActivity);
        }
      });

      upcoming.sort((a, b) => {
        const aTime = a.localDateObj instanceof Date ? a.localDateObj.getTime() : 0;
        const bTime = b.localDateObj instanceof Date ? b.localDateObj.getTime() : 0;
        return aTime - bTime;
      });

      past.sort((a, b) => {
        const aTime = a.localDateObj instanceof Date ? a.localDateObj.getTime() : 0;
        const bTime = b.localDateObj instanceof Date ? b.localDateObj.getTime() : 0;
        return bTime - aTime;
      });

      cancelled.sort((a, b) => {
        const aTime = a.localDateObj instanceof Date ? a.localDateObj.getTime() : 0;
        const bTime = b.localDateObj instanceof Date ? b.localDateObj.getTime() : 0;
        return bTime - aTime;
      });

      setUpcomingActivities(upcoming);
      setPastActivities(past);
      setCancelledActivities(cancelled);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };


  const capitalizeWords = (str: string | undefined) =>
    str ? str.replace(/\b\w/g, (char) => char.toUpperCase()) : '';

  const shouldShowFeedbackButton = (activity: Activity) => activity.status === 'Completed';

  const getFeedbackButtonLabel = (activity: Activity) => {
    if (!activity.feedbackStatus) {
      return 'Rate Players';
    }

    return activity.feedbackStatus.isComplete ? 'Review Ratings' : 'Rate Players';
  };

  const handleEditActivity = (activity: Activity) => console.log('Edit activity', activity);

  const openCancelModal = (activity: Activity) => {
    setActivityToCancel(activity);
    setOpenCancel(true);
  };

  const openParticipantsDialog = (activity: Activity) => {
    setSelectedParticipantsActivity(activity);
    setShowParticipantsDialog(true);
  };

  const handleViewParticipantProfile = (participantId: EncryptedValue | string) => {
    setShowParticipantsDialog(false);

    if (getComparableValue(participantId) === currentUserId) {
      navigate('/profile');
      return;
    }

    const userToken = encodeURIComponent(JSON.stringify(participantId));
    navigate(`/participant-profile/${userToken}`);
  };

  const resolveMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${apiBaseUrl}${url}`;
  };

  const fetchChatParticipants = async (activityId: string) => {
    const res = await axios.get(`/api/activity/chat/${activityId}/participants`);
    setChatParticipants(res.data.participants || []);
  };

  const markMessagesAsRead = async (activityId: string, messages: ChatMessage[]) => {
    const unreadIds = messages
      .filter((message) => !message.isOwnMessage && !message.isReadByCurrentUser)
      .map((message) => message._id);

    if (!unreadIds.length) return;

    await axios.post(`/api/activity/chat/${activityId}/read`, {
      messageIds: unreadIds
    });
  };

  const fetchChatMessages = async (activityId: string, silent = false) => {
    try {
      const res = await axios.get(`/api/activity/chat/${activityId}/messages`, {
        params: { limit: 100 }
      });
      const messages = (res.data.messages || []) as ChatMessage[];
      setChatMessages(messages);
      await markMessagesAsRead(activityId, messages);
    } catch (error) {
      if (!silent) {
        console.error('Failed to fetch chat messages', error);
      }
    }
  };

  const fetchTypingUsers = async (activityId: string) => {
    try {
      const res = await axios.get(`/api/activity/chat/${activityId}/typing`);
      setTypingUsers(res.data.typingUsers || []);
    } catch (error) {
      console.error('Failed to fetch typing status', error);
    }
  };

  const updateTypingStatus = async (activityId: string, isTyping: boolean) => {
    try {
      await axios.post(`/api/activity/chat/${activityId}/typing`, { isTyping });
    } catch (error) {
      console.error('Failed to update typing status', error);
    }
  };

  const triggerTypingSignal = (nextText: string) => {
    if (!selectedChatActivity?._id) return;

    const currentlyTyping = nextText.trim().length > 0;

    if (currentlyTyping && !isTypingRef.current) {
      isTypingRef.current = true;
      updateTypingStatus(selectedChatActivity._id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && selectedChatActivity?._id) {
        isTypingRef.current = false;
        updateTypingStatus(selectedChatActivity._id, false);
      }
    }, 1200);
  };

  const closeChatRoom = () => {
    if (selectedChatActivity?._id && isTypingRef.current) {
      updateTypingStatus(selectedChatActivity._id, false);
      isTypingRef.current = false;
    }

    setOpenChat(false);
    setSelectedChatActivity(null);
    setChatParticipants([]);
    setChatMessages([]);
    setTypingUsers([]);
    setChatInput('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);
  };

  const openChatRoom = async (activity: Activity) => {
    setSelectedChatActivity(activity);
    setOpenChat(true);
    setShowEmojiPicker(false);
    try {
      await Promise.all([
        fetchChatParticipants(activity._id),
        fetchChatMessages(activity._id),
        fetchTypingUsers(activity._id)
      ]);
    } catch (error) {
      console.error('Failed to open chat room', error);
    }
  };

  const uploadChatImage = async (file: File) => {
    if (!selectedChatActivity?._id) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploadingImage(true);
    try {
      const res = await axios.post(
        `/api/activity/chat/${selectedChatActivity._id}/upload-photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setPendingAttachment(res.data.attachment || null);
    } catch (error) {
      console.error('Image upload failed', error);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendChatMessage = async () => {
    if (!selectedChatActivity?._id) return;
    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage && !pendingAttachment) return;

    setIsSendingMessage(true);
    try {
      await axios.post(`/api/activity/chat/${selectedChatActivity._id}/messages`, {
        message: trimmedMessage,
        attachment: pendingAttachment
      });

      setChatInput('');
      setPendingAttachment(null);
      setShowEmojiPicker(false);

      if (isTypingRef.current) {
        isTypingRef.current = false;
        updateTypingStatus(selectedChatActivity._id, false);
      }

      await fetchChatMessages(selectedChatActivity._id, true);
    } catch (error) {
      console.error('Failed to send chat message', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  /* ---------- CANCEL ACTIVITY ---------- */
  const confirmCancelActivity = async () => {
    if (!activityToCancel) return;

    try {
      const res = await axios.post('/api/activity/cancelActivity', {
        activityId: activityToCancel._id,
        hostEmail: userEmail,
        hostId: userId,
      });

      console.log(res.data.message); // Optional: success message

      // REFRESH ACTIVITIES LIST WITH CURRENT FILTERS
      await fetchActivities(); // <-- Fetch latest activities after cancel
    } catch (err) {
      console.error('Failed to cancel activity', err);
    } finally {
      setOpenCancel(false);
      setActivityToCancel(null);
    }
  };

  /* ── Role Filter Pills ── */
  const RoleFilterPills = ({
    value,
    onChange,
    counts,
  }: {
    value: RoleFilter;
    onChange: (v: RoleFilter) => void;
    counts: { all: number; host: number; participant: number };
  }) => (
    <div className="flex items-center gap-2 flex-wrap">
      {(
        [
          { key: 'all' as RoleFilter, label: 'All', icon: null },
          { key: 'host' as RoleFilter, label: 'As Host', icon: <Shield className="h-3.5 w-3.5 mr-1" /> },
          { key: 'participant' as RoleFilter, label: 'As Player', icon: <UserCheck className="h-3.5 w-3.5 mr-1" /> },
        ]
      ).map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${value === key
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
            }`}
        >
          {icon}
          {label}
          <span
            className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${value === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
          >
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  );

  /* ── Activity Card ── */
  const renderActivityCard = (activity: Activity, allowCancelAction = true) => {
    const isHost = isUserHost(activity);
    const isParticipant = isUserParticipant(activity);

    return (
      <Card key={activity._id} className="hover:shadow-md transition-all duration-200 border-slate-200 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100 py-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {capitalizeWords(activity.sport)}
                </CardTitle>
                {isHost && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-2 py-0">
                    <Shield className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
                {!isHost && isParticipant && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Player
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1 text-slate-500">
                Hosted by {activity.host.name}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 ml-2 shrink-0">
              {activity.city && (
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                  {capitalizeWords(activity.city)}
                </Badge>
              )}
              {activity.status && activity.status !== 'Active' && (
                <Badge
                  variant={
                    activity.status === 'Completed'
                      ? 'secondary'
                      : activity.status === 'Cancelled'
                        ? 'outline'
                        : 'destructive'
                  }
                  className={activity.status === 'Cancelled' ? 'border-rose-200 text-rose-600 bg-rose-50' : ''}
                >
                  {activity.status}
                </Badge>
              )}

              {allowCancelAction && isHost && activity.status === 'Active' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:bg-blue-50">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="capitalize">
                    <DropdownMenuItem onClick={() => handleEditActivity(activity)}>
                      Edit Activity
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => openCancelModal(activity)}
                    >
                      Cancel Activity
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                {(activity.localDateObj || new Date(activity.date)).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                {activity.localFromTime || activity.fromTime} – {activity.localToTime || activity.toTime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="truncate">
                {capitalizeWords(activity.location) || capitalizeWords(activity.address)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                {activity.joinedPlayers?.length || 0}/{activity.maxPlayers} players
              </span>
            </div>
          </div>

          {activity.skillLevel && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <Badge variant="secondary" className="text-xs">
                {capitalizeWords(activity.skillLevel)} Level
              </Badge>
            </div>
          )}

          {activity.status !== 'Cancelled' && (
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => openParticipantsDialog(activity)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Participants
              </Button>

              <Button
                variant="outline"
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => openChatRoom(activity)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat with Players
              </Button>

              {shouldShowFeedbackButton(activity) && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate(`/activities/${activity._id}/feedback`)}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  {getFeedbackButtonLabel(activity)}
                  {activity.feedbackStatus && (
                    <span className="ml-2 text-xs opacity-80">
                      ({activity.feedbackStatus.submittedCount}/{activity.feedbackStatus.totalRecipients})
                    </span>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /* ── Empty State ── */
  const EmptyState = ({
    icon: Icon,
    title,
    subtitle,
    showCta,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    showCta?: boolean;
  }) => (
    <div className="text-center py-14 text-slate-400">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="font-medium text-slate-500">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
      {showCta && (
        <Button
          className="mt-5 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => navigate('/host-activity')}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Host an Activity
        </Button>
      )}
    </div>
  );

  const filteredUpcoming = applyRoleFilter(upcomingActivities, upcomingFilter);
  const filteredPast = applyRoleFilter(pastActivities, pastFilter);
  const filteredCancelled = applyRoleFilter(cancelledActivities, cancelledFilter);

  const upcomingCounts = {
    all: upcomingActivities.length,
    host: upcomingActivities.filter(isUserHost).length,
    participant: upcomingActivities.filter((a) => !isUserHost(a) && isUserParticipant(a)).length,
  };
  const pastCounts = {
    all: pastActivities.length,
    host: pastActivities.filter(isUserHost).length,
    participant: pastActivities.filter((a) => !isUserHost(a) && isUserParticipant(a)).length,
  };
  const cancelledCounts = {
    all: cancelledActivities.length,
    host: cancelledActivities.filter(isUserHost).length,
    participant: cancelledActivities.filter((a) => !isUserHost(a) && isUserParticipant(a)).length,
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <Navbar onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <Card className="border-slate-200">
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
              <p className="text-slate-500 text-lg">Loading your activities…</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">

        {/* ── Hero ── */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
                My Activities
              </h1>
              <p className="text-slate-500 text-lg">
                Every session you've hosted or joined, all in one place.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">

              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate('/host-activity')}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Host New Activity
              </Button>
              <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Upcoming</p>
                <p className="text-2xl font-bold text-slate-800">{upcomingActivities.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-slate-100">
                <History className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Past</p>
                <p className="text-2xl font-bold text-slate-800">{pastActivities.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-rose-100">
                <XCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Cancelled</p>
                <p className="text-2xl font-bold text-slate-800">{cancelledActivities.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-emerald-100">
                <Trophy className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">
                  {upcomingActivities.length + pastActivities.length + cancelledActivities.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Tabs Card ── */}
        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="upcoming">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100 px-6 pt-5 pb-0">
                <TabsList className="bg-transparent border-0 h-auto p-0 gap-0 w-full justify-start">
                  <TabsTrigger
                    value="upcoming"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 px-5 pb-3 pt-1 font-medium"
                  >
                    Upcoming
                    <span className="ml-2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5">
                      {upcomingActivities.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 px-5 pb-3 pt-1 font-medium"
                  >
                    Past
                    <span className="ml-2 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-0.5">
                      {pastActivities.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="cancelled"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 px-5 pb-3 pt-1 font-medium"
                  >
                    Cancelled
                    <span className="ml-2 rounded-full bg-rose-100 text-rose-600 text-[10px] font-semibold px-2 py-0.5">
                      {cancelledActivities.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Upcoming ── */}
              <TabsContent value="upcoming" className="p-6 space-y-5 mt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-500">
                    {filteredUpcoming.length} activit{filteredUpcoming.length !== 1 ? 'ies' : 'y'} shown
                  </p>
                  <RoleFilterPills value={upcomingFilter} onChange={setUpcomingFilter} counts={upcomingCounts} />
                </div>
                {filteredUpcoming.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUpcoming.map((activity) => renderActivityCard(activity, true))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Zap}
                    title={
                      upcomingFilter === 'all'
                        ? 'No upcoming activities'
                        : upcomingFilter === 'host'
                          ? 'No upcoming activities you are hosting'
                          : 'No upcoming activities you are playing in'
                    }
                    subtitle={
                      upcomingFilter !== 'participant'
                        ? 'Host a new activity to see it here.'
                        : 'Join an activity to see it here.'
                    }
                    showCta={upcomingFilter !== 'participant'}
                  />
                )}
              </TabsContent>

              {/* ── Past ── */}
              <TabsContent value="past" className="p-6 space-y-5 mt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-500">
                    {filteredPast.length} activit{filteredPast.length !== 1 ? 'ies' : 'y'} shown
                  </p>
                  <RoleFilterPills value={pastFilter} onChange={setPastFilter} counts={pastCounts} />
                </div>
                {filteredPast.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPast.map((activity) => renderActivityCard(activity, false))}
                  </div>
                ) : (
                  <EmptyState
                    icon={History}
                    title="No past activities"
                    subtitle="Your completed sessions will appear here."
                  />
                )}
              </TabsContent>

              {/* ── Cancelled ── */}
              <TabsContent value="cancelled" className="p-6 space-y-5 mt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-500">
                    {filteredCancelled.length} activit{filteredCancelled.length !== 1 ? 'ies' : 'y'} shown
                  </p>
                  <RoleFilterPills value={cancelledFilter} onChange={setCancelledFilter} counts={cancelledCounts} />
                </div>
                {filteredCancelled.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCancelled.map((activity) => renderActivityCard(activity, false))}
                  </div>
                ) : (
                  <EmptyState
                    icon={XCircle}
                    title="No cancelled activities"
                    subtitle="Any cancelled sessions will appear here."
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>

      {/* ── Cancel Confirmation Modal ── */}
      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent className="max-w-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">
              Cancel Activity?
            </DialogTitle>
          </DialogHeader>

          {activityToCancel && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Are you sure you want to cancel this activity?
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <p className="font-semibold text-slate-800">
                  {capitalizeWords(activityToCancel.sport)}
                </p>
                <p className="text-slate-500">
                  {(activityToCancel.localDateObj || new Date(activityToCancel.date)).toLocaleDateString()} ·{' '}
                  {activityToCancel.localFromTime || activityToCancel.fromTime} –{' '}
                  {activityToCancel.localToTime || activityToCancel.toTime}
                </p>
                <p className="text-slate-500">
                  {capitalizeWords(activityToCancel.location) ||
                    capitalizeWords(activityToCancel.address)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenCancel(false)}>
              Keep Activity
            </Button>
            <Button variant="destructive" onClick={confirmCancelActivity}>
              Cancel Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Activity Chat Room ── */}
      <Dialog
        open={openChat}
        onOpenChange={(nextOpen) => (!nextOpen ? closeChatRoom() : setOpenChat(true))}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              {selectedChatActivity
                ? `${capitalizeWords(selectedChatActivity.sport)} Chat Room`
                : 'Chat Room'}
            </DialogTitle>
            <p className="text-xs text-slate-500 text-left">{chatParticipants.length} participants</p>
          </DialogHeader>

          <div className="px-6 py-4 space-y-3">
            {!!chatParticipants.length && (
              <div className="flex flex-wrap gap-2">
                {chatParticipants.map((participant) => (
                  <Badge
                    key={`${participant.id?.content}-${participant.name}`}
                    variant="outline"
                    className="border-blue-200 text-blue-700 bg-blue-50"
                  >
                    {participant.name}
                    {participant.isHost ? ' (Host)' : ''}
                  </Badge>
                ))}
              </div>
            )}

            <div
              ref={chatScrollRef}
              className="h-[360px] overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3"
            >
              {!chatMessages.length && (
                <p className="text-sm text-muted-foreground text-center mt-10">
                  Start the conversation with your players.
                </p>
              )}

              {chatMessages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${message.isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border'
                      }`}
                  >
                    {!message.isOwnMessage && (
                      <p className="text-xs font-semibold mb-1">{message.sender?.name}</p>
                    )}
                    {message.message && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                    )}
                    {message.attachment?.url && (
                      <a
                        href={resolveMediaUrl(message.attachment.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-2"
                      >
                        <img
                          src={resolveMediaUrl(message.attachment.url)}
                          alt={message.attachment.fileName || 'Shared image'}
                          className="rounded-lg max-h-56 w-auto object-cover"
                        />
                      </a>
                    )}
                    <p className="text-[10px] opacity-70 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {!!typingUsers.length && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border bg-background px-3 py-2 inline-flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {typingUsers.map((user) => user.name).join(', ')} typing
                    </span>
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {pendingAttachment?.url && (
              <div className="rounded-lg border p-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={resolveMediaUrl(pendingAttachment.url)}
                    alt={pendingAttachment.fileName}
                    className="h-14 w-14 rounded object-cover"
                  />
                  <p className="text-xs text-muted-foreground truncate">{pendingAttachment.fileName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPendingAttachment(null)}>
                  Remove
                </Button>
              </div>
            )}

            <div className="relative space-y-2">
              {showEmojiPicker && (
                <div className="absolute bottom-[56px] left-0 z-30">
                  <EmojiPicker
                    lazyLoadEmojis
                    onEmojiClick={(emoji: EmojiClickData) => {
                      const nextText = `${chatInput}${emoji.emoji}`;
                      setChatInput(nextText);
                      triggerTypingSignal(nextText);
                    }}
                  />
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    value={chatInput}
                    onChange={(event) => {
                      setChatInput(event.target.value);
                      triggerTypingSignal(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    placeholder="Type a message..."
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadChatImage(file);
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={sendChatMessage}
                  disabled={isSendingMessage || (!chatInput.trim() && !pendingAttachment)}
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ActivityParticipantsDialog
        open={showParticipantsDialog}
        onOpenChange={setShowParticipantsDialog}
        activityId={selectedParticipantsActivity?._id}
        activityTitle={capitalizeWords(selectedParticipantsActivity?.sport || 'Activity')}
        onViewProfile={handleViewParticipantProfile}
      />
    </div>
  );
}
