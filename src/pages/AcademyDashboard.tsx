import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Building2,
  Calendar,
  Clock,
  Gauge,
  MapPin,
  Settings,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { capitalizeWords, utcDateTimeToLocalParts } from '@/lib/utils';

type AcademySport = {
  sportName: string;
  numberOfCourts: number;
  startTime: string;
  endTime: string;
};

type Academy = {
  _id: string;
  name: string;
  city?: string;
  address?: string;
  sports: AcademySport[];
};

type BookingItem = {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  courtNumber: number;
  userId?: { name?: string };
  userEmail?: string;
  sport?: string;
  localDateObj?: Date;
  localDate?: string;
  localStartTime?: string;
  localEndTime?: string;
};

type DropInParticipant = {
  _id: string;
  name: string;
};

type DropInItem = {
  _id: string;
  sport: string;
  courtNumber: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  joinedParticipants: DropInParticipant[];
  pendingRequests: DropInParticipant[];
  status: string;
};

type CoachingItem = {
  _id: string;
  sport: string;
  courtNumber: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  joinedParticipants: DropInParticipant[];
  pendingRequests: DropInParticipant[];
  status: string;
};

const toDateOnlyString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, offset: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const getBookingDateTime = (booking: BookingItem) => {
  if (booking.localDateObj instanceof Date && !Number.isNaN(booking.localDateObj.getTime())) {
    return booking.localDateObj;
  }

  const base = String(booking.date || '').includes('T')
    ? String(booking.date).split('T')[0]
    : String(booking.date || '');
  return new Date(`${base}T${booking.startTime || '00:00'}:00`);
};

const getDropInDateTime = (dropIn: DropInItem) => new Date(`${dropIn.date}T${dropIn.startTime}:00`);
const getCoachingDateTime = (coaching: CoachingItem) => new Date(`${coaching.date}T${coaching.startTime}:00`);

const timeDiffMinutes = (startTime: string, endTime: string) => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max((eh * 60 + em) - (sh * 60 + sm), 0);
};

export default function AcademyDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const userId = user?.userId;
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [dropIns, setDropIns] = useState<DropInItem[]>([]);
  const [coachingSessions, setCoachingSessions] = useState<CoachingItem[]>([]);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [loadingOps, setLoadingOps] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const selectedAcademy = useMemo(
    () => academies.find((academy) => academy._id === selectedAcademyId) || null,
    [academies, selectedAcademyId]
  );

  const selectedSportConfig = useMemo(
    () => selectedAcademy?.sports?.find((sport) => sport.sportName === selectedSport) || null,
    [selectedAcademy, selectedSport]
  );

  useEffect(() => {
    if (!userId) return;

    const fetchAcademies = async () => {
      try {
        setLoadingAcademies(true);
        const response = await axios.post('/api/academy/user-academies', { userId });
        const academyList = response.data?.data || [];
        setAcademies(academyList);

        if (academyList.length > 0) {
          const first = academyList[0];
          setSelectedAcademyId(first._id);
          setSelectedSport(first.sports?.[0]?.sportName || '');
        }
      } catch (error) {
        console.error('Failed to fetch academies:', error);
        setAcademies([]);
      } finally {
        setLoadingAcademies(false);
      }
    };

    fetchAcademies();
  }, [userId]);

  useEffect(() => {
    if (!selectedAcademy) return;
    if (!selectedAcademy.sports.some((sport) => sport.sportName === selectedSport)) {
      setSelectedSport(selectedAcademy.sports?.[0]?.sportName || '');
    }
  }, [selectedAcademy, selectedSport]);

  useEffect(() => {
    if (!selectedAcademyId || !selectedSport) return;

    const fetchOperationalData = async () => {
      try {
        setLoadingOps(true);
        const startDate = toDateOnlyString(addDays(new Date(), -1));
        const endDate = toDateOnlyString(addDays(new Date(), 14));

        const [bookingResponse, dropInResponse, coachingResponse] = await Promise.all([
          axios.post('/api/booking/academy-bookings', {
            academyId: selectedAcademyId,
            startDate,
            endDate,
            sport: selectedSport,
          }),
          axios.get(`/api/dropin/academy/${selectedAcademyId}`, {
            params: { startDate, endDate, sport: selectedSport },
          }),
          axios.get(`/api/coaching/academy/${selectedAcademyId}`, {
            params: { startDate, endDate, sport: selectedSport },
          }),
        ]);

        const normalizedBookings = (bookingResponse.data?.bookings || []).map((booking: BookingItem) => {
          const localStart = utcDateTimeToLocalParts(booking.date, booking.startTime);
          const localEnd = utcDateTimeToLocalParts(booking.date, booking.endTime);

          return {
            ...booking,
            localDateObj: localStart?.dateObj,
            localDate: localStart?.date || booking.date,
            localStartTime: localStart?.time || booking.startTime,
            localEndTime: localEnd?.time || booking.endTime,
          };
        }).sort((a: BookingItem, b: BookingItem) => getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime());

        const normalizedDropIns = (dropInResponse.data?.dropIns || []).sort(
          (a: DropInItem, b: DropInItem) => getDropInDateTime(a).getTime() - getDropInDateTime(b).getTime()
        );

        const normalizedCoaching = (coachingResponse.data?.coachingSessions || []).sort(
          (a: CoachingItem, b: CoachingItem) => getCoachingDateTime(a).getTime() - getCoachingDateTime(b).getTime()
        );

        setBookings(normalizedBookings);
        setDropIns(normalizedDropIns);
        setCoachingSessions(normalizedCoaching);
      } catch (error) {
        console.error('Failed to fetch operations data:', error);
        setBookings([]);
        setDropIns([]);
        setCoachingSessions([]);
      } finally {
        setLoadingOps(false);
      }
    };

    fetchOperationalData();
  }, [selectedAcademyId, selectedSport]);

  const now = new Date();
  const sevenDaysAhead = addDays(now, 7);

  const todaysBookings = useMemo(
    () => bookings.filter((booking) => getBookingDateTime(booking).toDateString() === now.toDateString()),
    [bookings, now]
  );

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => getBookingDateTime(booking).getTime() >= now.getTime()),
    [bookings, now]
  );

  const bookingsNext7Days = useMemo(
    () => upcomingBookings.filter((booking) => getBookingDateTime(booking).getTime() <= sevenDaysAhead.getTime()),
    [upcomingBookings, sevenDaysAhead]
  );

  const dropInsNext7Days = useMemo(
    () => dropIns.filter((dropIn) => {
      const dateTime = getDropInDateTime(dropIn);
      return dateTime.getTime() >= now.getTime() && dateTime.getTime() <= sevenDaysAhead.getTime();
    }),
    [dropIns, now, sevenDaysAhead]
  );

  const todayDropIns = useMemo(
    () => dropIns.filter((dropIn) => getDropInDateTime(dropIn).toDateString() === now.toDateString()),
    [dropIns, now]
  );

  const coachingNext7Days = useMemo(
    () => coachingSessions.filter((session) => {
      const dateTime = getCoachingDateTime(session);
      return dateTime.getTime() >= now.getTime() && dateTime.getTime() <= sevenDaysAhead.getTime();
    }),
    [coachingSessions, now, sevenDaysAhead]
  );

  const totalPendingDropInRequests = useMemo(
    () => dropInsNext7Days.reduce((sum, dropIn) => sum + (dropIn.pendingRequests?.length || 0), 0),
    [dropInsNext7Days]
  );

  const totalJoinedDropInParticipants = useMemo(
    () => dropInsNext7Days.reduce((sum, dropIn) => sum + (dropIn.joinedParticipants?.length || 0), 0),
    [dropInsNext7Days]
  );

  const totalCourtsInAcademy = useMemo(
    () => (selectedAcademy?.sports || []).reduce((sum, sport) => sum + Number(sport.numberOfCourts || 0), 0),
    [selectedAcademy]
  );

  const todayBookedMinutes = useMemo(
    () => todaysBookings.reduce((sum, booking) => sum + timeDiffMinutes(booking.startTime, booking.endTime), 0),
    [todaysBookings]
  );

  const selectedSportOperatingMinutes = useMemo(() => {
    if (!selectedSportConfig) return 0;
    return timeDiffMinutes(selectedSportConfig.startTime, selectedSportConfig.endTime);
  }, [selectedSportConfig]);

  const totalAvailableMinutesToday = useMemo(() => {
    if (!selectedSportConfig) return 0;
    return selectedSportOperatingMinutes * selectedSportConfig.numberOfCourts;
  }, [selectedSportConfig, selectedSportOperatingMinutes]);

  const utilizationToday = totalAvailableMinutesToday
    ? Math.min(100, Math.round((todayBookedMinutes / totalAvailableMinutesToday) * 100))
    : 0;

  const totalSportsAcrossAcademies = useMemo(() => {
    const unique = new Set<string>();
    academies.forEach((academy) => {
      (academy.sports || []).forEach((sport) => unique.add(sport.sportName));
    });
    return unique.size;
  }, [academies]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Command Center</h1>
            <p className="text-slate-600 text-lg">
              Welcome, {capitalizeWords(user?.name || 'Academy Manager')}. Track booking load, court utilization and drop-in demand.
            </p>
          </div>
          <Card className="border-slate-200 min-w-[180px]">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Academies</p>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loadingAcademies ? '—' : academies.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 overflow-hidden border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Scope Filters
            </CardTitle>
            <CardDescription>Select academy and sport to focus metrics.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {loadingAcademies ? (
              <p className="text-sm text-slate-500">Loading academies...</p>
            ) : academies.length === 0 ? (
              <p className="text-sm text-slate-600">No academy found for this account yet.</p>
            ) : (
              <>
                <Tabs value={selectedAcademyId} onValueChange={setSelectedAcademyId}>
                  <TabsList className="flex flex-wrap h-auto bg-slate-100 p-1 gap-1">
                    {academies.map((academy) => (
                      <TabsTrigger key={academy._id} value={academy._id} className="rounded-md px-3 py-1.5 text-xs sm:text-sm">
                        {capitalizeWords(academy.name)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {(selectedAcademy?.sports || []).length > 0 && (
                  <Tabs value={selectedSport} onValueChange={setSelectedSport}>
                    <TabsList className="flex flex-wrap h-auto bg-slate-100 p-1 gap-1">
                      {(selectedAcademy?.sports || []).map((sport) => (
                        <TabsTrigger key={sport.sportName} value={sport.sportName} className="rounded-md px-3 py-1.5 text-xs sm:text-sm">
                          {capitalizeWords(sport.sportName)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Sports</p>
                <Trophy className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loadingAcademies ? '—' : totalSportsAcrossAcademies}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Courts (selected academy)</p>
                <Activity className="w-4 h-4 text-cyan-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loadingAcademies ? '—' : totalCourtsInAcademy}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Today bookings</p>
                <Calendar className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loadingOps ? '—' : todaysBookings.length}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Next 7 days load</p>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loadingOps ? '—' : bookingsNext7Days.length}</p>
              <p className="text-[11px] text-slate-500">{dropInsNext7Days.length} drop-ins • {coachingNext7Days.length} coaching classes</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Utilization today</p>
                <Gauge className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loadingOps ? '—' : `${utilizationToday}%`}</p>
              <p className="text-[11px] text-slate-500">{Math.round(todayBookedMinutes / 60)} booked hrs</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Bookings Pipeline (Next 7 Days)
                    </CardTitle>
                    <CardDescription className="mt-0.5">Confirmed courts and players for {capitalizeWords(selectedSport || 'selected sport')}.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingOps ? (
                  <div className="p-6 text-sm text-slate-500">Loading bookings...</div>
                ) : bookingsNext7Days.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No upcoming bookings for the selected scope.</div>
                ) : (
                  <div className="divide-y">
                    {bookingsNext7Days.slice(0, 8).map((booking) => (
                      <div key={booking._id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {capitalizeWords(booking.sport || selectedSport)} • Court {booking.courtNumber}
                          </p>
                          <p className="text-sm text-slate-600">
                            {(booking.localDateObj || new Date(booking.date)).toLocaleDateString()} • {booking.localStartTime || booking.startTime} - {booking.localEndTime || booking.endTime}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Player: {capitalizeWords(booking.userId?.name || booking.userEmail || 'Player')}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 w-fit">Confirmed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b py-4 px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      Drop-In Pipeline (Next 7 Days)
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {totalJoinedDropInParticipants} joined players and {totalPendingDropInRequests} pending requests.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingOps ? (
                  <div className="p-6 text-sm text-slate-500">Loading drop-ins...</div>
                ) : dropInsNext7Days.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No active drop-ins in the next 7 days.</div>
                ) : (
                  <div className="divide-y">
                    {dropInsNext7Days.slice(0, 8).map((dropIn) => {
                      const joined = dropIn.joinedParticipants?.length || 0;
                      const pending = dropIn.pendingRequests?.length || 0;
                      const occupancy = dropIn.maxParticipants ? Math.round((joined / dropIn.maxParticipants) * 100) : 0;

                      return (
                        <div key={dropIn._id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {capitalizeWords(dropIn.title || dropIn.sport)} • Court {dropIn.courtNumber}
                            </p>
                            <p className="text-sm text-slate-600">
                              {new Date(`${dropIn.date}T12:00:00`).toLocaleDateString()} • {dropIn.startTime} - {dropIn.endTime}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Joined {joined}/{dropIn.maxParticipants} ({occupancy}%) • Pending {pending}
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700 w-fit">Active</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  Academy Snapshot
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {selectedAcademy ? capitalizeWords(selectedAcademy.name) : 'No academy selected'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{capitalizeWords(selectedAcademy?.city || selectedAcademy?.address || 'Location not set')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sports configured</span>
                  <span className="font-semibold text-slate-900">{selectedAcademy?.sports?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total courts</span>
                  <span className="font-semibold text-slate-900">{totalCourtsInAcademy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Today's drop-ins</span>
                  <span className="font-semibold text-slate-900">{loadingOps ? '—' : todayDropIns.length}</span>
                </div>
                <div className="pt-2 border-t text-xs text-slate-500">
                  Operating window ({capitalizeWords(selectedSport || 'sport')}): {' '}
                  {selectedSportConfig ? `${selectedSportConfig.startTime} - ${selectedSportConfig.endTime}` : 'Not available'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Sport Capacity Mix</CardTitle>
                <CardDescription>Courts and hours by sport</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedAcademy?.sports || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No sports configured.</p>
                ) : (
                  (selectedAcademy?.sports || []).map((sport) => {
                    const dayMinutes = timeDiffMinutes(sport.startTime, sport.endTime);
                    const dayHours = Math.round((dayMinutes / 60) * 10) / 10;
                    return (
                      <div key={sport.sportName} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-slate-900 text-sm">{capitalizeWords(sport.sportName)}</p>
                          {selectedSport === sport.sportName && <Badge variant="outline">Selected</Badge>}
                        </div>
                        <p className="text-xs text-slate-600">
                          {sport.numberOfCourts} courts • {dayHours} hrs/day ({sport.startTime} - {sport.endTime})
                        </p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}