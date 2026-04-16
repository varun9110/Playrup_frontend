import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  Activity,
  ArrowRight,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { utcDateTimeToLocalParts } from '@/lib/utils';
import { capitalizeWords } from '@/lib/utils';

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const userEmail = user?.email;
  const userId = user?.userId;

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [activitiesJoined, setActivitiesJoined] = useState(0);
  const [recentPastActivities, setRecentPastActivities] = useState([]);
  const [pastHostedActivitiesCount, setPastHostedActivitiesCount] = useState(0);
  const [totalKarmaPoints, setTotalKarmaPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!user) {
    setTimeout(() => navigate('/'), 1000);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Unauthorized access. Redirecting...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const response = await axios.post(
          '/api/dashboard/dashboard-data',
          { userEmail, userId }
        );

        const data = response.data;
        const normalizeDateTimeItem = (item) => {
          const localStart = utcDateTimeToLocalParts(item.date, item.startTime || item.fromTime);
          const localEnd = utcDateTimeToLocalParts(item.date, item.endTime || item.toTime);
          return {
            ...item,
            localDate: localStart?.date || item.date,
            localDateObj: localStart?.dateObj,
            localStartTime: localStart?.time || item.startTime || item.fromTime,
            localEndTime: localEnd?.time || item.endTime || item.toTime,
          };
        };

        setUpcomingBookings((data.upcomingBookings || []).map(normalizeDateTimeItem));
        setBookingCount(data.upcomingBookingsCount || 0);
        setActivitiesJoined(data.pastActivitiesCount || 0);
        setRecentPastActivities((data.recentPastActivities || []).map(normalizeDateTimeItem));
        setPastHostedActivitiesCount(data.pastHostedActivitiesCount || 0);
        setTotalKarmaPoints(data.totalKarmaPoints || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navbar */}
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                Welcome back, {capitalizeWords(user.name || 'User')}! 👋
              </h1>
              <p className="text-slate-600 text-lg">
                Your sports dashboard - track bookings, activities & achievements
              </p>
            </div>
            <div className="flex gap-3 flex-wrap md:flex-nowrap">
              <Button asChild className="rounded-lg h-11">
                <Link to="/host-activity">
                  <Zap className="w-4 h-4 mr-2" />
                  Host Activity
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg h-11">
                <Link to="/bookcourt">Book Court</Link>
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Upcoming Bookings */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/my-bookings')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  {bookingCount > 0 && <Badge className="bg-blue-100 text-blue-700">Active</Badge>}
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Upcoming Bookings</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">
                  {loading ? '—' : bookingCount}
                </p>
                <p className="text-xs text-slate-500 mt-2">Court reservations</p>
              </CardContent>
            </Card>

            {/* Activities Joined */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/activities')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  {activitiesJoined > 0 && <Badge className="bg-green-100 text-green-700">Growing</Badge>}
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Activities Joined</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">
                  {loading ? '—' : activitiesJoined}
                </p>
                <p className="text-xs text-slate-500 mt-2">Total participated</p>
              </CardContent>
            </Card>

            {/* Hosted Events */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/my-hosted')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  {pastHostedActivitiesCount > 0 && <Badge className="bg-purple-100 text-purple-700">Organizer</Badge>}
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Hosted Events</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">
                  {loading ? '—' : pastHostedActivitiesCount}
                </p>
                <p className="text-xs text-slate-500 mt-2">Events organized</p>
              </CardContent>
            </Card>

            {/* Karma Points */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-amber-600" />
                  </div>
                  {totalKarmaPoints > 0 && <Badge className="bg-amber-100 text-amber-700"><TrendingUp className="w-3 h-3 mr-1" />+12%</Badge>}
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Karma Points</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-900">
                  {loading ? '—' : totalKarmaPoints}
                </p>
                <p className="text-xs text-slate-500 mt-2">Reputation score</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Book Court', path: '/bookcourt', icon: '🏀', color: 'from-blue-400 to-blue-600' },
              { label: 'My Bookings', path: '/my-bookings', icon: '📅', color: 'from-indigo-400 to-indigo-600' },
              { label: 'Host Activity', path: '/host-activity', icon: '⚽', color: 'from-green-400 to-green-600' },
              { label: 'Browse', path: '/activities', icon: '🔍', color: 'from-purple-400 to-purple-600' },
              { label: 'My Activities', path: '/my-hosted', icon: '🏆', color: 'from-amber-400 to-amber-600' },
              { label: 'Requests', path: '/activity-requests', icon: '📬', color: 'from-pink-400 to-pink-600' },
            ].map((action) => (
              <Link key={action.path} to={action.path}>
                <div className="group h-full p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-3xl mb-2">{action.icon}</div>
                  <p className="text-xs font-semibold text-slate-900 text-center leading-tight group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Bookings - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Upcoming Bookings
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Your next scheduled court reservations
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/my-bookings">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading your bookings...</div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-500 mb-4">No upcoming bookings yet</p>
                    <Button asChild size="sm">
                      <Link to="/bookcourt">Book a Court</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {upcomingBookings.slice(0, 5).map((booking) => (
                      <div key={booking._id} className="p-5 md:p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 mb-3">
                              {capitalizeWords(booking.sport)} • Court {booking.courtNumber}
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
                                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span>{capitalizeWords(booking.academyId?.name || 'Academy')}</span>
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

          {/* Recent Activities - Sidebar */}
          <div>
            <Card className="overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="w-5 h-5 text-green-600" />
                  Recent Activities
                </CardTitle>
                <CardDescription className="mt-1">Your latest group activities</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center text-slate-500 text-sm">Loading...</div>
                ) : recentPastActivities.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-slate-500 text-sm mb-4">No recent activities</p>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/activities">Explore Activities</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {recentPastActivities.slice(0, 6).map((activity) => (
                      <div key={activity._id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">
                            {capitalizeWords(activity.sport)}
                          </h4>
                          <Badge variant="outline" className="whitespace-nowrap text-xs">
                            {activity.hostId?.content === userId.content ? 'Host' : 'Player'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {(activity.localDateObj || new Date(activity.date)).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.localStartTime || activity.fromTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {activity.joinedPlayers?.length}/{activity.maxPlayers} players
                          </div>
                        </div>
                      </div>
                    ))}
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
