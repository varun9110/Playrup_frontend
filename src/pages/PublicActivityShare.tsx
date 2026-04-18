import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Copy, MapPin, MessageCircle, Share2, Users, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords, utcDateTimeToLocalParts } from '@/lib/utils';

type EncryptedValue = {
  iv: string;
  content: string;
  tag: string;
};

type PublicParticipant = {
  id: EncryptedValue | string;
  name: string;
  avatarUrl?: string | null;
  isHost: boolean;
};

type PublicActivity = {
  id: string;
  shareCode: string;
  name: string;
  description: string;
  sport: string;
  city?: string;
  location?: string;
  address?: string;
  date: string;
  fromTime: string;
  toTime: string;
  status: string;
  maxPlayers: number;
  slotsRemaining: number;
  participants: PublicParticipant[];
  hasRequested?: boolean;
  hasJoined?: boolean;
};

export default function PublicActivityShare() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activity, setActivity] = useState<PublicActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const shareLink = useMemo(() => window.location.href, []);
  const safeCapitalize = (value?: string) => (value ? capitalizeWords(value) : '');
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const viewerUserId = storedUser?.userId;
  const hasToken = Boolean(localStorage.getItem('token'));
  const getParticipantProfilePath = (participantId: EncryptedValue | string) => {
    const encodedUserToken = encodeURIComponent(JSON.stringify(participantId));
    return hasToken
      ? `/participant-profile/${encodedUserToken}`
      : `/public/profile/${encodedUserToken}`;
  };

  useEffect(() => {
    const loadActivity = async () => {
      if (!shareCode) return;

      try {
        const viewerQuery = viewerUserId ? `?userId=${encodeURIComponent(JSON.stringify(viewerUserId))}` : '';
        const response = await axios.get(`/api/public/activity/${shareCode}${viewerQuery}`);
        setActivity(response.data?.activity || null);
      } catch (error) {
        console.error('Failed to load shared activity', error);
        setActivity(null);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [shareCode, viewerUserId]);

  const localStart = useMemo(
    () => utcDateTimeToLocalParts(activity?.date, activity?.fromTime),
    [activity?.date, activity?.fromTime]
  );
  const localEnd = useMemo(
    () => utcDateTimeToLocalParts(activity?.date, activity?.toTime),
    [activity?.date, activity?.toTime]
  );

  const handleJoin = async () => {
    if (!activity) return;

    const token = localStorage.getItem('token');
    const latestStoredUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !latestStoredUser?.email || !latestStoredUser?.userId) {
      window.location.assign('/login');
      return;
    }

    if (activity.hasRequested || activity.hasJoined) {
      return;
    }

    setJoining(true);
    try {
      const response = await axios.post('/api/activity/requestJoin', {
        activityId: activity.id,
        userEmail: latestStoredUser.email,
        userId: latestStoredUser.userId,
      });

      toast({ title: response.data?.message || 'Join request sent successfully' });
      setActivity((prev) => (prev ? { ...prev, hasRequested: true } : prev));
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Failed to join activity',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Share Link Copied' });
    } catch (error) {
      console.error('Failed to copy link', error);
      toast({ title: 'Unable to copy link', variant: 'destructive' });
    }
  };

  const isAlreadyRequested = Boolean(hasToken && activity?.hasRequested);
  const isAlreadyJoined = Boolean(hasToken && activity?.hasJoined);
  const isJoinDisabled = joining || activity?.status !== 'Active' || isAlreadyRequested || isAlreadyJoined;
  const joinButtonLabel = joining
    ? 'Joining...'
    : isAlreadyJoined
      ? 'Already Joined'
      : isAlreadyRequested
        ? 'Request Sent'
        : 'Join Activity';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="max-w-3xl mx-auto w-full">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Shared Activity
                </CardTitle>
                <CardDescription className="mt-0.5">Fetching activity details...</CardDescription>
              </CardHeader>
              <CardContent className="p-10 text-center text-slate-500">Loading Shared Activity...</CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="max-w-3xl mx-auto w-full">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  Shared Activity
                </CardTitle>
                <CardDescription className="mt-0.5">This share link is no longer available.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 text-center space-y-4">
                <p className="text-slate-700 font-medium">This Share Link Is Not Valid Anymore.</p>
                <Button onClick={() => navigate('/login')}>Go To Login</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
              {safeCapitalize(activity.name || activity.sport)}
            </h1>
            <p className="text-slate-600 text-lg">
              {safeCapitalize(activity.description) || 'Join this activity and play with the community.'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button className="rounded-lg h-11" onClick={handleJoin} disabled={isJoinDisabled}>
              <Zap className="h-4 w-4 mr-2" />
              {joinButtonLabel}
            </Button>
            <Button variant="outline" className="rounded-lg h-11" onClick={handleCopyShareLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-blue-600" />
                Activity Details
              </CardTitle>
              <CardDescription className="mt-0.5">
                Review schedule, location and availability before joining.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>{localStart?.date || activity.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>{localStart?.time || activity.fromTime} - {localEnd?.time || activity.toTime}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>{safeCapitalize(activity.location || activity.address || activity.city || 'Location')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>{activity.slotsRemaining} of {activity.maxPlayers} slots left</span>
                </div>
                <Badge variant={activity.status === 'Active' ? 'default' : 'secondary'}>
                  {safeCapitalize(activity.status)}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="sm:w-auto"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join this activity: ${shareLink}`)}`, '_blank')}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="sm:w-auto"
                  onClick={() => window.open(`sms:?&body=${encodeURIComponent(`Join this activity: ${shareLink}`)}`, '_blank')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  SMS
                </Button>
              </div>

              <div className="pt-1 flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareLink)}`}
                  alt="Activity QR code"
                  className="rounded-lg border"
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-blue-600" />
                Participants
              </CardTitle>
              <CardDescription className="mt-0.5">
                View players currently in this activity.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activity.participants.map((participant) => (
                  <button
                    key={`${typeof participant.id === 'string' ? participant.id : participant.id.content}-${participant.name}`}
                    type="button"
                    onClick={() => navigate(getParticipantProfilePath(participant.id))}
                    className="flex items-center gap-3 rounded-lg border p-3 text-left hover:border-blue-300 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={participant.avatarUrl || undefined} alt={participant.name} />
                      <AvatarFallback>
                        {(participant.name || 'P')
                          .split(' ')
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{safeCapitalize(participant.name)}</p>
                      {participant.isHost && <p className="text-xs text-slate-500">Host</p>}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
