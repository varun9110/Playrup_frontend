import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Navbar } from '@/components/layout';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Calendar,
  Clock,
  Copy,
  Pencil,
  PlusCircle,
  RefreshCw,
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

interface SessionSummary {
  _id: string;
  date: string;
  joinedParticipants: Participant[];
  pendingRequests: Participant[];
}

interface CoachingProgram {
  programKey: string;
  seriesId: string | null;
  representativeId: string;
  sport: string;
  courtNumber: number;
  title: string;
  description?: string;
  skillLevel?: string;
  coachName?: string;
  coachBio?: string;
  coachContact?: string;
  startTime: string;
  endTime: string;
  pricePerParticipant: number;
  recurrenceType: 'none' | 'daily' | 'weekly';
  recurrenceDays: number[];
  recurrenceUntil: string | null;
  firstDate: string;
  lastDate: string;
  totalSessions: number;
  joinedCount: number;
  pendingCount: number;
  shareCode?: string;
  sessions: SessionSummary[];
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SKILL_LEVELS = ['Beginner', 'Amateur', 'Intermediate', 'Advanced', 'Professional'];

const getUniquePlayers = (program: CoachingProgram): Participant[] => {
  const seen = new Set<string>();
  return program.sessions
    .flatMap((s) => s.joinedParticipants)
    .filter((p) => { if (seen.has(p._id)) return false; seen.add(p._id); return true; });
};

const getScheduleDescription = (program: CoachingProgram): string => {
  if (program.recurrenceType === 'weekly') {
    const days = [...program.recurrenceDays].sort().map((d) => DAY_LABELS[d]).join(', ');
    return `Every ${days} · ${program.startTime}–${program.endTime}`;
  }
  if (program.recurrenceType === 'daily') {
    return `Daily · ${program.startTime}–${program.endTime}`;
  }
  return `${program.firstDate} · ${program.startTime}–${program.endTime}`;
};

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
  const [refreshing, setRefreshing] = useState(false);

  const [programs, setPrograms] = useState<CoachingProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<CoachingProgram | null>(null);
  const [selectedCoaching, setSelectedCoaching] = useState<Coaching | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [form, setForm] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
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

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editScope, setEditScope] = useState<'single' | 'future'>('single');
  const [editingProgram, setEditingProgram] = useState<CoachingProgram | null>(null);
  const [editForm, setEditForm] = useState({
    startDate: '',
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

  const editCourts = useMemo(() => {
    if (!editingProgram) return courts;
    const sport = sports.find((s) => s.sportName === editingProgram.sport);
    return sport ? Array.from({ length: sport.numberOfCourts }, (_, i) => i + 1) : courts;
  }, [sports, editingProgram, courts]);

  const fetchPrograms = async () => {
    if (!selectedAcademyId) return;
    try {
      const res = await axios.get(`/api/coaching/academy/${selectedAcademyId}/programs`, {
        params: { sport: selectedSport || undefined },
      });
      setPrograms(res.data?.programs || []);
    } catch (error) {
      console.error('Failed to fetch coaching programs', error);
      setPrograms([]);
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
    void fetchPrograms();
  }, [selectedAcademyId, selectedSport]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrograms();
    setRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const resetForm = () => {
    setForm({
      startDate: format(new Date(), 'yyyy-MM-dd'),
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
    if (!selectedAcademyId || !selectedSport || !form.courtNumber || !form.startTime || !form.endTime || !form.startDate) {
      toast({ title: 'Please fill academy, sport, court, date and timeslot fields', variant: 'destructive' });
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
        date: form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
        pricePerParticipant: Number(form.pricePerParticipant || '0'),
        recurrenceType: form.recurrenceType,
      };

      if (form.recurrenceType === 'weekly') payload.recurrenceDays = form.recurrenceDays;
      if (form.recurrenceType !== 'none') payload.recurrenceUntil = form.recurrenceUntil;

      const res = await axios.post('/api/coaching/create', payload);
      toast({ title: res.data?.message || 'Coaching program created' });
      setCreateOpen(false);
      resetForm();
      await fetchPrograms();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to create coaching program', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const openSessionDetails = async (sessionId: string) => {
    try {
      const [detailRes, shareRes] = await Promise.all([
        axios.get(`/api/coaching/${sessionId}`),
        axios.get(`/api/coaching/${sessionId}/share-link`),
      ]);

      setSelectedCoaching(detailRes.data?.coaching || null);
      const code = shareRes.data?.shareCode;
      setShareUrl(code ? `${window.location.origin}/coaching/share/${code}` : '');
    } catch (error) {
      console.error('Failed to load session details', error);
      toast({ title: 'Failed to load session details', variant: 'destructive' });
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
      await fetchPrograms();
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to approve participant', variant: 'destructive' });
    }
  };

  const handleRejectOrRemove = async (participantId: string) => {
    if (!selectedCoaching) return;
    try {
      const res = await axios.post(`/api/coaching/${selectedCoaching._id}/reject/${participantId}`);
      toast({ title: res.data?.message || 'Participant updated' });
      await refreshSelectedCoaching(selectedCoaching._id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to update participant', variant: 'destructive' });
    }
  };

  const cancelSingle = async () => {
    if (!selectedCoaching) return;
    try {
      const res = await axios.delete(`/api/coaching/${selectedCoaching._id}`);
      toast({ title: res.data?.message || 'Session cancelled' });
      setSelectedCoaching(null);
      setShareUrl('');
      await fetchPrograms();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to cancel session', variant: 'destructive' });
    }
  };

  const cancelSeries = async () => {
    if (!selectedCoaching?.seriesId) return;
    try {
      const res = await axios.delete(`/api/coaching/series/${selectedCoaching.seriesId}/from/${selectedCoaching.date}`);
      toast({ title: res.data?.message || 'Future sessions cancelled' });
      setSelectedCoaching(null);
      setShareUrl('');
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to cancel series', variant: 'destructive' });
    }
  };

  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);
  const [approvingParticipant, setApprovingParticipant] = useState<string | null>(null);

  const handleViewParticipantProfile = (participantId: string) => {
    const token = encodeURIComponent(JSON.stringify(participantId));
    navigate(`/public/profile/${token}`);
  };

  const handleProgramApprove = async (sessionId: string, participantId: string) => {
    setApprovingParticipant(participantId);
    try {
      const res = await axios.post(`/api/coaching/${sessionId}/approve/${participantId}`);
      toast({ title: res.data?.message || 'Participant approved' });
      const updated = await axios.get(`/api/coaching/academy/${selectedAcademyId}/programs`, {
        params: { sport: selectedSport || undefined },
      });
      const list: CoachingProgram[] = updated.data?.programs || [];
      setPrograms(list);
      setSelectedProgram((prev) => prev ? (list.find((p) => p.programKey === prev.programKey) ?? prev) : prev);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to approve participant', variant: 'destructive' });
    } finally {
      setApprovingParticipant(null);
    }
  };

  const handleProgramReject = async (sessionId: string, participantId: string) => {
    setRemovingParticipant(participantId);
    try {
      const res = await axios.post(`/api/coaching/${sessionId}/reject/${participantId}`);
      toast({ title: res.data?.message || 'Participant updated' });
      const updated = await axios.get(`/api/coaching/academy/${selectedAcademyId}/programs`, {
        params: { sport: selectedSport || undefined },
      });
      const list: CoachingProgram[] = updated.data?.programs || [];
      setPrograms(list);
      setSelectedProgram((prev) => prev ? (list.find((p) => p.programKey === prev.programKey) ?? prev) : prev);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to update participant', variant: 'destructive' });
    } finally {
      setRemovingParticipant(null);
    }
  };

  const openEditDialog = () => {
    if (!selectedProgram) return;
    setEditingProgram(selectedProgram);
    setSelectedProgram(null);
    setEditScope('single');
    setEditForm({
      startDate: selectedProgram.firstDate,
      courtNumber: String(selectedProgram.courtNumber),
      title: selectedProgram.title || '',
      description: selectedProgram.description || '',
      skillLevel: selectedProgram.skillLevel || '',
      coachName: selectedProgram.coachName || '',
      coachBio: selectedProgram.coachBio || '',
      coachContact: selectedProgram.coachContact || '',
      startTime: selectedProgram.startTime,
      endTime: selectedProgram.endTime,
      pricePerParticipant: String(selectedProgram.pricePerParticipant ?? 0),
      recurrenceType: selectedProgram.recurrenceType,
      recurrenceDays: selectedProgram.recurrenceDays || [],
      recurrenceUntil: selectedProgram.recurrenceUntil || '',
    });
    setEditOpen(true);
  };

  const handleUpdateProgram = async () => {
    if (!editingProgram) return;
    if (!editForm.courtNumber || !editForm.startDate || !editForm.startTime || !editForm.endTime) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (editScope === 'future' && editForm.recurrenceType === 'weekly' && editForm.recurrenceDays.length === 0) {
      toast({ title: 'Select recurrence days for weekly updates', variant: 'destructive' });
      return;
    }
    if (editScope === 'future' && editForm.recurrenceType !== 'none' && !editForm.recurrenceUntil) {
      toast({ title: 'Select repeat-until date for recurring updates', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const payload: any = {
        scope: editScope,
        sport: editingProgram.sport,
        courtNumber: Number(editForm.courtNumber),
        date: editForm.startDate,
        title: editForm.title,
        description: editForm.description,
        skillLevel: editForm.skillLevel,
        coachName: editForm.coachName,
        coachBio: editForm.coachBio,
        coachContact: editForm.coachContact,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        pricePerParticipant: Number(editForm.pricePerParticipant) || 0,
      };
      if (editScope === 'future') {
        payload.recurrenceType = editForm.recurrenceType;
        payload.recurrenceDays = editForm.recurrenceType === 'weekly' ? editForm.recurrenceDays : [];
        payload.recurrenceUntil = editForm.recurrenceType === 'none' ? null : editForm.recurrenceUntil;
      }
      const res = await axios.put(`/api/coaching/${editingProgram.representativeId}`, payload);
      toast({ title: res.data?.message || 'Program updated successfully' });
      setEditOpen(false);
      setEditingProgram(null);
      await fetchPrograms();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to update program', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelEntireProgram = async (program: CoachingProgram) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      if (program.seriesId) {
        const res = await axios.delete(`/api/coaching/series/${program.seriesId}/from/${today}`);
        toast({ title: res.data?.message || 'Upcoming sessions cancelled' });
      } else {
        // For a standalone session, only cancel if it hasn't happened yet
        if (program.firstDate >= today) {
          const res = await axios.delete(`/api/coaching/${program.representativeId}`);
          toast({ title: res.data?.message || 'Session cancelled' });
        } else {
          toast({ title: 'No upcoming sessions to cancel' });
          return;
        }
      }
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message || 'Failed to cancel upcoming sessions', variant: 'destructive' });
    }
  };

  const totalEnrolled = programs.reduce((sum, p) => sum + p.joinedCount, 0);
  const totalPending = programs.reduce((sum, p) => sum + p.pendingCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-12 max-w-[96vw] 2xl:max-w-[1700px]">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Coaching Programs</h1>
            <p className="text-slate-500 text-lg">Manage your coaching schedules, recurring programs and participant approvals.</p>
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

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-amber-100"><Calendar className="h-5 w-5 text-amber-700" /></div>
              <div>
                <p className="text-xs text-slate-500">Active Programs</p>
                <p className="text-2xl font-bold text-slate-800">{programs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-800">{totalEnrolled}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-red-100"><Clock className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Pending Approvals</p>
                <p className="text-2xl font-bold text-slate-800">{totalPending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-slate-800">Programs</CardTitle>
                <CardDescription>All coaching programs and recurring schedules.</CardDescription>
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
              <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                <PlusCircle className="h-4 w-4 mr-1" />
                New Program
              </Button>
              <Button size="sm" onClick={onRefresh} disabled={refreshing} className="bg-blue-600 text-white hover:bg-blue-700">
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            {programs.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No coaching programs yet.</p>
                <p className="text-sm mt-1">
                  Click{' '}
                  <button
                    type="button"
                    className="font-semibold text-amber-600 hover:text-amber-700"
                    onClick={() => setCreateOpen(true)}
                  >
                    New Program
                  </button>{' '}
                  to create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <motion.div key={program.programKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card
                      className="border-amber-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedProgram(program)}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {capitalizeWords(program.sport)}
                          </Badge>
                          {program.recurrenceType !== 'none' ? (
                            <Badge variant="outline" className="capitalize">{program.recurrenceType}</Badge>
                          ) : (
                            <Badge variant="outline">One-time</Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800 truncate">
                            {program.title || capitalizeWords(program.sport)}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">Court {program.courtNumber}</p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate">{getScheduleDescription(program)}</span>
                        </div>

                        <div className="text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5 inline mr-1" />
                          {program.firstDate}
                          {program.lastDate !== program.firstDate && ` → ${program.lastDate}`}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span>{program.joinedCount} enrolled</span>
                            <span className="text-slate-300">·</span>
                            <span>{program.totalSessions} {program.totalSessions === 1 ? 'session' : 'sessions'}</span>
                          </div>
                          <span className="font-semibold text-amber-700">
                            {program.pricePerParticipant > 0 ? `₹${program.pricePerParticipant}` : 'Free'}
                          </span>
                        </div>

                        {program.pendingCount > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            {program.pendingCount} pending approval
                          </div>
                        )}

                        {program.coachName && (
                          <div className="text-xs text-slate-500 truncate">
                            Coach: {program.coachName}
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

      {/* ── Create Program Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); setCreateOpen(open); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coaching Program</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
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
            <DialogTitle>{selectedCoaching?.title || 'Session Details'}</DialogTitle>
          </DialogHeader>

          {selectedCoaching && (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Sport:</strong> {capitalizeWords(selectedCoaching.sport)}</div>
                <div><strong>Court:</strong> {selectedCoaching.courtNumber}</div>
                <div><strong>Date:</strong> {selectedCoaching.date}</div>
                <div><strong>Time:</strong> {selectedCoaching.startTime} – {selectedCoaching.endTime}</div>
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
                    <Trash2 className="h-4 w-4 mr-1" /> Cancel This Session
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

      {/* ── Program Detail Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={!!selectedProgram && !selectedCoaching}
        onOpenChange={(open) => { if (!open) setSelectedProgram(null); }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedProgram && (
            <DialogHeader>
              <DialogTitle>{selectedProgram.title || 'Program Details'}</DialogTitle>
              <DialogDescription>
                Court {selectedProgram.courtNumber} · {getScheduleDescription(selectedProgram)}
              </DialogDescription>
            </DialogHeader>
          )}

          {selectedProgram && (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Sport:</strong> {capitalizeWords(selectedProgram.sport)}</div>
                <div><strong>Court:</strong> {selectedProgram.courtNumber}</div>
                <div className="col-span-2"><strong>Schedule:</strong> {getScheduleDescription(selectedProgram)}</div>
                <div><strong>Starts:</strong> {selectedProgram.firstDate}</div>
                <div><strong>Until:</strong> {selectedProgram.recurrenceUntil || selectedProgram.lastDate}</div>
                <div><strong>Sessions:</strong> {selectedProgram.totalSessions}</div>
                <div>
                  <strong>Enrolled:</strong>{' '}
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-emerald-700">{getUniquePlayers(selectedProgram).length}</span>
                    <span className="text-slate-400">players</span>
                  </span>
                </div>
                <div><strong>Fee:</strong> {selectedProgram.pricePerParticipant > 0 ? `₹${selectedProgram.pricePerParticipant} / participant` : 'Free'}</div>
                {selectedProgram.skillLevel && <div><strong>Skill Level:</strong> {selectedProgram.skillLevel}</div>}
              </div>

              {selectedProgram.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-slate-600">{selectedProgram.description}</p>
                </div>
              )}

              {(selectedProgram.coachName || selectedProgram.coachBio || selectedProgram.coachContact) && (
                <div className="rounded-lg border p-3 bg-slate-50">
                  <p className="font-semibold text-slate-900">Coach Details</p>
                  {selectedProgram.coachName && <p><strong>Name:</strong> {selectedProgram.coachName}</p>}
                  {selectedProgram.coachContact && <p><strong>Contact:</strong> {selectedProgram.coachContact}</p>}
                  {selectedProgram.coachBio && <p className="mt-1 text-slate-600">{selectedProgram.coachBio}</p>}
                </div>
              )}

              {(() => {
                const pendingBySession = selectedProgram.sessions
                  .filter((s) => s.pendingRequests.length > 0)
                  .flatMap((s) => s.pendingRequests.map((p) => ({ ...p, sessionId: s._id })));
                const seenPending = new Set<string>();
                const uniquePending = pendingBySession.filter((p) => {
                  if (seenPending.has(p._id)) return false;
                  seenPending.add(p._id);
                  return true;
                });
                return uniquePending.length > 0 ? (
                  <div>
                    <p className="font-semibold text-slate-900 mb-2">Pending Approvals ({uniquePending.length})</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {uniquePending.map((p) => (
                        <div key={p._id} className="px-2 py-2 rounded bg-amber-50 border border-amber-100 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{capitalizeWords(p.name)}</p>
                            {p.email && <p className="text-xs text-slate-500 truncate">{p.email}</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewParticipantProfile(p._id)}>View Profile</Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={approvingParticipant === p._id}
                              onClick={() => void handleProgramApprove(p.sessionId, p._id)}
                            >
                              {approvingParticipant === p._id ? '…' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600 border-red-200"
                              disabled={removingParticipant === p._id}
                              onClick={() => void handleProgramReject(p.sessionId, p._id)}
                            >
                              {removingParticipant === p._id ? '…' : 'Reject'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {(() => {
                const uniquePlayers = getUniquePlayers(selectedProgram);
                return (
                  <div>
                    <p className="font-semibold text-slate-900 mb-2">Enrolled Players ({uniquePlayers.length})</p>
                    {uniquePlayers.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No participants have joined yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {uniquePlayers.map((p) => (
                          <div key={p._id} className="px-2 py-2 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{capitalizeWords(p.name)}</p>
                              {p.email && <p className="text-xs text-slate-500 truncate">{p.email}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewParticipantProfile(p._id)}>View Profile</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedProgram.sessions.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-900 mb-2">
                    Sessions ({selectedProgram.sessions.length})
                  </p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {selectedProgram.sessions.map((session) => (
                      <div
                        key={session._id}
                        className="rounded border bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-sm">{session.date}</span>
                        {session.pendingRequests.length > 0 && (
                          <span className="text-red-600 text-xs font-medium">{session.pendingRequests.length} pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="font-semibold text-slate-900 mb-2">Cancel Upcoming Sessions</p>
                <p className="text-xs text-slate-500 mb-2">Past sessions will not be affected.</p>
                <Button
                  variant="outline"
                  className="text-red-700 border-red-300"
                  onClick={() => void cancelEntireProgram(selectedProgram)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancel Upcoming Sessions
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={openEditDialog}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setSelectedProgram(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Program Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            if (editingProgram) setSelectedProgram(editingProgram);
            setEditingProgram(null);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coaching Program</DialogTitle>
            <DialogDescription>Update details for this program. Changes can apply to this session only or this and all future sessions.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingProgram?.seriesId && (
              <div>
                <Label>Apply Changes To</Label>
                <Select value={editScope} onValueChange={(v) => setEditScope(v as 'single' | 'future')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">This occurrence only</SelectItem>
                    <SelectItem value="future">This and future occurrences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Court *</Label>
                <Select value={editForm.courtNumber} onValueChange={(v) => setEditForm((f) => ({ ...f, courtNumber: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select court" /></SelectTrigger>
                  <SelectContent>
                    {editCourts.map((c) => <SelectItem key={c} value={String(c)}>Court {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Skill Level</Label>
              <Select
                value={editForm.skillLevel || '__any__'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, skillLevel: v === '__any__' ? '' : v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Any level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any level</SelectItem>
                  {SKILL_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class Title</Label>
              <Input
                className="mt-1"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Morning Advanced Drills"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Price / Participant (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="mt-1"
                value={editForm.pricePerParticipant}
                onChange={(e) => setEditForm((f) => ({ ...f, pricePerParticipant: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-800 mb-2">Coach Details (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Coach Name</Label>
                  <Input
                    className="mt-1"
                    value={editForm.coachName}
                    onChange={(e) => setEditForm((f) => ({ ...f, coachName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Coach Contact</Label>
                  <Input
                    className="mt-1"
                    value={editForm.coachContact}
                    onChange={(e) => setEditForm((f) => ({ ...f, coachContact: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label>Coach Bio</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={editForm.coachBio}
                  onChange={(e) => setEditForm((f) => ({ ...f, coachBio: e.target.value }))}
                />
              </div>
            </div>

            {editScope === 'future' && (
              <>
                <div>
                  <Label>Recurrence</Label>
                  <Select
                    value={editForm.recurrenceType}
                    onValueChange={(v) => setEditForm((f) => ({
                      ...f,
                      recurrenceType: v as 'none' | 'daily' | 'weekly',
                      recurrenceDays: v === 'weekly' ? f.recurrenceDays : [],
                      recurrenceUntil: v === 'none' ? '' : f.recurrenceUntil,
                    }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">One-time only</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (select days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editForm.recurrenceType === 'weekly' && (
                  <div>
                    <Label>Days of Week *</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {DAYS_OF_WEEK.map((day) => {
                        const active = editForm.recurrenceDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setEditForm((f) => ({
                              ...f,
                              recurrenceDays: active
                                ? f.recurrenceDays.filter((d) => d !== day.value)
                                : [...f.recurrenceDays, day.value],
                            }))}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${active ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'}`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {editForm.recurrenceType !== 'none' && (
                  <div>
                    <Label>Repeat Until *</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={editForm.recurrenceUntil}
                      min={editForm.startDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, recurrenceUntil: e.target.value }))}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); if (editingProgram) setSelectedProgram(editingProgram); setEditingProgram(null); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => void handleUpdateProgram()} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
