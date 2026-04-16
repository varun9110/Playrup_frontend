import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout';
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
  Activity,
  Compass,
  Zap,
  MoreVertical,
} from 'lucide-react';
import { utcDateTimeToLocalParts } from '@/lib/utils';

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
  const navigate = useNavigate();

  const userEmail = JSON.parse(localStorage.getItem('user'))?.email;
  const userId = JSON.parse(localStorage.getItem("user"))?.userId;

  const getComparableValue = (value) => {
    if (typeof value === 'string') return value;
    return value?.content || '';
  };

  const currentUserId = getComparableValue(userId);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };


  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        '/api/activity/allActivities'
      );
      const normalized = (res.data || []).map((activity) => {
        const localStart = utcDateTimeToLocalParts(activity.date, activity.fromTime);
        const localEnd = utcDateTimeToLocalParts(activity.date, activity.toTime);
        return {
          ...activity,
          localDate: localStart?.date || activity.date,
          localDateObj: localStart?.dateObj,
          localFromTime: localStart?.time || activity.fromTime,
          localToTime: localEnd?.time || activity.toTime,
        };
      });
      setActivities(normalized);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchActivities();
  }, []);

  // Helper functions
  const isJoined = (activity) => {
    return activity.joinedPlayers?.some((player) => getComparableValue(player) === currentUserId);
  };

  const isRequested = (activity) => {
    return activity.pendingRequests?.some((player) => {
      const comparablePlayer = getComparableValue(player);
      return comparablePlayer === currentUserId || player === userEmail;
    });
  };


  /* ---------- ACTION HANDLERS ---------- */

  const handleJoinActivity = async (activityId) => {
    if (!userEmail) return;

    try {
      const res = await axios.post('/api/activity/requestJoin', {
        activityId,
        userEmail,
        userId,
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
      const res = await axios.post('/api/activity/cancelActivity', {
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

  const hostedCount = activities.filter((activity) => getComparableValue(activity?.host?.id) === currentUserId).length;
  const joinedCount = activities.filter((activity) => isJoined(activity)).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                Browse Activities
              </h1>
              <p className="text-slate-600 text-lg">
                Find, join, and manage sports activities near you
              </p>
            </div>
            <div className="flex gap-3 flex-wrap md:flex-nowrap">
              <Button className="rounded-lg h-11" onClick={() => navigate('/host-activity')}>
                <Zap className="w-4 h-4 mr-2" />
                Host Activity
              </Button>
              <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Total Activities</p>
                <p className="text-3xl font-bold text-slate-900">{activities.length}</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Joined by You</p>
                <p className="text-3xl font-bold text-slate-900">{joinedCount}</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Compass className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-slate-600 text-sm font-medium mb-2">Hosted by You</p>
                <p className="text-3xl font-bold text-slate-900">{hostedCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6 overflow-hidden border-slate-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="text-slate-900">Find Activities</CardTitle>
              <CardDescription>Filter by sport, city, or location</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by sport, city or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="w-full md:w-52">
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
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-10 text-center text-slate-500">
              Loading activities...
            </CardContent>
          </Card>
        ) : filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-slate-500 mb-4">No activities found for the selected filters.</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedSport('all'); }}>
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => {
              const isHost = getComparableValue(activity?.host?.id) === currentUserId;

              return (
                <Card key={activity._id} className="overflow-hidden border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-slate-900">
                          {capitalizeWords(activity.sport)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Hosted by {capitalizeWords(activity.host?.name || 'Host')}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-slate-300 text-slate-700">
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
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>
                          {(activity.localDateObj || new Date(activity.date)).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>
                          {activity.localFromTime || activity.fromTime} - {activity.localToTime || activity.toTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span>
                          {capitalizeWords(activity.location) ||
                            capitalizeWords(activity.address)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span>
                          {activity.joinedPlayers?.length || 0}/
                          {activity.maxPlayers} players
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="text-xs py-1 px-2">
                          {activity.skillLevel ? capitalizeWords(activity.skillLevel) : 'Any'}
                        </Badge>
                        <span className="text-slate-500 text-xs">Skill Level</span>
                      </div>
                    </div>

                    {!isHost && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleJoinActivity(activity._id)}
                        disabled={isJoined(activity) || isRequested(activity)}
                      >
                        {isJoined(activity)
                          ? 'Joined'
                          : isRequested(activity)
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
        <DialogContent className="max-w-md border-slate-200">
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
                  {(activityToCancel.localDateObj || new Date(activityToCancel.date)).toLocaleDateString()} ·{' '}
                  {activityToCancel.localFromTime || activityToCancel.fromTime} - {activityToCancel.localToTime || activityToCancel.toTime}
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

