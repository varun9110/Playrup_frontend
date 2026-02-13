import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MoreVertical,
} from 'lucide-react';

export default function UserActivityRequests() {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);


  const user = JSON.parse(localStorage.getItem('user')!);
  const userEmail = user?.email;

  useEffect(() => {
  fetchIncomingRequests();
  fetchSentRequests();
}, []);


  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        'http://localhost:5000/api/request/hosted/pending-requests',
        { email: userEmail }
      );

      const requests = res.data.requests || [];

      // Filter out past activities
      const upcomingRequests = requests.filter((request) => {
        const activityDate = new Date(request.activityId.date);
        // Include only today or future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0); // normalize to start of day
        return activityDate >= today;
      });

      // Optional: sort by activity date ascending
      upcomingRequests.sort(
        (a, b) => new Date(a.activityId.date).getTime() - new Date(b.activityId.date).getTime()
      );

      setIncomingRequests(upcomingRequests);
    } catch (err) {
      console.error('Failed to fetch incoming requests', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentRequests = async () => {
  try {
    setLoading(true);

    const res = await axios.post(
      'http://localhost:5000/api/request/my-requests',
      { email: userEmail }
    );

    const requests = res.data.requests || [];

    // Filter out past activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingRequests = requests.filter((request) => {
      const activityDate = new Date(request.activityId.date);
      return activityDate >= today;
    });

    // Sort by date ascending
    upcomingRequests.sort(
      (a, b) =>
        (a, b) => new Date(a.activityId.date).getTime() - new Date(b.activityId.date).getTime()
    );

    setSentRequests(upcomingRequests);

  } catch (error) {
    console.error('Error fetching sent requests:', error);
  } finally {
    setLoading(false);
  }
};



  const handleViewProfile = (email) => {

  };

  const handleApprove = async (requestId) => {

  }

  const handleReject = async (requestId) => {
    
  }

  const handleWithdraw = async (requestId) => {
    
  }


  const renderIncomingRequestCard = (request) => {
    const { activityId } = request;

    return (
      <Card key={request._id}>
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg capitalize">
                {activityId.sport}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activityId.academy}
              </p>
            </div>

            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Pending
            </Badge>
          </div>

          <div className="text-sm grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p>
                {new Date(activityId.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium">
                {activityId.fromTime} – {activityId.toTime}
              </p>
            </div>

            <div className="col-span-2">
              <span className="text-muted-foreground">Requested by</span>
              <p className="font-medium">{request.userEmail}</p>
            </div>
          </div>

          <div className="flex justify-between mt-3 flex-wrap gap-2">
            {/* Left side: View Profile */}
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleViewProfile(request.userEmail)}
            >
              View Player Profile
            </Button>

            {/* Right side: Approve / Reject */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleApprove(request._id)}
              >
                Approve
              </Button>

              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleReject(request._id)}
              >
                Reject
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

    );
  };

  const renderSentRequestCard = (request) => {
    const { activityId } = request;

    return (
      <Card key={request._id}>
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg capitalize">
                {activityId.sport}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activityId.academy}
              </p>
            </div>

            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Pending / Joined
            </Badge>
          </div>

          <div className="text-sm grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p>
                {new Date(activityId.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium">
                {activityId.fromTime} – {activityId.toTime}
              </p>
            </div>

            <div className="col-span-2">
              <span className="text-muted-foreground">Requested by</span>
              <p className="font-medium">{request.userEmail}</p>
            </div>
          </div>
          <div className="flex justify-between mt-3 flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleWithdraw(request._id)}
              >
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Requests</h1>

        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming">Incoming Requests</TabsTrigger>
            <TabsTrigger value="sent">Sent Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Loading requests…</p>
                </CardContent>
              </Card>
            ) : incomingRequests.length ? (
              incomingRequests.map(renderIncomingRequestCard)
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    No pending incoming requests
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Loading requests…</p>
                </CardContent>
              </Card>
            ) : sentRequests.length ? (
              sentRequests.map(renderSentRequestCard)
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    No pending sent requests
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
