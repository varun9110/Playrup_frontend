import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '@/lib/axiosConfig';
import { Navbar } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  Bell,
  Building2,
  Calendar,
  Clock,
  Gauge,
  Globe2,
  GraduationCap,
  LogOut,
  MapPin,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

type OverviewMetrics = {
  totalAcademies: number;
  totalPlayers: number;
  totalAcademyManagers: number;
  totalSports: number;
  totalCities: number;
  confirmedBookingsToday: number;
  confirmedBookingsNext7Days: number;
  activeDropInsNext7Days: number;
  activeCoachingNext7Days: number;
  totalNotifications: number;
  unreadNotifications: number;
  academiesCreatedLast30Days: number;
};

type RecentAcademy = {
  _id: string;
  name: string;
  city: string;
  sportsCount: number;
  createdAt: string;
  updatedAt: string;
};

type CitySnapshot = {
  city: string;
  academyCount: number;
};

type SportSnapshot = {
  sportName: string;
  academyCount: number;
  courtCount: number;
};

type AdminOverviewResponse = {
  metrics?: Partial<OverviewMetrics>;
  recentAcademies?: RecentAcademy[];
  topCities?: CitySnapshot[];
  busiestSports?: SportSnapshot[];
};

const defaultMetrics: OverviewMetrics = {
  totalAcademies: 0,
  totalPlayers: 0,
  totalAcademyManagers: 0,
  totalSports: 0,
  totalCities: 0,
  confirmedBookingsToday: 0,
  confirmedBookingsNext7Days: 0,
  activeDropInsNext7Days: 0,
  activeCoachingNext7Days: 0,
  totalNotifications: 0,
  unreadNotifications: 0,
  academiesCreatedLast30Days: 0,
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString();
};

export default function AdminLanding() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [metrics, setMetrics] = useState<OverviewMetrics>(defaultMetrics);
  const [recentAcademies, setRecentAcademies] = useState<RecentAcademy[]>([]);
  const [topCities, setTopCities] = useState<CitySnapshot[]>([]);
  const [busiestSports, setBusiestSports] = useState<SportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      const timer = setTimeout(() => navigate('/'), 1000);
      return () => clearTimeout(timer);
    }

    const fetchOverview = async () => {
      try {
        setLoading(true);
        setLoadingError('');
        const response = await axios.get<AdminOverviewResponse>('/api/dashboard/admin-overview');
        const payload = response.data || {};

        setMetrics({
          ...defaultMetrics,
          ...(payload.metrics || {}),
        });
        setRecentAcademies(payload.recentAcademies || []);
        setTopCities(payload.topCities || []);
        setBusiestSports(payload.busiestSports || []);
        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error('Failed to fetch superadmin overview:', error);
        setLoadingError('Unable to load live metrics right now. Quick actions are still available.');
        setMetrics(defaultMetrics);
        setRecentAcademies([]);
        setTopCities([]);
        setBusiestSports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [navigate, user]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const activeOperationalLoad = metrics.confirmedBookingsNext7Days + metrics.activeDropInsNext7Days + metrics.activeCoachingNext7Days;
  const notificationReadRate = metrics.totalNotifications
    ? Math.round(((metrics.totalNotifications - metrics.unreadNotifications) / metrics.totalNotifications) * 100)
    : 100;

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-slate-500">Unauthorized access. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-slate-900 md:text-5xl">Superadmin Command Center</h1>
            <p className="text-lg text-slate-600">
              Welcome, {capitalizeWords(user?.name || 'Super Admin')}. Monitor platform growth, operations and global control surfaces.
            </p>
            {lastUpdatedAt && !loading && (
              <p className="mt-2 text-xs text-slate-500">
                Last updated: {lastUpdatedAt.toLocaleTimeString()}
              </p>
            )}
          </div>

          <Card className="min-w-[220px] border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Governance Health</p>
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '—' : `${notificationReadRate}%`}
              </p>
              <p className="text-[11px] text-slate-500">Notification read-rate across all users</p>
            </CardContent>
          </Card>
        </div>

        {loadingError && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-800">{loadingError}</CardContent>
          </Card>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Academies</p>
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.totalAcademies}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Players</p>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.totalPlayers}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Academy admins</p>
                <GraduationCap className="h-4 w-4 text-cyan-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.totalAcademyManagers}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Sports offered</p>
                <Activity className="h-4 w-4 text-violet-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.totalSports}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Cities covered</p>
                <Globe2 className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.totalCities}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Bookings today</p>
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.confirmedBookingsToday}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Next 7 day load</p>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : activeOperationalLoad}</p>
              <p className="text-[11px] text-slate-500">
                {loading ? '—' : `${metrics.confirmedBookingsNext7Days} bookings • ${metrics.activeDropInsNext7Days} drop-ins • ${metrics.activeCoachingNext7Days} coaching`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Unread notifications</p>
                <Bell className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.unreadNotifications}</p>
              <p className="text-[11px] text-slate-500">of {loading ? '—' : metrics.totalNotifications} total notifications</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">New academies (30 days)</p>
                <Gauge className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : metrics.academiesCreatedLast30Days}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Recently Onboarded Academies
                </CardTitle>
                <CardDescription className="mt-0.5">Latest academies added to the platform.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-sm text-slate-500">Loading academy onboarding feed...</div>
                ) : recentAcademies.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No academies onboarded yet.</div>
                ) : (
                  <div className="divide-y">
                    {recentAcademies.map((academy) => (
                      <div key={academy._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{capitalizeWords(academy.name)}</p>
                          <p className="text-sm text-slate-600">
                            {academy.city ? capitalizeWords(academy.city) : 'City unavailable'} • {academy.sportsCount} sports configured
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Created on {formatDate(academy.createdAt)}</p>
                        </div>
                        <Badge className="w-fit bg-blue-100 text-blue-700">Onboarded</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  City Footprint
                </CardTitle>
                <CardDescription className="mt-0.5">Top cities by academy concentration.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-sm text-slate-500">Loading city distribution...</div>
                ) : topCities.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">City data not available yet.</div>
                ) : (
                  <div className="divide-y">
                    {topCities.map((city) => (
                      <div key={`${city.city}-${city.academyCount}`} className="flex items-center justify-between p-4">
                        <p className="font-medium text-slate-900">{capitalizeWords(city.city || 'Unknown')}</p>
                        <Badge variant="outline">{city.academyCount} academies</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="border-b bg-gradient-to-r from-slate-100 to-slate-50 px-6 py-4">
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription className="mt-0.5">Access existing superadmin controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <Link to="/admin/onboard" className="block">
                  <Button className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700">
                    <Building2 className="mr-2 h-4 w-4" />
                    Onboard New Academy
                  </Button>
                </Link>

                <Link to="/admin/bookings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    View Admin Bookings
                  </Button>
                </Link>

                <Link to="/admin/notifications" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="mr-2 h-4 w-4" />
                    Manage Notifications
                  </Button>
                </Link>

                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Live Metrics
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Sport Coverage Snapshot</CardTitle>
                <CardDescription>Most represented sports by academy count</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading sport mix...</p>
                ) : busiestSports.length === 0 ? (
                  <p className="text-sm text-slate-500">No sports configured yet.</p>
                ) : (
                  busiestSports.map((sport) => (
                    <div key={sport.sportName} className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{capitalizeWords(sport.sportName || 'Unknown')}</p>
                        <Badge variant="outline">{sport.academyCount} academies</Badge>
                      </div>
                      <p className="text-xs text-slate-600">{sport.courtCount} total courts configured</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
