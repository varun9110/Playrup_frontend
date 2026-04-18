import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { addDays, format, subDays } from 'date-fns';
import { Navbar } from '@/components/layout';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Copy,
  PlusCircle,
  RefreshCw,
  Settings,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { capitalizeWords } from '@/lib/utils';

interface Sport {
  sportName: string;
  numberOfCourts: number;
  startTime?: string;
  endTime?: string;
}

interface Academy {
  _id: string;
  name: string;
  sports: Sport[];
}

interface Participant {
  _id: string;
  name: string;
  email?: string;
}

interface Coaching {
  _id: string;
  sport: string;
  courtNumber: number;
  title: string;
  description?: string;
  skillLevel?: string;
  coachName?: string;
  coachBio?: string;
  coachContact?: string;
  date: string;
  startTime: string;
  endTime: string;
  pricePerParticipant: number;
  recurrenceType: 'none' | 'daily' | 'weekly';
  recurrenceDays: number[];
  recurrenceUntil: string | null;
  seriesId: string | null;
  joinedParticipants: Participant[];
  pendingRequests: Participant[];
  shareCode?: string;
}

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const SKILL_LEVELS = ['Beginner', 'Amateur', 'Intermediate', 'Advanced', 'Professional'];

export default function AcademyCoaching() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const [coachingSessions, setCoachingSessions] = useState<Coaching[]>([]);
  const [selectedCoaching, setSelectedCoaching] = useState<Coaching | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [form, setForm] = useState({
    courtNumber: '',
    title: '',
    description: '',
    skillLevel: '',
    coachName: '',
    coachBio: '',
    coachContact: '',
    startTime: '',
    endTime: '',
    pricePerParticipant: '0',
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly',
    recurrenceDays: [] as number[],
    recurrenceUntil: '',
  });

  const selectedAcademy = academies.find((a) => a._id === selectedAcademyId);
  const sports = selectedAcademy?.sports || [];
  const selectedSportConfig = sports.find((s) => s.sportName === selectedSport);
  const courts = selectedSportConfig
    ? Array.from({ length: selectedSportConfig.numberOfCourts }, (_v, i) => i + 1)
    : [];

  const fetchCoaching = async (baseDate: Date = selectedDate) => {
    if (!selectedAcademyId) return;
    try {
      const startDate = format(subDays(baseDate, 1), 'yyyy-MM-dd');
      const endDate = format(addDays(baseDate, 1), 'yyyy-MM-dd');
      const res = await axios.get(`/api/coaching/academy/${selectedAcademyId}`, {
        params: {
          startDate,
          endDate,
          sport: selectedSport || undefined,
        },
      });
      setCoachingSessions(res.data?.coachingSessions || []);
    } catch (error) {
      console.error('Failed to fetch coaching sessions', error);
      setCoachingSessions([]);
    }
  };

  useEffect(() => {
    if (!user?.userId) return;

    axios.post('/api/academy/user-academies', { userId: user.userId })
      .then((res) => {
        const list = res.data?.data || [];
        setAcademies(list);
        if (list.length > 0) {
          setSelectedAcademyId(list[0]._id);
          if (list[0].sports?.length > 0) {
            setSelectedSport(list[0].sports[0].sportName);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load academies', error);
      });
  }, [user?.userId]);

  useEffect(() => {
    const academy = academies.find((a) => a._id === selectedAcademyId);
    if (!academy) return;
    if (!academy.sports.some((s) => s.sportName === selectedSport)) {
      setSelectedSport(academy.sports?.[0]?.sportName || '');
    }
  }, [academies, selectedAcademyId, selectedSport]);

  useEffect(() => {
    void fetchCoaching();
  }, [selectedAcademyId, selectedSport, selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCoaching();
    setRefreshing(false);
  };

  const goToToday = async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    setSelectedDate(today);
    setRefreshing(true);
    await fetchCoaching(today);
    setRefreshing(false);
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const resetForm = () => {
    setForm({
      courtNumber: '',
      title: '',
      description: '',
      skillLevel: '',
      coachName: '',
      coachBio: '',
      coachContact: '',
      startTime: '',
      endTime: '',
      pricePerParticipant: '0',
      recurrenceType: 'none',
      recurrenceDays: [],
      recurrenceUntil: '',
    });
  };

  const handleCreate = async () => {
    if (!selectedAcademyId || !selectedSport || !form.courtNumber || !form.startTime || !form.endTime) {
      toast({ title: 'Please fill academy, sport, court and timeslot fields', variant: 'destructive' });
      return;
    }

    if (form.recurrenceType === 'weekly' && form.recurrenceDays.length === 0) {
      toast({ title: 'Select recurrence days for weekly coaching', variant: 'destructive' });
      return;
    }

    if (form.recurrenceType !== 'none' && !form.recurrenceUntil) {
      toast({ title: 'Select recurrence end date', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const payload: any = {
        academyId: selectedAcademyId,
        sport: selectedSport,
        courtNumber: Number(form.courtNumber),
        title: form.title,
        description: form.description,
        skillLevel: form.skillLevel,
        coachName: form.coachName,
        coachBio: form.coachBio,
        coachContact: form.coachContact,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: form.startTime,
        endTime: form.endTime,
        pricePerParticipant: Number(form.pricePerParticipant || '0'),
        recurrenceType: form.recurrenceType,
      };

      if (form.recurrenceType === 'weekly') payload.recurrenceDays = form.recurrenceDays;
      if (form.recurrenceType !== 'none') payload.recurrenceUntil = form.recurrenceUntil;

      const res = await axios.post('/api/coaching/create', payload);
      toast({ title: res.data?.message || 'Coaching classes created' });
      setCreateOpen(false);
      resetForm();
      await fetchCoaching();
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Failed to create coaching classes', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const openCoachingDetails = async (coachingId: string) => {
    try {
      const [detailRes, shareRes] = await Promise.all([
        axios.get(`/api/coaching/${coachingId}`),
        axios.get(`/api/coaching/${coachingId}/share-link`),
      ]);

      setSelectedCoaching(detailRes.data?.coaching || null);
      const code = shareRes.data?.shareCode;
      setShareUrl(code ? `${window.location.origin}/coaching/share/${code}` : '');
    } catch (error) {
      console.error('Failed to load coaching details', error);
      toast({ title: 'Failed to load coaching details', variant: 'destructive' });
    }
  };

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Share link copied' });
    } catch {
      toast({ title: 'Failed to copy share link', variant: 'destructive' });
    }
  };

  const refreshSelectedCoaching = async (coachingId: string) => {
    try {
      const res = await axios.get(`/api/coaching/${coachingId}`);
      setSelectedCoaching(res.data?.coaching || null);
      await fetchCoaching();
    } catch (error) {
      console.error('Failed to refresh coaching details', error);
    }
  };

  const handleApprove = async (participantId: string) => {
    if (!selectedCoaching) return;
    try {
      const res = await axios.post(`/api/coaching/${selectedCoaching._id}/approve/${participantId}`);
      toast({ title: res.data?.message || 'Participant approved' });
      await refreshSelectedCoaching(selectedCoaching._id);
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Failed to approve participant', variant: 'destructive' });
    }
  };

  const handleRejectOrRemove = async (participantId: string) => {
    if (!selectedCoaching) return;
    try {
      const res = await axios.post(`/api/coaching/${selectedCoaching._id}/reject/${participantId}`);
      toast({ title: res.data?.message || 'Participant updated' });
      await refreshSelectedCoaching(selectedCoaching._id);
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Failed to update participant', variant: 'destructive' });
    }
  };

  const cancelSingle = async () => {
    if (!selectedCoaching) return;
    try {
      const res = await axios.delete(`/api/coaching/${selectedCoaching._id}`);
      toast({ title: res.data?.message || 'Coaching class cancelled' });
      setSelectedCoaching(null);
      await fetchCoaching();
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Failed to cancel coaching class', variant: 'destructive' });
    }
  };

  const cancelSeries = async () => {
    if (!selectedCoaching?.seriesId) return;
    try {
      const res = await axios.delete(`/api/coaching/series/${selectedCoaching.seriesId}/from/${selectedCoaching.date}`);
      toast({ title: res.data?.message || 'Future coaching classes cancelled' });
      setSelectedCoaching(null);
      await fetchCoaching();
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Failed to cancel coaching series', variant: 'destructive' });
    }
  };

  const coachingForDay = coachingSessions.filter((session) => session.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-12 max-w-[96vw] 2xl:max-w-[1700px]">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Coaching Sessions</h1>
            <p className="text-slate-500 text-lg">Create and manage coaching classes with recurring schedules and participant approvals.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/academy-dashboard">
                <Building2 className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-amber-100"><Calendar className="h-5 w-5 text-amber-700" /></div>
              <div>
                <p className="text-xs text-slate-500">Classes Today</p>
                <p className="text-2xl font-bold text-slate-800">{coachingForDay.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Joined Today</p>
                <p className="text-2xl font-bold text-slate-800">
                  {coachingForDay.reduce((sum, session) => sum + (session.joinedParticipants?.length ?? 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-red-100"><Clock className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Pending Requests</p>
                <p className="text-2xl font-bold text-slate-800">
                  {coachingForDay.reduce((sum, session) => sum + (session.pendingRequests?.length ?? 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-slate-800">Session List</CardTitle>
                <CardDescription>Select academy, sport, and date to manage coaching classes.</CardDescription>
              </div>
            </div>

            {academies.length > 1 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Academy</p>
                <Tabs value={selectedAcademyId} onValueChange={setSelectedAcademyId}>
                  <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                    {academies.map((academy) => (
                      <TabsTrigger
                        key={academy._id}
                        value={academy._id}
                        className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
                      >
                        {capitalizeWords(academy.name)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {sports.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Sport</p>
                <Tabs value={selectedSport} onValueChange={setSelectedSport}>
                  <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                    {sports.map((sport) => (
                      <TabsTrigger
                        key={sport.sportName}
                        value={sport.sportName}
                        className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
                      >
                        {capitalizeWords(sport.sportName)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <div
                className="relative h-10 min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm cursor-pointer"
                onClick={openDatePicker}
              >
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-800">
                  {format(selectedDate, 'yyyy-MM-dd')}
                </span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const [y, m, d] = (e.target.value || '').split('-').map(Number);
                    if (y && m && d) setSelectedDate(new Date(y, m - 1, d, 12));
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                <PlusCircle className="h-4 w-4 mr-1" />
                New Coaching
              </Button>
              <Button size="sm" onClick={onRefresh} disabled={refreshing} className="bg-blue-600 text-white hover:bg-blue-700">
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            {coachingForDay.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No coaching classes on this day.</p>
                <p className="text-sm mt-1">
                  Click{' '}
                  <button
                    type="button"
                    className="font-semibold text-amber-600 hover:text-amber-700"
                    onClick={() => setCreateOpen(true)}
                  >
                    New Coaching
                  </button>{' '}
                  to create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coachingForDay.map((session) => (
                  <motion.div key={session._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card
                      className="border-amber-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        void openCoachingDetails(session._id);
                      }}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Coaching</Badge>
                          {session.recurrenceType !== 'none' && (
                            <Badge variant="outline" className="capitalize">{session.recurrenceType}</Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800 truncate">
                            {session.title || capitalizeWords(session.sport)}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">Court {session.courtNumber} · {capitalizeWords(session.sport)}</p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {session.startTime} - {session.endTime}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Users className="h-4 w-4 text-slate-400" />
                            {session.joinedParticipants?.length || 0} joined
                          </div>
                          <span className="font-semibold text-amber-700">
                            {session.pricePerParticipant > 0 ? `₹${session.pricePerParticipant}` : 'Free'}
                          </span>
                        </div>

                        {(session.pendingRequests?.length || 0) > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            {session.pendingRequests.length} pending approval
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coaching Class</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Court</Label>
              <select
                className="w-full rounded-md border border-input bg-background h-10 px-3"
                value={form.courtNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, courtNumber: e.target.value }))}
              >
                <option value="">Select court</option>
                {courts.map((court) => <option key={court} value={String(court)}>Court {court}</option>)}
              </select>
            </div>
            <div>
              <Label>Skill Level</Label>
              <select
                className="w-full rounded-md border border-input bg-background h-10 px-3"
                value={form.skillLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, skillLevel: e.target.value }))}
              >
                <option value="">Any</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} />
            </div>
            <div>
              <Label>Price / Participant</Label>
              <Input type="number" min="0" step="0.01" value={form.pricePerParticipant} onChange={(e) => setForm((prev) => ({ ...prev, pricePerParticipant: e.target.value }))} />
            </div>
            <div>
              <Label>Recurrence Type</Label>
              <select
                className="w-full rounded-md border border-input bg-background h-10 px-3"
                value={form.recurrenceType}
                onChange={(e) => setForm((prev) => ({ ...prev, recurrenceType: e.target.value as 'none' | 'daily' | 'weekly' }))}
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 mt-2">
            <div>
              <Label>Class Title</Label>
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Morning Advanced Drills" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Structure, focus points, and class expectations" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Coach Details (Optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Coach Name</Label>
                <Input value={form.coachName} onChange={(e) => setForm((prev) => ({ ...prev, coachName: e.target.value }))} placeholder="Coach Arjun" />
              </div>
              <div>
                <Label>Coach Contact</Label>
                <Input value={form.coachContact} onChange={(e) => setForm((prev) => ({ ...prev, coachContact: e.target.value }))} placeholder="+1 555-0102" />
              </div>
            </div>
            <div>
              <Label>Coach Bio</Label>
              <Textarea value={form.coachBio} onChange={(e) => setForm((prev) => ({ ...prev, coachBio: e.target.value }))} placeholder="Certifications, years of experience, and style" />
            </div>
          </div>

          {form.recurrenceType === 'weekly' && (
            <div>
              <Label>Repeat On</Label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((day) => {
                  const selected = form.recurrenceDays.includes(day.value);
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          recurrenceDays: selected
                            ? prev.recurrenceDays.filter((d) => d !== day.value)
                            : [...prev.recurrenceDays, day.value],
                        }));
                      }}
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {form.recurrenceType !== 'none' && (
            <div>
              <Label>Repeat Until</Label>
              <Input type="date" value={form.recurrenceUntil} onChange={(e) => setForm((prev) => ({ ...prev, recurrenceUntil: e.target.value }))} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={creating} onClick={handleCreate}>
              {creating ? 'Creating...' : 'Create Coaching'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCoaching} onOpenChange={(open) => { if (!open) { setSelectedCoaching(null); setShareUrl(''); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCoaching?.title || 'Coaching Details'}</DialogTitle>
          </DialogHeader>

          {selectedCoaching && (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Sport:</strong> {capitalizeWords(selectedCoaching.sport)}</div>
                <div><strong>Court:</strong> {selectedCoaching.courtNumber}</div>
                <div><strong>Date:</strong> {selectedCoaching.date}</div>
                <div><strong>Time:</strong> {selectedCoaching.startTime} - {selectedCoaching.endTime}</div>
                <div><strong>Fee:</strong> {selectedCoaching.pricePerParticipant > 0 ? `₹${selectedCoaching.pricePerParticipant} / participant` : 'Free'}</div>
                <div><strong>Joined:</strong> {selectedCoaching.joinedParticipants?.length || 0}</div>
              </div>

              {(selectedCoaching.coachName || selectedCoaching.coachBio || selectedCoaching.coachContact) && (
                <div className="rounded-lg border p-3 bg-slate-50">
                  <p className="font-semibold text-slate-900">Coach Details</p>
                  {selectedCoaching.coachName && <p><strong>Name:</strong> {selectedCoaching.coachName}</p>}
                  {selectedCoaching.coachContact && <p><strong>Contact:</strong> {selectedCoaching.coachContact}</p>}
                  {selectedCoaching.coachBio && <p className="mt-1 text-slate-600">{selectedCoaching.coachBio}</p>}
                </div>
              )}

              {selectedCoaching.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-slate-600">{selectedCoaching.description}</p>
                </div>
              )}

              {shareUrl && (
                <div>
                  <strong>Share Link</strong>
                  <div className="mt-1 p-2 rounded border bg-slate-50 flex items-center gap-2">
                    <p className="text-xs text-blue-700 break-all flex-1">{shareUrl}</p>
                    <Button size="sm" variant="ghost" onClick={handleCopyShare}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer"><Share2 className="h-4 w-4" /></a>
                    </Button>
                  </div>
                </div>
              )}

              {(selectedCoaching.pendingRequests?.length || 0) > 0 && (
                <div>
                  <p className="font-semibold text-slate-900 mb-2">Pending Requests</p>
                  <div className="space-y-2">
                    {selectedCoaching.pendingRequests.map((participant) => (
                      <div key={participant._id} className="rounded border bg-amber-50 border-amber-200 p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{capitalizeWords(participant.name)}</p>
                          {participant.email && <p className="text-xs text-slate-500 truncate">{participant.email}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void handleApprove(participant._id)}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => void handleRejectOrRemove(participant._id)}>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCoaching.joinedParticipants?.length || 0) > 0 && (
                <div>
                  <p className="font-semibold text-slate-900 mb-2">Joined Participants</p>
                  <div className="space-y-2">
                    {selectedCoaching.joinedParticipants.map((participant) => (
                      <div key={participant._id} className="rounded border bg-emerald-50 border-emerald-200 p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{capitalizeWords(participant.name)}</p>
                          {participant.email && <p className="text-xs text-slate-500 truncate">{participant.email}</p>}
                        </div>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => void handleRejectOrRemove(participant._id)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="font-semibold text-slate-900 mb-2">Cancel</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="text-red-700 border-red-300" onClick={() => void cancelSingle()}>
                    <Trash2 className="h-4 w-4 mr-1" /> Cancel This Class
                  </Button>
                  {selectedCoaching.seriesId && (
                    <Button variant="outline" className="text-red-700 border-red-300" onClick={() => void cancelSeries()}>
                      <Trash2 className="h-4 w-4 mr-1" /> Cancel This & Future
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
