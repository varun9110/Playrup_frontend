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

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface PublicDropIn {
  id: string;
  shareCode: string;
  sport: string;
  title: string;
  description: string;
  skillLevel: string;
  date: string;
  startTime: string;
  endTime: string;
  courtNumber: number;
  pricePerParticipant: number;
  maxParticipants: number;
  slotsRemaining: number;
  academy: AcademyInfo | null;
  participants: Participant[];
  hasRequested: boolean;
  hasJoined: boolean;
  status: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicDropInShare() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dropIn, setDropIn] = useState<PublicDropIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const shareLink = useMemo(() => window.location.href, []);

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const hasToken = Boolean(localStorage.getItem('token'));

  // Load drop-in details
  useEffect(() => {
    const load = async () => {
      if (!shareCode) return;
      try {
        const res = await axios.get(`/api/dropin/share/${shareCode}`);
        setDropIn(res.data?.dropIn ?? null);
      } catch (err) {
        console.error('Failed to load drop-in', err);
        setDropIn(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shareCode]);

  // Join handler
  const handleJoin = async () => {
    if (!dropIn) return;

    if (!hasToken || !storedUser) {
      window.location.assign('/login');
      return;
    }

    if (dropIn.hasRequested || dropIn.hasJoined) return;

    setJoining(true);
    try {
      const res = await axios.post(`/api/dropin/${dropIn.id}/request-join`);
      toast({ title: res.data?.message ?? 'Join request sent!' });
      setDropIn(prev => prev ? { ...prev, hasRequested: true } : prev);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? 'Failed to join', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Link copied!' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  // Join button state
  const isJoined = hasToken && dropIn?.hasJoined;
  const isRequested = hasToken && dropIn?.hasRequested;
  const isFull = dropIn ? dropIn.slotsRemaining <= 0 : false;
  const isDisabled = joining || dropIn?.status !== 'Active' || !!isJoined || !!isRequested || isFull;
  const joinLabel = joining
    ? 'Joining…'
    : isJoined
      ? 'Already Joined'
      : isRequested
        ? 'Request Sent'
        : isFull
          ? 'Session Full'
          : 'Request to Join';

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-slate-200">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b py-4 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Drop-In Session
              </CardTitle>
              <CardDescription>Fetching session details…</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center text-slate-500">Loading…</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!dropIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="border-slate-200">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b py-4 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Drop-In Session
              </CardTitle>
              <CardDescription>This share link is no longer available.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center space-y-4">
              <p className="text-slate-700 font-medium">This link is not valid or the session has been cancelled.</p>
              <Button onClick={() => navigate('/login')}>Go To Login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Card className="overflow-hidden border-slate-200 shadow-sm">

          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b py-5 px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-800">
                  {dropIn.title || capitalizeWords(dropIn.sport)}
                </CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1.5">
                  {dropIn.academy && (
                    <>
                      <MapPin className="h-3.5 w-3.5" />
                      {capitalizeWords(dropIn.academy.name)}
                      {dropIn.academy.city && ` · ${capitalizeWords(dropIn.academy.city)}`}
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${dropIn.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} hover:bg-inherit`}>
                  {dropIn.status}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">

            {/* Key details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium">{dropIn.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium">{dropIn.startTime} – {dropIn.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Slots</p>
                  <p className="font-medium">{dropIn.slotsRemaining} / {dropIn.maxParticipants} available</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Sport</p>
                <p className="font-medium">{capitalizeWords(dropIn.sport)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Court</p>
                <p className="font-medium">Court {dropIn.courtNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Skill Level</p>
                <p className="font-medium">{dropIn.skillLevel || 'All levels welcome'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Entry Fee</p>
                <p className="font-medium">{dropIn.pricePerParticipant > 0 ? `₹${dropIn.pricePerParticipant} / person` : 'Free'}</p>
              </div>
            </div>

            {/* Description */}
            {dropIn.description && (
              <div>
                <p className="text-xs text-slate-500 mb-1">About</p>
                <p className="text-sm text-slate-700">{dropIn.description}</p>
              </div>
            )}

            {/* Participants */}
            {dropIn.participants.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-3">Joined Participants ({dropIn.participants.length})</p>
                <div className="flex flex-wrap gap-2">
                  {dropIn.participants.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1 border text-sm">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-800">
                          {p.name?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{capitalizeWords(p.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className={`flex-1 ${isDisabled ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                disabled={isDisabled}
                onClick={handleJoin}
              >
                {joinLabel}
              </Button>
              <Button variant="outline" onClick={handleCopyLink} className="shrink-0">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>

            {!hasToken && (
              <p className="text-xs text-slate-500 text-center">
                <button onClick={() => navigate('/login')} className="text-emerald-600 underline font-medium">Log in</button> to send a join request.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
