import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { capitalizeWords } from '@/lib/utils';
import { Navbar } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Calendar,
  Clock,
  PlusCircle,
  Settings,
  Trash2,
  Users,
  Pencil,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Academy {
  _id: string;
  name: string;
  sports: Sport[];
}

interface Sport {
  sportName: string;
  numberOfCourts: number;
  startTime: string;
  endTime: string;
}

interface Participant {
  _id: string;
  name: string;
  email?: string;
}

interface DropIn {
  _id: string;
  sport: string;
  courtNumber: number;
  title: string;
  description: string;
  skillLevel: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  maxParticipants: number;
  pricePerParticipant: number;
  joinedParticipants: Participant[];
  pendingRequests: Participant[];
  seriesId: string | null;
  recurrenceType: 'none' | 'daily' | 'weekly';
  recurrenceDays: number[];
  recurrenceUntil: string | null;
  shareCode: string;
  status: string;
}

interface DropInSchedule {
  id: string;
  displayDropIn: DropIn;
  occurrences: DropIn[];
  firstDate: string;
  lastDate: string;
  totalPendingRequests: number;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AcademyDropIn() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);

  // ── Academy / sport selectors ──
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedSport, setSelectedSport] = useState('');

  // ── Schedule list view ──
  const [dropIns, setDropIns] = useState<DropIn[]>([]);

  // ── Create dialog ──
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    courtNumber: '',
    title: '',
    description: '',
    skillLevel: '',
    startTime: '',
    endTime: '',
    maxParticipants: '',
    pricePerParticipant: '0',
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly',
    recurrenceDays: [] as number[],
    recurrenceUntil: '',
  });

  // ── Detail/manage dialog ──
  const [selectedDropIn, setSelectedDropIn] = useState<DropIn | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMode, setCancelMode] = useState<'single' | 'series'>('single');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editScope, setEditScope] = useState<'single' | 'future'>('single');
  const [editForm, setEditForm] = useState({
    courtNumber: '',
    date: '',
    title: '',
    description: '',
    skillLevel: '',
    startTime: '',
    endTime: '',
    maxParticipants: '',
    pricePerParticipant: '0',
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly',
    recurrenceDays: [] as number[],
    recurrenceUntil: '',
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── Derived ──
  const selectedAcademy = academies.find(a => a._id === selectedAcademyId);
  const sports = selectedAcademy?.sports ?? [];
  const courts = useMemo(() => {
    const sport = sports.find(s => s.sportName === selectedSport);
    return sport ? Array.from({ length: sport.numberOfCourts }, (_, i) => i + 1) : [];
  }, [sports, selectedSport]);

  const editCourts = useMemo(() => {
    if (!selectedDropIn) return courts;
    const sport = sports.find(s => s.sportName === selectedDropIn.sport);
    return sport ? Array.from({ length: sport.numberOfCourts }, (_, i) => i + 1) : courts;
  }, [sports, selectedDropIn, courts]);

  const scheduleGroups = useMemo<DropInSchedule[]>(() => {
    const grouped = new Map<string, DropIn[]>();

    dropIns.forEach((dropIn) => {
      const key = dropIn.seriesId || dropIn._id;
      const existing = grouped.get(key);
      if (existing) {
        existing.push(dropIn);
      } else {
        grouped.set(key, [dropIn]);
      }
    });

    return Array.from(grouped.entries())
      .map(([id, occurrences]) => {
        const sortedOccurrences = [...occurrences].sort((left, right) => {
          if (left.date !== right.date) return left.date.localeCompare(right.date);
          return left.startTime.localeCompare(right.startTime);
        });

        const displayDropIn = sortedOccurrences[0];

        return {
          id,
          displayDropIn,
          occurrences: sortedOccurrences,
          firstDate: sortedOccurrences[0].date,
          lastDate: sortedOccurrences[sortedOccurrences.length - 1].date,
          totalPendingRequests: sortedOccurrences.reduce((sum, item) => sum + (item.pendingRequests?.length ?? 0), 0),
        };
      })
      .sort((left, right) => {
        if (left.firstDate !== right.firstDate) return left.firstDate.localeCompare(right.firstDate);
        return left.displayDropIn.startTime.localeCompare(right.displayDropIn.startTime);
      });
  }, [dropIns]);

  // ── Fetch academies ──
  useEffect(() => {
    if (!user?.userId) return;
    axios.post('/api/academy/user-academies', { userId: user.userId })
      .then(res => {
        const list: Academy[] = res.data.data ?? [];
        setAcademies(list);
        if (list.length > 0) {
          setSelectedAcademyId(list[0]._id);
          if (list[0].sports?.length > 0) setSelectedSport(list[0].sports[0].sportName);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const acad = academies.find(a => a._id === selectedAcademyId);
    if (acad && acad.sports.length > 0) setSelectedSport(acad.sports[0].sportName);
  }, [selectedAcademyId]);

  // ── Fetch drop-ins ──
  const fetchDropIns = async () => {
    if (!selectedAcademyId) return;
    try {
      const res = await axios.get(`/api/dropin/academy/${selectedAcademyId}`, {
        params: { sport: selectedSport || undefined },
      });
      setDropIns(res.data.dropIns ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchDropIns(); }, [selectedAcademyId, selectedSport]);

  // ── Create drop-in ──
  const handleCreate = async () => {
    if (!selectedAcademyId || !selectedSport || !form.date || !form.courtNumber || !form.startTime || !form.endTime || !form.maxParticipants) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        academyId: selectedAcademyId,
        sport: selectedSport,
        courtNumber: parseInt(form.courtNumber),
        title: form.title,
        description: form.description,
        skillLevel: form.skillLevel,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        maxParticipants: parseInt(form.maxParticipants),
        pricePerParticipant: parseFloat(form.pricePerParticipant) || 0,
        recurrenceType: form.recurrenceType,
      };
      if (form.recurrenceType === 'weekly') payload.recurrenceDays = form.recurrenceDays;
      if (form.recurrenceType !== 'none' && form.recurrenceUntil) payload.recurrenceUntil = form.recurrenceUntil;

      const res = await axios.post('/api/dropin/create', payload);
      toast({ title: res.data.message });
      setCreateOpen(false);
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), courtNumber: '', title: '', description: '', skillLevel: '', startTime: '', endTime: '', maxParticipants: '', pricePerParticipant: '0', recurrenceType: 'none', recurrenceDays: [], recurrenceUntil: '' });
      await fetchDropIns();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? 'Failed to create drop-in', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // ── Cancel drop-in ──
  const handleCancel = async () => {
    if (!selectedDropIn) return;
    setCancelling(true);
    try {
      if (cancelMode === 'single') {
        await axios.delete(`/api/dropin/${selectedDropIn._id}`);
      } else {
        await axios.delete(`/api/dropin/series/${selectedDropIn.seriesId}/from/${selectedDropIn.date}`);
      }
      toast({ title: 'Drop-in cancelled successfully' });
      setConfirmCancelOpen(false);
      setDetailOpen(false);
      await fetchDropIns();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? 'Failed to cancel', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  // ── Approve / Reject join requests ──
  const handleApprove = async (dropInId: string, userId: string) => {
    setApproving(userId);
    try {
      await axios.post(`/api/dropin/${dropInId}/approve/${userId}`);
      toast({ title: 'Participant approved' });
      const res = await axios.get(`/api/dropin/${dropInId}`);
      setSelectedDropIn(res.data.dropIn);
      await fetchDropIns();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? 'Failed to approve', variant: 'destructive' });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (dropInId: string, userId: string) => {
    setRejecting(userId);
    try {
      const rejectRes = await axios.post(`/api/dropin/${dropInId}/reject/${userId}`);
      toast({ title: rejectRes.data?.message ?? 'Participant updated' });
      const detailRes = await axios.get(`/api/dropin/${dropInId}`);
      setSelectedDropIn(detailRes.data.dropIn);
      await fetchDropIns();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? 'Failed to reject', variant: 'destructive' });
    } finally {
      setRejecting(null);
    }
  };

  const handleViewParticipantProfile = (userId: string) => {
    const token = encodeURIComponent(JSON.stringify(userId));
    navigate(`/public/profile/${token}`);
  };

  const openEditDialog = () => {
    if (!selectedDropIn) return;
    setDetailOpen(false);
    setEditScope('single');
    setEditForm({
      courtNumber: String(selectedDropIn.courtNumber),
      date: selectedDropIn.date,
      title: selectedDropIn.title || '',
      description: selectedDropIn.description || '',
      skillLevel: selectedDropIn.skillLevel || '',
      startTime: selectedDropIn.startTime,
      endTime: selectedDropIn.endTime,
      maxParticipants: String(selectedDropIn.maxParticipants),
      pricePerParticipant: String(selectedDropIn.pricePerParticipant ?? 0),
      recurrenceType: selectedDropIn.recurrenceType || 'none',
      recurrenceDays: selectedDropIn.recurrenceDays || [],
      recurrenceUntil: selectedDropIn.recurrenceUntil || '',
    });
    setEditOpen(true);
  };

  const handleUpdateDropIn = async () => {
    if (!selectedDropIn) return;
    if (!editForm.courtNumber || !editForm.date || !editForm.startTime || !editForm.endTime || !editForm.maxParticipants) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (editScope === 'future' && editForm.recurrenceType === 'weekly' && editForm.recurrenceDays.length === 0) {
      toast({ title: 'Please select recurrence days for weekly updates', variant: 'destructive' });
      return;
    }

    if (editScope === 'future' && editForm.recurrenceType !== 'none' && !editForm.recurrenceUntil) {
      toast({ title: 'Please select repeat-until date for recurring updates', variant: 'destructive' });
      return;
    }

    setSavingEdit(true);
    try {
      const payload: any = {
        scope: editScope,
        sport: selectedDropIn.sport,
        courtNumber: parseInt(editForm.courtNumber, 10),
        date: editForm.date,
        title: editForm.title,
        description: editForm.description,
        skillLevel: editForm.skillLevel,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        maxParticipants: parseInt(editForm.maxParticipants, 10),
        pricePerParticipant: parseFloat(editForm.pricePerParticipant) || 0,
      };

      if (editScope === 'future') {
        payload.recurrenceType = editForm.recurrenceType;
        payload.recurrenceDays = editForm.recurrenceType === 'weekly' ? editForm.recurrenceDays : [];
        payload.recurrenceUntil = editForm.recurrenceType === 'none' ? null : editForm.recurrenceUntil;
      }

      const res = await axios.put(`/api/dropin/${selectedDropIn._id}`, payload);
      toast({ title: res.data?.message ?? 'Drop-in updated successfully' });
      if (editScope === 'single') {
        setSelectedDropIn(res.data?.dropIn ?? selectedDropIn);
        setEditOpen(false);
        setDetailOpen(true);
      } else {
        setEditOpen(false);
        setDetailOpen(false);
      }
      await fetchDropIns();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message ?? 'Failed to update drop-in', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-12 max-w-[96vw] 2xl:max-w-[1700px]">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Drop-In Sessions</h1>
            <p className="text-slate-500 text-lg">Create and manage open court sessions that participants can join.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-emerald-100"><Calendar className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Schedules Created</p>
                <p className="text-2xl font-bold text-slate-800">{scheduleGroups.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Occurrences Created</p>
                <p className="text-2xl font-bold text-slate-800">
                  {scheduleGroups.reduce((sum, schedule) => sum + schedule.occurrences.length, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Pending Requests</p>
                <p className="text-2xl font-bold text-slate-800">
                  {scheduleGroups.reduce((sum, schedule) => sum + schedule.totalPendingRequests, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main card */}
        <Card className="border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-slate-800">Schedule List</CardTitle>
                <CardDescription>Select academy and sport to manage created drop-in schedules instead of each occurrence.</CardDescription>
              </div>
            </div>

            {/* Academy selector */}
            {academies.length > 1 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Academy</p>
                <Tabs value={selectedAcademyId} onValueChange={setSelectedAcademyId}>
                  <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                    {academies.map(a => (
                      <TabsTrigger key={a._id} value={a._id}
                        className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">
                        {capitalizeWords(a.name)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Sport selector */}
            {sports.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Sport</p>
                <Tabs value={selectedSport} onValueChange={setSelectedSport}>
                  <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                    {sports.map(s => (
                      <TabsTrigger key={s.sportName} value={s.sportName}
                        className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">
                        {capitalizeWords(s.sportName)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <PlusCircle className="h-4 w-4 mr-1" />
                New Drop-In
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            {scheduleGroups.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No drop-in schedules created yet.</p>
                <p className="text-sm mt-1">
                  Click{' '}
                  <button
                    type="button"
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                    onClick={() => setCreateOpen(true)}
                  >
                    New Drop-In
                  </button>{' '}
                  to create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleGroups.map(schedule => {
                  const dropIn = schedule.displayDropIn;
                  const scheduleLabel = dropIn.recurrenceType === 'none'
                    ? 'One-time'
                    : dropIn.recurrenceType === 'weekly'
                      ? 'Recurring weekly'
                      : 'Recurring daily';

                  return (
                  <motion.div key={schedule.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-emerald-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => { setSelectedDropIn(dropIn); setDetailOpen(true); }}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Schedule</Badge>
                          <Badge variant="outline" className="capitalize">{scheduleLabel}</Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 truncate">{dropIn.title || capitalizeWords(dropIn.sport)}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Court {dropIn.courtNumber} · {capitalizeWords(dropIn.sport)}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {dropIn.startTime} – {dropIn.endTime}
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <p>
                            {schedule.firstDate === schedule.lastDate
                              ? `Date: ${schedule.firstDate}`
                              : `Runs: ${schedule.firstDate} to ${schedule.lastDate}`}
                          </p>
                          <p>{schedule.occurrences.length} occurrence{schedule.occurrences.length === 1 ? '' : 's'}</p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-600">
                            {schedule.occurrences.length} occurrence{schedule.occurrences.length === 1 ? '' : 's'}
                          </div>
                          {schedule.totalPendingRequests > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                              {schedule.totalPendingRequests} pending
                            </Badge>
                          )}
                        </div>
                        {dropIn.pricePerParticipant > 0 && (
                          <p className="text-xs text-slate-500">₹{dropIn.pricePerParticipant} / participant</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Drop-In Session</DialogTitle>
            <DialogDescription>
              Create a {capitalizeWords(selectedSport || 'sport')} drop-in schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            {/* Court */}
            <div>
              <Label>Court *</Label>
              <Select value={form.courtNumber} onValueChange={v => setForm(f => ({ ...f, courtNumber: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {courts.map(c => <SelectItem key={c} value={String(c)}>Court {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label>Title</Label>
              <Input className="mt-1" placeholder="e.g. Saturday Morning Badminton"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={2} placeholder="Optional details..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Skill Level */}
            <div>
              <Label>Skill Level</Label>
              <Select
                value={form.skillLevel || '__any__'}
                onValueChange={v => setForm(f => ({ ...f, skillLevel: v === '__any__' ? '' : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any level</SelectItem>
                  {SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time *</Label>
                <Input type="time" className="mt-1" value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input type="time" className="mt-1" value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>

            {/* Slots / Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Participants *</Label>
                <Input type="number" min={1} className="mt-1" placeholder="e.g. 10"
                  value={form.maxParticipants}
                  onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))} />
              </div>
              <div>
                <Label>Price / Participant (₹)</Label>
                <Input type="number" min={0} className="mt-1" placeholder="0"
                  value={form.pricePerParticipant}
                  onChange={e => setForm(f => ({ ...f, pricePerParticipant: e.target.value }))} />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <Label>Recurrence</Label>
              <Select value={form.recurrenceType}
                onValueChange={v => setForm(f => ({ ...f, recurrenceType: v as any, recurrenceDays: [], recurrenceUntil: '' }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time only</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (select days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weekly days */}
            {form.recurrenceType === 'weekly' && (
              <div>
                <Label>Days of Week *</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DAYS_OF_WEEK.map(day => {
                    const active = form.recurrenceDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          recurrenceDays: active
                            ? f.recurrenceDays.filter(d => d !== day.value)
                            : [...f.recurrenceDays, day.value]
                        }))}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Until date */}
            {form.recurrenceType !== 'none' && (
              <div>
                <Label>Repeat Until *</Label>
                <Input type="date" className="mt-1" value={form.recurrenceUntil}
                  min={form.date || format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setForm(f => ({ ...f, recurrenceUntil: e.target.value }))} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {creating ? 'Creating…' : 'Create Drop-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail / Manage Dialog ────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedDropIn && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDropIn.title || capitalizeWords(selectedDropIn.sport)}</DialogTitle>
                <DialogDescription>
                  Court {selectedDropIn.courtNumber} · {selectedDropIn.date} · {selectedDropIn.startTime}–{selectedDropIn.endTime}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Sport</span><p className="font-medium">{capitalizeWords(selectedDropIn.sport)}</p></div>
                  <div><span className="text-slate-500">Skill Level</span><p className="font-medium">{selectedDropIn.skillLevel || 'Any'}</p></div>
                  <div><span className="text-slate-500">Capacity</span><p className="font-medium">{selectedDropIn.maxParticipants} players</p></div>
                  <div><span className="text-slate-500">Price</span><p className="font-medium">{selectedDropIn.pricePerParticipant > 0 ? `₹${selectedDropIn.pricePerParticipant}` : 'Free'}</p></div>
                  <div><span className="text-slate-500">Recurrence</span><p className="font-medium capitalize">{selectedDropIn.recurrenceType}</p></div>
                </div>

                {selectedDropIn.description && (
                  <div><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm">{selectedDropIn.description}</p></div>
                )}

                {/* Pending requests */}
                {(selectedDropIn.pendingRequests?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Pending Requests</p>
                    <div className="space-y-2">
                      {selectedDropIn.pendingRequests.map(p => (
                        <div key={p._id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="font-medium">{capitalizeWords(p.name)}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => handleViewParticipantProfile(p._id)}>
                              View Profile
                            </Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                              disabled={approving === p._id}
                              onClick={() => handleApprove(selectedDropIn._id, p._id)}>
                              {approving === p._id ? '…' : 'Approve'}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200"
                              disabled={rejecting === p._id}
                              onClick={() => handleReject(selectedDropIn._id, p._id)}>
                              {rejecting === p._id ? '…' : 'Reject'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancel options */}
                {selectedDropIn.seriesId && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Cancel Session</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="text-red-700 border-red-200"
                      onClick={() => { setCancelMode('series'); setConfirmCancelOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Cancel This & Future
                    </Button>
                  </div>
                </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={openEditDialog}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open && selectedDropIn && editScope === 'single') setDetailOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drop-In Session</DialogTitle>
            <DialogDescription>Update slot, details, and participant settings for this session.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedDropIn?.seriesId && (
              <div>
                <Label>Apply Changes To</Label>
                <Select value={editScope} onValueChange={(v) => setEditScope(v as 'single' | 'future')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">This occurrence only</SelectItem>
                    <SelectItem value="future">This and future occurrences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Court *</Label>
                <Select value={editForm.courtNumber} onValueChange={v => setEditForm(f => ({ ...f, courtNumber: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select court" />
                  </SelectTrigger>
                  <SelectContent>
                    {editCourts.map(c => <SelectItem key={c} value={String(c)}>Court {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" className="mt-1" value={editForm.date}
                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={2} value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Skill Level</Label>
              <Select
                value={editForm.skillLevel || '__any__'}
                onValueChange={v => setEditForm(f => ({ ...f, skillLevel: v === '__any__' ? '' : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any level</SelectItem>
                  {SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time *</Label>
                <Input type="time" className="mt-1" value={editForm.startTime}
                  onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input type="time" className="mt-1" value={editForm.endTime}
                  onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Participants *</Label>
                <Input type="number" min={1} className="mt-1" value={editForm.maxParticipants}
                  onChange={e => setEditForm(f => ({ ...f, maxParticipants: e.target.value }))} />
              </div>
              <div>
                <Label>Price / Participant (₹)</Label>
                <Input type="number" min={0} className="mt-1" value={editForm.pricePerParticipant}
                  onChange={e => setEditForm(f => ({ ...f, pricePerParticipant: e.target.value }))} />
              </div>
            </div>

            {editScope === 'future' && (
              <>
                <div>
                  <Label>Recurrence</Label>
                  <Select
                    value={editForm.recurrenceType}
                    onValueChange={v => setEditForm(f => ({ ...f, recurrenceType: v as 'none' | 'daily' | 'weekly', recurrenceDays: v === 'weekly' ? f.recurrenceDays : [], recurrenceUntil: v === 'none' ? '' : f.recurrenceUntil }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
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
                      {DAYS_OF_WEEK.map(day => {
                        const active = editForm.recurrenceDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setEditForm(f => ({
                              ...f,
                              recurrenceDays: active
                                ? f.recurrenceDays.filter(d => d !== day.value)
                                : [...f.recurrenceDays, day.value]
                            }))}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'}`}
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
                      min={editForm.date}
                      onChange={e => setEditForm(f => ({ ...f, recurrenceUntil: e.target.value }))}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdateDropIn} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Cancel Dialog ─────────────────────────────────── */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              {cancelMode === 'single'
                ? 'Are you sure you want to cancel this drop-in session? This cannot be undone.'
                : 'Are you sure you want to cancel this and all future sessions in the series? This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancelOpen(false)}>Keep It</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={cancelling} onClick={handleCancel}>
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
