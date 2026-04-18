import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '@/lib/axiosConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Copy, MapPin, Share2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { capitalizeWords } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
}

interface AcademyInfo {
  _id: string;
  name: string;
  address?: string;
  city?: string;
}

interface PublicCoaching {
  id: string;
  shareCode: string;
  sport: string;
  title: string;
  description: string;
  skillLevel: string;
  coachName?: string;
  coachBio?: string;
  coachContact?: string;
  date: string;
  startTime: string;
  endTime: string;
  courtNumber: number;
  pricePerParticipant: number;
  academy: AcademyInfo | null;
  participants: Participant[];
  hasRequested: boolean;
  hasJoined: boolean;
  status: string;
}

export default function PublicCoachingShare() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [coaching, setCoaching] = useState<PublicCoaching | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const shareLink = useMemo(() => window.location.href, []);
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const hasToken = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    const load = async () => {
      if (!shareCode) return;
      try {
        const res = await axios.get(`/api/coaching/share/${shareCode}`);
        setCoaching(res.data?.coaching || null);
      } catch (error) {
        console.error('Failed to load coaching share', error);
        setCoaching(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [shareCode]);

  const handleJoin = async () => {
    if (!coaching) return;
    if (!hasToken || !user) {
      window.location.assign('/login');
      return;
    }

    if (coaching.hasRequested || coaching.hasJoined) return;

    setJoining(true);
    try {
      const res = await axios.post(`/api/coaching/${coaching.id}/request-join`);
      toast({ title: res.data?.message || 'Join request sent' });
      setCoaching((prev) => prev ? { ...prev, hasRequested: true } : prev);
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Failed to request join', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Link copied' });
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-slate-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
              <CardTitle>Coaching Class</CardTitle>
              <CardDescription>Loading details...</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center text-slate-500">Loading...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!coaching) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-slate-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
              <CardTitle>Coaching Class</CardTitle>
              <CardDescription>This share link is no longer available.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center space-y-3">
              <p className="text-slate-700">This class may have been cancelled or the link is invalid.</p>
              <Button onClick={() => navigate('/login')}>Go To Login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isDisabled = joining || coaching.status !== 'Active' || coaching.hasRequested || coaching.hasJoined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{coaching.title || capitalizeWords(coaching.sport)}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1.5">
                  {coaching.academy && (
                    <>
                      <MapPin className="h-3.5 w-3.5" />
                      {capitalizeWords(coaching.academy.name)}
                      {coaching.academy.city ? ` · ${capitalizeWords(coaching.academy.city)}` : ''}
                    </>
                  )}
                </CardDescription>
              </div>
              <Badge className={`${coaching.status === 'Active' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'} hover:bg-inherit`}>
                {coaching.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium">{coaching.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium">{coaching.startTime} - {coaching.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs text-slate-500">Joined</p>
                  <p className="font-medium">{coaching.participants.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Sport</p>
                <p className="font-medium">{capitalizeWords(coaching.sport)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Court</p>
                <p className="font-medium">Court {coaching.courtNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Skill Level</p>
                <p className="font-medium">{coaching.skillLevel || 'Any'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Fee</p>
                <p className="font-medium">{coaching.pricePerParticipant > 0 ? `₹${coaching.pricePerParticipant} / participant` : 'Free'}</p>
              </div>
            </div>

            {(coaching.coachName || coaching.coachBio || coaching.coachContact) && (
              <div className="rounded-lg border p-3 bg-slate-50 text-sm">
                <p className="font-semibold text-slate-900 mb-1">Coach</p>
                {coaching.coachName && <p><strong>Name:</strong> {coaching.coachName}</p>}
                {coaching.coachContact && <p><strong>Contact:</strong> {coaching.coachContact}</p>}
                {coaching.coachBio && <p className="mt-1 text-slate-600">{coaching.coachBio}</p>}
              </div>
            )}

            {coaching.description && (
              <div>
                <p className="text-xs text-slate-500 mb-1">About Class</p>
                <p className="text-sm text-slate-700">{coaching.description}</p>
              </div>
            )}

            {coaching.participants.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Participants ({coaching.participants.length})</p>
                <div className="flex flex-wrap gap-2">
                  {coaching.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1 border text-sm">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-800">
                          {participant.name?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{capitalizeWords(participant.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button className={`flex-1 ${isDisabled ? '' : 'bg-amber-600 hover:bg-amber-700 text-white'}`} disabled={isDisabled} onClick={handleJoin}>
                {joining ? 'Joining...' : coaching.hasJoined ? 'Already Joined' : coaching.hasRequested ? 'Request Sent' : 'Request to Join'}
              </Button>
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>

            {!hasToken && (
              <p className="text-xs text-slate-500 text-center">
                <button onClick={() => navigate('/login')} className="text-amber-700 underline font-medium">Log in</button> to request joining this coaching class.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
