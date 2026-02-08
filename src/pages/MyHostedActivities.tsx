import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MoreVertical,
} from 'lucide-react';

export default function MyHostedActivities() {
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [pastActivities, setPastActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user')!);
  const userEmail = user?.email;

  const isHost = true; // Replace with real logic to check if user is host

  useEffect(() => {
    if (!userEmail) return;

    const fetchActivities = async () => {
      try {
        const res = await axios.post(
          'http://localhost:5000/api/activity/userActivities',
          { userEmail }
        );

        const upcoming = [];
        const past = [];

        res.data.activities.forEach((activity) => {
          // Parse the date from API (ISO string)
          const activityDate = new Date(activity.date);

          if (activityDate > new Date()) {
            upcoming.push(activity);
          } else {
            past.push(activity);
          }
        });

        // Optional: sort by date
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        past.sort((a, b) => new Date(b.date) - new Date(a.date));

        setUpcomingActivities(upcoming);
        setPastActivities(past);
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [userEmail]);

  const capitalizeWords = (str) =>
    str ? str.replace(/\b\w/g, (char) => char.toUpperCase()) : '';

  const handleEditActivity = (activity) => console.log('Edit activity', activity);
  const openCancelModal = (activity) => console.log('Cancel activity', activity);

  const renderActivityCard = (activity) => (
    <Card key={activity._id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{capitalizeWords(activity.sport)}</CardTitle>
            <CardDescription className="mt-1">
              Hosted by {activity.hostEmail}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{capitalizeWords(activity.city)}</Badge>

            {isHost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditActivity(activity)}>
                    Edit Activity
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => openCancelModal(activity)}
                  >
                    Cancel Activity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {new Date(activity.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
            <span>
              {activity.fromTime} - {activity.toTime}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {capitalizeWords(activity.location) || capitalizeWords(activity.address)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {activity.joinedPlayers?.length || 0}/{activity.maxPlayers} players
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-2">
              {activity.skillLevel ? capitalizeWords(activity.skillLevel) : 'Any'}
            </Badge>
            <span className="text-muted-foreground text-xs">Skill Level</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) return <p className="text-center mt-10">Loading activities...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Hosted Activities</h1>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming Activities</TabsTrigger>
            <TabsTrigger value="past">Past Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingActivities.length
              ? upcomingActivities.map(renderActivityCard)
              : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No upcoming activities yet</p>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastActivities.length
              ? pastActivities.map(renderActivityCard)
              : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No past activities yet</p>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
