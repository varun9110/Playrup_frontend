import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout';
import {
  Calendar,
  Clock,
  Users,
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { utcDateTimeToLocalParts } from '@/lib/utils';
import ActivityParticipantsDialog from '@/components/activities/ActivityParticipantsDialog';

type EncryptedValue = {
  iv: string;
  content: string;
  tag: string;
};

type ActivityData = {
  _id: string;
  sport?: string;
  academy?: string;
  date?: string;
  fromTime?: string;
  toTime?: string;
  localDateObj?: Date;
  localFromTime?: string;
  localToTime?: string;
};

type RequestUser = {
  _id: string;
  name?: string;
};

type HostDetails = {
  name?: string;
};

type RequestItem = {
  _id: string;
  status?: 'Pending' | 'Accepted' | 'Rejected' | string;
  approving?: boolean;
  rejecting?: boolean;
  withdrawing?: boolean;
  userId: RequestUser;
  hostDetails?: HostDetails;
  activityId: ActivityData;
};

export default function UserActivityRequests() {
  const navigate = useNavigate();
  const [incomingRequests, setIncomingRequests] = useState<RequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [selectedParticipantsActivity, setSelectedParticipantsActivity] = useState<ActivityData | null>(null);

  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const userEmail = storedUser?.email;
  const userId = storedUser?.userId;

  const getComparableValue = (value?: EncryptedValue | string | null) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.content || '';
  };

  const currentUserId = getComparableValue(userId);

  const capitalizeWordsSafe = (value?: string) => {
    if (!value) return '';
    return value
      .toLowerCase()
      .trim()
      .split(/[ _-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    fetchIncomingRequests();
    fetchSentRequests();
  }, []);

  const sortRequestsByActivityDate = (requests: RequestItem[]) => {
    return requests.sort((a, b) => {
      const dateA = a.activityId?.localDateObj instanceof Date
        ? a.activityId.localDateObj.getTime()
        : 0;
      const dateB = b.activityId?.localDateObj instanceof Date
        ? b.activityId.localDateObj.getTime()
        : 0;
      return dateA - dateB;
    });
  };


  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        '/api/request/hosted/pending-requests',
        { userEmail, userId }
      );

      const requests = res.data.requests || [];
      const normalizedRequests = requests.map((request: RequestItem) => {
        const activity: ActivityData = (request.activityId || {}) as ActivityData;
        const localStart = utcDateTimeToLocalParts(activity.date || '', activity.fromTime || '');
        const localEnd = utcDateTimeToLocalParts(activity.date || '', activity.toTime || '');
        return {
          ...request,
          activityId: {
            ...activity,
            localDate: localStart?.date || activity.date,
            localDateObj: localStart?.dateObj,
            localFromTime: localStart?.time || activity.fromTime,
            localToTime: localEnd?.time || activity.toTime,
          },
        };
      });

      setIncomingRequests(sortRequestsByActivityDate(normalizedRequests));
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
        '/api/request/my-requests',
        { userEmail, userId }
      );

      const requests = res.data.requests || [];
      const normalizedRequests = requests.map((request: RequestItem) => {
        const activity: ActivityData = (request.activityId || {}) as ActivityData;
        const localStart = utcDateTimeToLocalParts(activity.date || '', activity.fromTime || '');
        const localEnd = utcDateTimeToLocalParts(activity.date || '', activity.toTime || '');
        return {
          ...request,
          activityId: {
            ...activity,
            localDate: localStart?.date || activity.date,
            localDateObj: localStart?.dateObj,
            localFromTime: localStart?.time || activity.fromTime,
            localToTime: localEnd?.time || activity.toTime,
          },
        };
      });

      setSentRequests(sortRequestsByActivityDate(normalizedRequests));

    } catch (error) {
      console.error('Error fetching sent requests:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleViewProfile = (_userId: string | EncryptedValue) => {
    if (getComparableValue(_userId) === currentUserId) {
      navigate('/profile');
      return;
    }

    const userToken = encodeURIComponent(JSON.stringify(_userId));
    navigate(`/participant-profile/${userToken}`);
  };

  const openParticipantsDialog = (activity: ActivityData) => {
    setSelectedParticipantsActivity(activity);
    setShowParticipantsDialog(true);
  };

  const handleApprove = async (requestId: string, activityId: string, requestUserId: string) => {
    try {
      // Optional: disable button while processing
      setIncomingRequests(prev =>
        prev.map(req =>
          req._id === requestId ? { ...req, approving: true } : req
        )
      );

      const res = await axios.post(
        '/api/request/approve-request',
        {
          requestId,
          activityId,
          userId: requestUserId
        }
      );

      // Remove from UI after successful approval
      setIncomingRequests(prev =>
        prev.filter(req => req._id !== requestId)
      );

      console.log(res.data.message);

    } catch (error) {
      console.error('Error approving request:', error.response?.data || error);

      alert(error.response?.data?.message || 'Failed to approve request');

      // Re-enable button if failed
      setIncomingRequests(prev =>
        prev.map(req =>
          req._id === requestId ? { ...req, approving: false } : req
        )
      );
    }
  };


  const handleReject = async (requestId: string, activityId: string, requestUserId: string) => {
    try {
      // Disable button while rejecting
      setIncomingRequests(prev =>
        prev.map(req =>
          req._id === requestId ? { ...req, rejecting: true } : req
        )
      );

      const res = await axios.post(
        '/api/request/reject-request',
        {
          requestId,
          activityId,
          userId: requestUserId
        }
      );

      console.log(res.data.message);

      // Remove request from UI after rejection
      setIncomingRequests(prev =>
        prev.filter(req => req._id !== requestId)
      );

    } catch (error) {
      console.error('Error rejecting request:', error.response?.data || error);

      alert(error.response?.data?.message || 'Failed to reject request');

      // Re-enable button if failed
      setIncomingRequests(prev =>
        prev.map(req =>
          req._id === requestId ? { ...req, rejecting: false } : req
        )
      );
    }
  };


  const handleWithdraw = async (requestId: string, activityId: string, requestUserId: string) => {
    try {
      // Disable button while withdrawing
      setSentRequests(prev =>
        prev.map(req =>
          req._id === requestId ? { ...req, withdrawing: true } : req
        )
      );

      const res = await axios.post(
        '/api/request/withdraw-request',
        {
          requestId,
          activityId,
          userId: requestUserId
        }
      );

      console.log(res.data.message);

      // Remove request from UI after successful withdrawal
      setSentRequests(prev =>
        prev.filter(req => req._id !== requestId)
      );

    } catch (error) {
      console.error('Error withdrawing request:', error.response?.data || error);

      alert(error.response?.data?.message || 'Failed to withdraw request');

      // Re-enable button if failed
      setSentRequests(prev =>
        prev.map(req =>
          req._id === requestId ? { ...req, withdrawing: false } : req
        )
      );
    }
  };



  const pendingSentCount = useMemo(
    () => sentRequests.filter((request) => request.status === 'Pending').length,
    [sentRequests]
  );

  const acceptedSentCount = useMemo(
    () => sentRequests.filter((request) => request.status === 'Accepted').length,
    [sentRequests]
  );

  const renderIncomingRequestCard = (request: RequestItem) => {
    const { activityId } = request;

    return (
      <Card key={request._id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg capitalize">
                {capitalizeWordsSafe(activityId.sport) || 'Activity'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {capitalizeWordsSafe(activityId.academy) || 'Academy'}
              </p>
            </div>

            <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">
              Pending
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p>
                {(activityId.localDateObj || new Date(activityId.date || '')).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Time:</span>
              <p className="font-medium">
                {activityId.localFromTime || activityId.fromTime} – {activityId.localToTime || activityId.toTime}
              </p>
            </div>

            <div className="col-span-1 sm:col-span-2 flex items-center gap-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Requested by:</span>
              <button
                type="button"
                className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
                onClick={() => handleViewProfile(request.userId._id)}
              >
                {request.userId.name}
              </button>
            </div>
          </div>

          <div className="flex justify-between mt-3 flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openParticipantsDialog(request.activityId)}
            >
              View Participants
            </Button>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() =>
                  handleApprove(
                    request._id,
                    request.activityId._id,
                    request.userId._id
                  )
                }
                disabled={request.approving}
              >
                {request.approving ? 'Approving...' : 'Approve'}
              </Button>

              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() =>
                  handleReject(
                    request._id,
                    request.activityId._id,
                    request.userId._id
                  )
                }
                disabled={request.rejecting}
              >
                {request.rejecting ? 'Rejecting...' : 'Reject'}
              </Button>

            </div>
          </div>
        </CardContent>
      </Card>

    );
  };

  const renderSentRequestCard = (request: RequestItem) => {
    const { activityId } = request;

    return (
      <Card key={request._id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b py-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg capitalize">
                {capitalizeWordsSafe(activityId.sport) || 'Activity'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {capitalizeWordsSafe(activityId.academy) || 'Academy'}
              </p>
            </div>

            <Badge
              variant="outline"
              className={`capitalize
              ${request.status === 'Pending'
                  ? 'text-yellow-600 border-yellow-600'
                  : request.status === 'Accepted'
                    ? 'text-green-600 border-green-600'
                    : request.status === 'Rejected'
                      ? 'text-red-600 border-red-600'
                      : ''
                }
  `}
            >
              {request.status}
            </Badge>

          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-green-600" />
              <p>
                {(activityId.localDateObj || new Date(activityId.date || '')).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Time:</span>
              <p className="font-medium">
                {activityId.localFromTime || activityId.fromTime} – {activityId.localToTime || activityId.toTime}
              </p>
            </div>

            <div className="col-span-1 sm:col-span-2 flex items-center gap-1">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Requested to:</span>
              <p className="font-medium">{request.hostDetails.name}</p>
            </div>
          </div>
          <div className="flex justify-between mt-3 flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openParticipantsDialog(request.activityId)}
              >
                View Participants
              </Button>

              {request.status === 'Pending' || request.status === 'Accepted' ? (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() =>
                    handleWithdraw(
                      request._id,
                      request.activityId._id,
                      request.userId._id
                    )
                  }
                  disabled={request.withdrawing}
                >
                  {request.withdrawing ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              ) : null}

            </div>
          </div>
        </CardContent>
      </Card>

    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      }} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Activity Requests</h1>
            <p className="text-slate-600 text-lg">
              Manage incoming join requests and track requests you have sent.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button className="rounded-lg h-11" onClick={() => navigate('/activities')}>
              Browse Activities
            </Button>
            <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Inbox className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Incoming Pending</p>
                <p className="text-2xl font-bold text-slate-900">{incomingRequests.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <Send className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Sent Pending</p>
                <p className="text-2xl font-bold text-slate-900">{pendingSentCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Accepted</p>
                <p className="text-2xl font-bold text-slate-900">{acceptedSentCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-100">
                <XCircle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Sent</p>
                <p className="text-2xl font-bold text-slate-900">{sentRequests.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="incoming" className="space-y-0">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100 px-6 pt-5 pb-0">
                <TabsList className="bg-transparent border-0 h-auto p-0 gap-0 w-full justify-start">
                  <TabsTrigger
                    value="incoming"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 px-5 pb-3 pt-1 font-medium"
                  >
                    Incoming Requests
                    <span className="ml-2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5">
                      {incomingRequests.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="sent"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 px-5 pb-3 pt-1 font-medium"
                  >
                    Sent Requests
                    <span className="ml-2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5">
                      {sentRequests.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="incoming" className="p-6 space-y-4 mt-0">
                {loading ? (
                  <Card className="border-slate-200">
                    <CardContent className="p-10 text-center text-slate-500">Loading requests...</CardContent>
                  </Card>
                ) : incomingRequests.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {incomingRequests.map(renderIncomingRequestCard)}
                  </div>
                ) : (
                  <Card className="border-slate-200">
                    <CardContent className="p-10 text-center text-slate-500">
                      No pending incoming requests.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="sent" className="p-6 space-y-4 mt-0">
                {loading ? (
                  <Card className="border-slate-200">
                    <CardContent className="p-10 text-center text-slate-500">Loading requests...</CardContent>
                  </Card>
                ) : sentRequests.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sentRequests.map(renderSentRequestCard)}
                  </div>
                ) : (
                  <Card className="border-slate-200">
                    <CardContent className="p-10 text-center text-slate-500">
                      No sent requests yet.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <ActivityParticipantsDialog
        open={showParticipantsDialog}
        onOpenChange={setShowParticipantsDialog}
        activityId={selectedParticipantsActivity?._id}
        activityTitle={capitalizeWordsSafe(selectedParticipantsActivity?.sport) || 'Activity'}
        onViewProfile={(participantId) => {
          setShowParticipantsDialog(false);
          handleViewProfile(participantId);
        }}
      />
    </div>
  );
}

