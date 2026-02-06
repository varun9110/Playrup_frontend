import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { capitalizeWords } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  MoreVertical,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";

export default function AllActivities() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openCancel, setOpenCancel] = useState(false);
  const [activityToCancel, setActivityToCancel] = useState(null);

  const { toast } = useToast();

  const userEmail = JSON.parse(localStorage.getItem('user'))?.email;


  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        'http://localhost:5000/api/activity/allActivities'
      );
      setActivities(res.data || []);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchActivities();
  }, []);

  /* ---------- ACTION HANDLERS ---------- */

  const handleJoinActivity = async (activityId) => {
    if (!userEmail) return;

    try {
      const res = await axios.post('http://localhost:5000/api/activity/requestJoin', {
        activityId,
        userEmail,
      });

      console.log(res.data.message);
      toast({ title: res.data.message });

      // Optional: update the frontend state to reflect pending request
      setActivities((prev) =>
        prev.map((a) =>
          a._id === activityId
            ? {
              ...a,
              pendingRequests: [...(a.pendingRequests || []), userEmail],
            }
            : a
        )
      );
    } catch (err) {
      console.error(err);
      toast({
        title: err.response?.data?.message || 'Failed to request to join',
        variant: 'destructive',
      });
    }
  };

  const handleEditActivity = (activity) => {
    console.log('Edit activity:', activity);
    // navigate(`/activities/edit/${activity._id}`);
  };

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

  /* ---------- FILTERS ---------- */
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.sport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSport =
      selectedSport === 'all' ||
      activity.sport?.toLowerCase() === selectedSport;

    return matchesSearch && matchesSport;
  });

  const sports = ['Basketball', 'Tennis', 'Badminton', 'Volleyball', 'Football'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Browse Activities</h1>
          <p className="text-muted-foreground">
            Find and join sports activities in your area
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sport, city or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  {sports.map((sport) => (
                    <SelectItem key={sport} value={sport.toLowerCase()}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        {loading ? (
          <p className="text-center text-muted-foreground">
            Loading activities...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => {
              const isHost = activity.hostEmail === userEmail;

              return (
                <Card key={activity._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {capitalizeWords(activity.sport)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Hosted by {activity.hostEmail}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {capitalizeWords(activity.city)}
                        </Badge>

                        {isHost && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditActivity(activity)}
                              >
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
                          {capitalizeWords(activity.location) ||
                            capitalizeWords(activity.address)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {activity.joinedPlayers?.length || 0}/
                          {activity.maxPlayers} players
                        </span>
                      </div>
                    </div>

                    {!isHost && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleJoinActivity(activity._id)}
                        disabled={activity.pendingRequests?.includes(userEmail) || activity.joinedPlayers?.includes(userEmail)}
                      >
                        {activity.joinedPlayers?.includes(userEmail)
                          ? 'Joined'
                          : activity.pendingRequests?.includes(userEmail)
                            ? 'Requested'
                            : 'Join Activity'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
