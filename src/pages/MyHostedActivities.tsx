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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function MyHostedActivities() {
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [pastActivities, setPastActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityToCancel, setActivityToCancel] = useState(null);
  const [openCancel, setOpenCancel] = useState(false);

  const userEmail = JSON.parse(localStorage.getItem('user'))?.email;
  const userId = JSON.parse(localStorage.getItem("user"))?.userId;

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    if (!userEmail) return;

    try {
      const res = await axios.post(
        'http://localhost:5000/api/activity/userActivities',
        { userEmail, userId }
      );

      const upcoming = [];
      const past = [];

      res.data.activitiesWithEncryptedData.forEach((activity) => {
        const activityDate = new Date(activity.date);
        if (activityDate > new Date()) {
          upcoming.push(activity);
        } else {
          past.push(activity);
        }
      });

      setUpcomingActivities(upcoming);
      setPastActivities(past);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };


  const capitalizeWords = (str) =>
    str ? str.replace(/\b\w/g, (char) => char.toUpperCase()) : '';

  const handleEditActivity = (activity) => console.log('Edit activity', activity);

  const openCancelModal = (activity) => {
    setActivityToCancel(activity);
    setOpenCancel(true);
  };

  /* ---------- CANCEL ACTIVITY ---------- */
  const confirmCancelActivity = async () => {
    if (!activityToCancel) return;

    try {
      const res = await axios.post('http://localhost:5000/api/activity/cancelActivity', {
        activityId: activityToCancel._id,
        hostEmail: userEmail,
        hostId: userId,
      });

      console.log(res.data.message); // Optional: success message

      // REFRESH ACTIVITIES LIST WITH CURRENT FILTERS
      await fetchActivities(); // <-- Fetch latest activities after cancel
    } catch (err) {
      console.error('Failed to cancel activity', err);
    } finally {
      setOpenCancel(false);
      setActivityToCancel(null);
    }
  };

  const renderActivityCard = (activity) => (
    <Card key={activity._id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{capitalizeWords(activity.sport)}</CardTitle>
            <CardDescription className="mt-1">
              Hosted by {activity.host.name}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{capitalizeWords(activity.city)}</Badge>

            {activity.host.id.content === userId.content && (
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upcoming">All Upcoming Activities</TabsTrigger>
            <TabsTrigger value="myactivities">My Hosted Activities</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
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

      
      {/* ================= CANCEL CONFIRMATION MODAL ================= */}
      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">
              Cancel Activity?
            </DialogTitle>
          </DialogHeader>

          {activityToCancel && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Are you sure you want to cancel this activity?
              </p>

              <div className="rounded-lg border p-3 space-y-1">
                <p className="font-semibold">
                  {capitalizeWords(activityToCancel.sport)}
                </p>
                <p>
                  {new Date(activityToCancel.date).toLocaleDateString()} ·{' '}
                  {activityToCancel.fromTime} - {activityToCancel.toTime}
                </p>
                <p>
                  {capitalizeWords(activityToCancel.location) ||
                    capitalizeWords(activityToCancel.address)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenCancel(false)}>
              Keep Activity
            </Button>
            <Button variant="destructive" onClick={confirmCancelActivity}>
              Cancel Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
