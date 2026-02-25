import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  Activity,
  User
} from 'lucide-react';

import { capitalizeWords } from '@/lib/utils';

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const userEmail = user?.email;
  const userId = user?.userId;
  const token = localStorage.getItem('token');

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [activitiesJoined, setActivitiesJoined] = useState(0);
  const [recentPastActivities, setRecentPastActivities] = useState([]);
  const [pastHostedActivitiesCount, setPastHostedActivitiesCount] = useState(0);
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
          'http://localhost:5000/api/dashboard/dashboard-data',
          { userEmail, userId }
          // Uncomment if your backend uses auth
          // { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = response.data;

        setUpcomingBookings(data.upcomingBookings || []);
        setBookingCount(data.upcomingBookingsCount || 0);
        setActivitiesJoined(data.pastActivitiesCount || 0);
        setRecentPastActivities(data.recentPastActivities || []);
        setPastHostedActivitiesCount(data.pastHostedActivitiesCount || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PlayrUp</h1>
            <p className="text-muted-foreground">
              Welcome, {capitalizeWords(user.name)}
            </p>
          </div>

          {/* 🔥 USER DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Rest of your dashboard remains EXACTLY SAME */}
      {/* No changes below this line */}

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? '...' : bookingCount}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Activity className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? '...' : activitiesJoined}</p>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? '...' : pastHostedActivitiesCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Hosted Events
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Points Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate your activities and bookings</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button asChild><Link to="/bookcourt">Book a Court</Link></Button>
            <Button asChild><Link to="/my-bookings">My Bookings</Link></Button>
            <Button asChild><Link to="/host-activity">Host Activity</Link></Button>
            <Button variant="outline" asChild><Link to="/activities">View All Activities</Link></Button>
            <Button variant="outline" asChild><Link to="/my-hosted">My Hosted Activities</Link></Button>
            <Button variant="outline" asChild><Link to="/activity-requests">Activity Requests</Link></Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Next 5 Upcoming Bookings
              </CardTitle>
              <CardDescription>Your scheduled court reservations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground">Loading bookings...</p>
              ) : upcomingBookings.length === 0 ? (
                <p className="text-muted-foreground">No upcoming bookings found.</p>
              ) : (
                upcomingBookings.slice(0, 5).map((booking) => (
                  <div key={booking._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{capitalizeWords(booking.sport)} - Court {booking.courtNumber}</h3>
                        {/* <Badge>{capitalizeWords(booking.status)}</Badge> */}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {booking.date.split('-').reverse().join('/')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {capitalizeWords(booking.academyId?.name || 'Unknown Academy')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </CardTitle>
              <CardDescription>Group activities you're involved in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground">Loading activities...</p>
              ) : recentPastActivities.length === 0 ? (
                <p className="text-muted-foreground">No recent activities found.</p>
              ) : (
                recentPastActivities.slice(0, 5).map((activity) => (
                  <div key={activity._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{capitalizeWords(activity.sport)} - Court {activity.courtNumber}</h3>
                        <Badge variant={'outline'}>
                          {activity.hostId.content === userId.content ? 'Host' : 'Participant'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {activity.date?.split('T')[0].split('-').reverse().join('/')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {activity.fromTime} - {activity.toTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {activity.joinedPlayers.length}/{activity.maxPlayers} participants
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}