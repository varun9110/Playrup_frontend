import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout';
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Settings,
  Activity,
  ArrowRight,
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
  const resolved = booking.localDateObj;
  if (resolved instanceof Date && !Number.isNaN(resolved.getTime())) {
    return resolved;
  }

  const base = String(booking.date || '').includes('T')
    ? String(booking.date).split('T')[0]
    : String(booking.date || '');

  const constructed = new Date(`${base}T${booking.startTime || '00:00'}:00`);
  return constructed;
};

export default function AcademyDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.userId;

  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  if (!user) {
    setTimeout(() => navigate('/'), 1000);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">
          Unauthorized access. Redirecting...
        </p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const selectedAcademy = useMemo(
    () => academies.find((academy) => academy._id === selectedAcademyId) || null,
    [academies, selectedAcademyId]
  );

  useEffect(() => {
    if (!userId) return;

    const fetchAcademies = async () => {
      try {
        setLoading(true);
        const res = await axios.post('/api/academy/user-academies', { userId });
        const academyList = res.data?.data || [];
        setAcademies(academyList);

        if (academyList.length > 0) {
          const firstAcademy = academyList[0];
          setSelectedAcademyId(firstAcademy._id);
          setSelectedSport(firstAcademy.sports?.[0]?.sportName || '');
        }
      } catch (error) {
        console.error('Error fetching academies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademies();
  }, [userId]);

  useEffect(() => {
    if (!selectedAcademyId) return;

    const academy = academies.find((item) => item._id === selectedAcademyId);
    if (!academy) return;

    if (academy.sports?.length > 0 && !academy.sports.some((sport) => sport.sportName === selectedSport)) {
      setSelectedSport(academy.sports[0].sportName);
    }
  }, [academies, selectedAcademyId, selectedSport]);

  useEffect(() => {
    if (!selectedAcademyId) return;

    const fetchBookings = async () => {
      try {
        setBookingsLoading(true);

        const startDate = toDateOnlyString(addDays(new Date(), -1));
        const endDate = toDateOnlyString(addDays(new Date(), 14));

        const res = await axios.post('/api/booking/academy-bookings', {
          academyId: selectedAcademyId,
          startDate,
          endDate,
          sport: selectedSport,
        });

        const normalized = (res.data?.bookings || []).map((booking: BookingItem) => {
          const localStart = utcDateTimeToLocalParts(booking.date, booking.startTime);
          const localEnd = utcDateTimeToLocalParts(booking.date, booking.endTime);

          return {
            ...booking,
            localDateObj: localStart?.dateObj,
            localDate: localStart?.date || booking.date,
            localStartTime: localStart?.time || booking.startTime,
            localEndTime: localEnd?.time || booking.endTime,
          };
        });

        normalized.sort((a: BookingItem, b: BookingItem) => {
          return getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime();
        });

        setBookings(normalized);
      } catch (error) {
        console.error('Error fetching academy bookings:', error);
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    };

    fetchBookings();
  }, [selectedAcademyId, selectedSport]);

  const now = new Date();
  const upcomingBookings = bookings.filter((booking) => getBookingDateTime(booking).getTime() >= now.getTime());
  const todaysBookings = bookings.filter((booking) => {
    const date = getBookingDateTime(booking);
    return date.toDateString() === now.toDateString();
  });

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
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                Academy Dashboard
              </h1>
              <p className="text-slate-600 text-lg">
                Welcome, {capitalizeWords(user.name || 'Academy Manager')} - monitor bookings and manage operations.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap md:flex-nowrap">
              <Button className="rounded-lg h-11" asChild>
                <Link to="/academy-setup">
                  <Settings className="w-4 h-4 mr-2" />
                  Academy Setup
                </Link>
              </Button>
              <Button variant="outline" className="rounded-lg h-11" asChild>
                <Link to="/academy-bookings">View Bookings</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Managed</Badge>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Academies</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">{loading ? '—' : academies.length}</p>
                <p className="text-xs text-slate-500 mt-2">Total linked academies</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Sports</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">{loading ? '—' : totalSportsAcrossAcademies}</p>
                <p className="text-xs text-slate-500 mt-2">Sports across academies</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">Today</Badge>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Today's Bookings</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">{bookingsLoading ? '—' : todaysBookings.length}</p>
                <p className="text-xs text-slate-500 mt-2">Confirmed courts today</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Users className="w-6 h-6 text-amber-600" />
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">Upcoming</Badge>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Upcoming Bookings</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">{bookingsLoading ? '—' : upcomingBookings.length}</p>
                <p className="text-xs text-slate-500 mt-2">Next 2 weeks</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Academy Setup', path: '/academy-setup', icon: '⚙️' },
              { label: 'Bookings View', path: '/academy-bookings', icon: '📅' },
              { label: 'Manage Sports', path: '/academy-setup', icon: '🏟️' },
              { label: 'Court Schedule', path: '/academy-bookings', icon: '🗓️' },
              { label: 'Dashboard', path: '/academy-dashboard', icon: '📊' },
              { label: 'Logout', path: '/', icon: '🚪' },
            ].map((action) => (
              <button
                type="button"
                key={action.label}
                onClick={() => {
                  if (action.label === 'Logout') {
                    handleLogout();
                    return;
                  }
                  navigate(action.path);
                }}
                className="group h-full p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all text-left"
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <p className="text-xs font-semibold text-slate-900 leading-tight group-hover:text-primary transition-colors">
                  {action.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Upcoming Academy Bookings
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedAcademy ? `${capitalizeWords(selectedAcademy.name)}${selectedSport ? ` - ${capitalizeWords(selectedSport)}` : ''}` : 'Select an academy to view schedule'}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/academy-bookings">
                      Open Planner
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {bookingsLoading ? (
                  <div className="p-8 text-center text-slate-500">Loading bookings...</div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-500 mb-4">No upcoming bookings found.</p>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/academy-bookings">View Full Booking Board</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {upcomingBookings.slice(0, 6).map((booking) => (
                      <div key={booking._id} className="p-5 md:p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 mb-3">
                              {capitalizeWords(booking.sport || selectedSport || 'Sport')} • Court {booking.courtNumber}
                            </h3>
                            <div className="space-y-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span>{(booking.localDateObj || new Date(booking.date)).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span>{booking.localStartTime || booking.startTime} - {booking.localEndTime || booking.endTime}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span>{capitalizeWords(booking.userId?.name || booking.userEmail || 'Player')}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className="whitespace-nowrap bg-blue-100 text-blue-700 h-fit">Confirmed</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Academy Overview
                </CardTitle>
                <CardDescription className="mt-1">Your configured academies and sports</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center text-slate-500 text-sm">Loading academies...</div>
                ) : academies.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-slate-500 text-sm mb-4">No academies linked yet</p>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/academy-setup">Set Up Academy</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y max-h-[540px] overflow-y-auto">
                    {academies.map((academy) => {
                      const sportCount = academy.sports?.length || 0;
                      return (
                        <button
                          type="button"
                          key={academy._id}
                          onClick={() => {
                            setSelectedAcademyId(academy._id);
                            setSelectedSport(academy.sports?.[0]?.sportName || '');
                          }}
                          className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${selectedAcademyId === academy._id ? 'bg-green-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">
                              {capitalizeWords(academy.name)}
                            </h4>
                            <Badge variant="outline" className="whitespace-nowrap text-xs">
                              {sportCount} sport{sportCount === 1 ? '' : 's'}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {capitalizeWords(academy.city || academy.address || 'Location not set')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {(academy.sports || []).slice(0, 2).map((sport) => capitalizeWords(sport.sportName)).join(', ') || 'No sports configured'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}