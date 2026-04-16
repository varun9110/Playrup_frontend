import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
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
} from 'lucide-react';
import { utcDateTimeToLocalParts } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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
  joinedPlayers?: unknown[];
  skillLevel?: string;
  host: {
    id: { content: string };
    name: string;
  };
};

type ChatParticipant = {
  id: { content: string };
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
    id: { content: string };
    name: string;
  };
  createdAt: string;
  isOwnMessage: boolean;
  isReadByCurrentUser: boolean;
};

type TypingUser = {
  id: { content: string };
  name: string;
};

export default function MyHostedActivities() {
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [pastActivities, setPastActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityToCancel, setActivityToCancel] = useState<Activity | null>(null);
  const [openCancel, setOpenCancel] = useState(false);

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

  const userEmail = JSON.parse(localStorage.getItem('user'))?.email;
  const userId = JSON.parse(localStorage.getItem("user"))?.userId;
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, ''),
    []
  );

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

      res.data.activitiesWithEncryptedData.forEach((activity: Activity) => {
        const localStart = utcDateTimeToLocalParts(activity.date, activity.fromTime);
        const localEnd = utcDateTimeToLocalParts(activity.date, activity.toTime);
        const normalizedActivity = {
          ...activity,
          localDate: localStart?.date || activity.date,
          localDateObj: localStart?.dateObj,
          localFromTime: localStart?.time || activity.fromTime,
          localToTime: localEnd?.time || activity.toTime,
        };

        const activityEndDateTime = localEnd?.dateObj || localStart?.dateObj;
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

      setUpcomingActivities(upcoming);
      setPastActivities(past);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };


  const capitalizeWords = (str) =>
    str ? str.replace(/\b\w/g, (char) => char.toUpperCase()) : '';

  const handleEditActivity = (activity: Activity) => console.log('Edit activity', activity);

  const openCancelModal = (activity: Activity) => {
    setActivityToCancel(activity);
    setOpenCancel(true);
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

  const renderActivityCard = (activity: Activity, showChatButton = false) => (
    <Card key={activity._id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{capitalizeWords(activity.sport)}</CardTitle>
            <CardDescription className="mt-1">
              Hosted by {activity.host.name}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{capitalizeWords(activity.city)}</Badge>

            {activity.host.id.content === userId.content && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
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

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {(activity.localDateObj || new Date(activity.date)).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
            <span>
              {activity.localFromTime || activity.fromTime} - {activity.localToTime || activity.toTime}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {capitalizeWords(activity.location) || capitalizeWords(activity.address)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {activity.joinedPlayers?.length || 0}/{activity.maxPlayers} players
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-2">
              {activity.skillLevel ? capitalizeWords(activity.skillLevel) : 'Any'}
            </Badge>
            <span className="text-muted-foreground text-xs">Skill Level</span>
          </div>
        </div>

        {showChatButton && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openChatRoom(activity)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat with Players
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <p className="text-center mt-10">Loading activities...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Hosted Activities</h1>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upcoming">All Upcoming Activities</TabsTrigger>
            <TabsTrigger value="myactivities">My Hosted Activities</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="past">Past Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingActivities.length
              ? upcomingActivities.map((activity) => renderActivityCard(activity, true))
              : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No upcoming activities yet</p>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastActivities.length
              ? pastActivities.map((activity) => renderActivityCard(activity))
              : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No past activities yet</p>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>
      </div>

      
      {/* ================= CANCEL CONFIRMATION MODAL ================= */}
      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent className="max-w-md">
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

              <div className="rounded-lg border p-3 space-y-1">
                <p className="font-semibold">
                  {capitalizeWords(activityToCancel.sport)}
                </p>
                <p>
                  {(activityToCancel.localDateObj || new Date(activityToCancel.date)).toLocaleDateString()} ·{' '}
                  {activityToCancel.localFromTime || activityToCancel.fromTime} - {activityToCancel.localToTime || activityToCancel.toTime}
                </p>
                <p>
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

      {/* ================= ACTIVITY CHAT ROOM ================= */}
      <Dialog open={openChat} onOpenChange={(nextOpen) => (!nextOpen ? closeChatRoom() : setOpenChat(true))}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageCircle className="h-5 w-5" />
              {selectedChatActivity ? `${capitalizeWords(selectedChatActivity.sport)} Chat Room` : 'Chat Room'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground text-left">
              {chatParticipants.length} participants
            </p>
          </DialogHeader>

          <div className="px-6 py-4 space-y-3">
            {!!chatParticipants.length && (
              <div className="flex flex-wrap gap-2">
                {chatParticipants.map((participant) => (
                  <Badge key={`${participant.id?.content}-${participant.name}`} variant="outline">
                    {participant.name}{participant.isHost ? ' (Host)' : ''}
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
                    className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                      message.isOwnMessage
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
                        minute: '2-digit'
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
                    if (file) {
                      uploadChatImage(file);
                    }
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
    </div>
  );
}

