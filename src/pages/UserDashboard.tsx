import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Trophy, Activity } from 'lucide-react';

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  console.log("User data from localStorage:", user);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const upcomingBookings = [
    {
      id: 1,
      sport: 'Basketball',
      court: 'Court A',
      date: '2024-01-15',
      time: '6:00 PM - 8:00 PM',
      location: 'Downtown Sports Center',
      status: 'confirmed'
    },
    {
      id: 2,
      sport: 'Tennis',
      court: 'Court 3',
      date: '2024-01-17',
      time: '10:00 AM - 11:30 AM',
      location: 'Riverside Tennis Club',
      status: 'pending'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      title: 'Friday Night Basketball',
      participants: 8,
      maxParticipants: 10,
      date: '2024-01-19',
      time: '7:00 PM',
      status: 'joining'
    },
    {
      id: 2,
      title: 'Weekend Tennis Tournament',
      participants: 12,
      maxParticipants: 16,
      date: '2024-01-20',
      time: '9:00 AM',
      status: 'hosting'
    }
  ];

  if (!user) {
    setTimeout(() => navigate('/'), 1000);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Unauthorized access. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PlayrUp</h1>
            {/* <p className="text-muted-foreground">Welcome, {user.email}</p> */}
            {/* <p className="text-sm text-muted-foreground">Phone: {user.phone}</p> */}
            <p className="text-muted-foreground">Welcome, USER NAME HERE</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLogout} variant="destructive">Logout</Button>
          </div>
        </div>
      </header>

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
                  <p className="text-2xl font-bold">3</p>
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
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-sm text-muted-foreground">Activities Joined</p>
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
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-sm text-muted-foreground">Hosted Events</p>
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
                  <p className="text-2xl font-bold">150</p>
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
                Upcoming Bookings
              </CardTitle>
              <CardDescription>Your scheduled court reservations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{booking.sport} - {booking.court}</h3>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {booking.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {booking.location}
                    </div>
                  </div>
                </div>
              ))}
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
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{activity.title}</h3>
                      <Badge variant={activity.status === 'hosting' ? 'default' : 'outline'}>
                        {activity.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {activity.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {activity.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {activity.participants}/{activity.maxParticipants} participants
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
