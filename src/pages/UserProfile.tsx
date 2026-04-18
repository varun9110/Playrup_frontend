import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Star, User, Wallet, PlusCircle, TrendingUp, Target, Trash2 } from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';
import { Navbar } from '@/components/layout';

type FeedbackProfile = {
  noShowCount: number;
  totalFeedbackReceived: number;
  punctual: {
    punctualCount: number;
    lateCount: number;
    ratedCount: number;
    punctualityPercentage: number;
  };
  teamPlayer: {
    totalScore: number;
    ratingCount: number;
    averageScore: number;
  };
  paymentReliability: {
    totalScore: number;
    ratingCount: number;
    averageScore: number;
  };
  skillLevel: {
    ratingCount: number;
    averageScore: number;
    averageLabel: string;
    counts: Record<string, number>;
  };
  lastFeedbackAt: string | null;
};

type PlayPal = {
  id: { content: string };
  name: string;
  email: string;
};

type RecentActivityRating = {
  activityId: { content: string };
  playedAt: string | null;
  ratingScore: number;
  ratingLabel: string;
};

type SportRating = {
  sportName: string;
  selfRating: {
    score: number;
    label: string;
  };
  receivedRatingComparison: {
    averageScore: number;
    averageLabel: string;
    basedOnRatings: number;
    last5ActivitiesAverageScore: number;
    last5ActivitiesAverageLabel: string;
  };
  recentActivityRatings: RecentActivityRating[];
};

type UserSummary = {
  id: { content: string };
  name: string;
  email: string;
  phone: string;
  role: string;
  joinedOn: string;
  karmaPoints: number;
  feedbackProfile: FeedbackProfile;
  playPals: PlayPal[];
  availableSports: string[];
  sportRatings: SportRating[];
};

type EncryptedValue = {
  iv: string;
  content: string;
  tag: string;
};

type UserProfileLocationState = {
  targetUserId?: EncryptedValue | string;
};

const SELF_RATING_OPTIONS = ['Beginner', 'Amateur', 'Intermediate', 'Advanced', 'Professional'];

const scoreLabel = (value: number) => {
  if (value >= 1.5) return 'Very good';
  if (value >= 0.5) return 'Good';
  if (value <= -1.5) return 'Very bad';
  if (value <= -0.5) return 'Bad';
  return 'Mixed';
};

const normalizeSport = (value: string) => value.trim().toLowerCase();

export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useParams();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);

  const routeTargetUserId = useMemo(() => {
    if (!userToken) return null;

    try {
      return JSON.parse(decodeURIComponent(userToken));
    } catch (error) {
      console.error('Failed to decode participant profile token', error);
      return null;
    }
  }, [userToken]);

  const stateTargetUserId = (location.state as UserProfileLocationState | null)?.targetUserId;
  const targetUserId = routeTargetUserId || stateTargetUserId;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [selectedSportToAdd, setSelectedSportToAdd] = useState('');
  const [addingSport, setAddingSport] = useState(false);
  const [savingSelfRatingForSport, setSavingSelfRatingForSport] = useState<string | null>(null);

  const getComparableValue = (value?: EncryptedValue | string | null) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.content || '';
  };

  const isViewingAnotherUser = Boolean(
    targetUserId && getComparableValue(targetUserId) !== getComparableValue(user?.userId)
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fetchUserDetails = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const response = isViewingAnotherUser
        ? await axios.post('/api/user/profile-summary/view', { userId: targetUserId })
        : await axios.get('/api/user/profile-summary');
      setProfile(response.data.user);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [isViewingAnotherUser, targetUserId]);

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      await fetchUserDetails();
      setLoading(false);
    };

    load();
  }, [fetchUserDetails]);

  const feedbackProfile = profile?.feedbackProfile;

  const addableSports = useMemo(() => {
    const chosenSports = new Set((profile?.sportRatings || []).map((sport) => normalizeSport(sport.sportName)));
    return (profile?.availableSports || []).filter((sport) => !chosenSports.has(normalizeSport(sport)));
  }, [profile?.availableSports, profile?.sportRatings]);

  useEffect(() => {
    if (!selectedSportToAdd && addableSports.length) {
      setSelectedSportToAdd(addableSports[0]);
      return;
    }

    if (selectedSportToAdd && !addableSports.includes(selectedSportToAdd)) {
      setSelectedSportToAdd(addableSports[0] || '');
    }
  }, [addableSports, selectedSportToAdd]);

  const handleAddSport = async () => {
    if (!selectedSportToAdd) return;

    setAddingSport(true);
    try {
      await axios.post('/api/user/games', { gameName: selectedSportToAdd });
      await fetchUserDetails();
    } catch (error) {
      console.error('Failed to add sport:', error);
    } finally {
      setAddingSport(false);
    }
  };

  const handleSelfRatingChange = async (sportName: string, selfRating: string) => {
    setSavingSelfRatingForSport(sportName);
    try {
      await axios.patch('/api/user/games/self-rating', { gameName: sportName, selfRating });
      await fetchUserDetails();
    } catch (error) {
      console.error('Failed to update self rating:', error);
    } finally {
      setSavingSelfRatingForSport(null);
    }
  };

  const [deletingSport, setDeletingSport] = useState<string | null>(null);

  const handleDeleteSport = async (sportName: string) => {
    setDeletingSport(sportName);
    try {
      await axios.delete('/api/user/games', { data: { gameName: sportName } });
      await fetchUserDetails();
    } catch (error) {
      console.error('Failed to remove sport:', error);
    } finally {
      setDeletingSport(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
              {isViewingAnotherUser ? 'Player Profile' : 'My Profile'}
            </h1>
            <p className="text-slate-600 text-lg">
              {isViewingAnotherUser
                ? 'View player details, play pals, and sport-by-sport performance.'
                : 'View your details, play pals, and sport-by-sport performance.'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {!isViewingAnotherUser && (
              <Button className="rounded-lg h-11" onClick={() => navigate('/activity-requests')}>
                Activity Requests
              </Button>
            )}
            {isViewingAnotherUser && (
              <Button className="rounded-lg h-11" onClick={() => navigate(-1)}>
                Back
              </Button>
            )}
            <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{isViewingAnotherUser ? 'Player Profile' : 'My Profile'}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <User className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{loading ? 'Loading...' : capitalizeWords(profile?.name || '')}</p>
                  </div>
                </div>

                {!isViewingAnotherUser && (
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{loading ? 'Loading...' : profile?.email}</p>
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-1 ${isViewingAnotherUser ? '' : 'sm:grid-cols-2'} gap-3`}>
                  {!isViewingAnotherUser && (
                    <Card className="bg-muted/40 shadow-none">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          Phone
                        </div>
                        <p className="font-semibold text-slate-900 break-all">{loading ? 'Loading...' : profile?.phone || 'Not provided'}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        Karma Points
                      </div>
                      <p className="font-semibold text-slate-900">{loading ? 'Loading...' : profile?.karmaPoints ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  PlayPals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading play pals...</p>
                ) : profile?.playPals?.length ? (
                  <div className="space-y-3 max-h-72 overflow-auto pr-1">
                    {profile.playPals.map((pal) => (
                      <div key={pal.id.content} className="rounded-lg border bg-muted/20 p-3">
                        <p className="font-medium text-slate-900">{capitalizeWords(pal.name)}</p>
                        {!isViewingAnotherUser && (
                          <p className="text-xs text-muted-foreground break-all">{pal.email}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No play pals yet. Complete activities with new players to build this list.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-muted/40 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    No-shows
                  </div>
                  <p className="text-2xl font-semibold">{loading ? '...' : feedbackProfile?.noShowCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total recorded across all completed activities.</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/40 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" />
                    Punctuality
                  </div>
                  <p className="text-2xl font-semibold">{loading ? '...' : `${feedbackProfile?.punctual.punctualityPercentage ?? 0}%`}</p>
                  <p className="text-xs text-muted-foreground">Based on {loading ? '...' : feedbackProfile?.punctual.ratedCount ?? 0} ratings.</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/40 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Team player
                  </div>
                  <p className="text-2xl font-semibold">{loading ? '...' : `${feedbackProfile?.teamPlayer.averageScore ?? 0}`}</p>
                  <p className="text-xs text-muted-foreground">{loading ? 'Loading...' : scoreLabel(feedbackProfile?.teamPlayer.averageScore ?? 0)} from {feedbackProfile?.teamPlayer.ratingCount ?? 0} ratings.</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/40 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    Payment reliability
                  </div>
                  <p className="text-2xl font-semibold">{loading ? '...' : `${feedbackProfile?.paymentReliability.averageScore ?? 0}`}</p>
                  <p className="text-xs text-muted-foreground">{loading ? 'Loading...' : scoreLabel(feedbackProfile?.paymentReliability.averageScore ?? 0)} from {feedbackProfile?.paymentReliability.ratingCount ?? 0} ratings.</p>
                </CardContent>
              </Card>
            </div>

            {!isViewingAnotherUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Add Sports And Self Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Pick a sport from the available list and add it to your profile.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      className="h-10 rounded-md border px-3 bg-white"
                      value={selectedSportToAdd}
                      onChange={(event) => setSelectedSportToAdd(event.target.value)}
                      disabled={loading || !addableSports.length || addingSport}
                    >
                      {!addableSports.length && <option value="">No new sports available</option>}
                      {addableSports.map((sport) => (
                        <option key={sport} value={sport}>
                          {capitalizeWords(sport)}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleAddSport} disabled={!selectedSportToAdd || addingSport || loading}>
                      {addingSport ? 'Adding...' : 'Add Sport'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {(profile?.sportRatings || []).map((sport) => (
                <Card key={sport.sportName}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{capitalizeWords(sport.sportName)}</CardTitle>
                    {!isViewingAnotherUser && (
                      <button
                        onClick={() => handleDeleteSport(sport.sportName)}
                        disabled={deletingSport === sport.sportName}
                        className="ml-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        title="Remove sport"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Card className="bg-muted/30 shadow-none">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            {isViewingAnotherUser ? 'Self rating' : 'Your self rating'}
                          </div>
                          {!isViewingAnotherUser ? (
                            <>
                              <select
                                className="h-9 rounded-md border px-2 bg-white w-full"
                                value={sport.selfRating.label === 'Unrated' ? '' : sport.selfRating.label}
                                onChange={(event) => handleSelfRatingChange(sport.sportName, event.target.value)}
                                disabled={savingSelfRatingForSport === sport.sportName}
                              >
                                <option value="" disabled>
                                  Select level
                                </option>
                                {SELF_RATING_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-muted-foreground">{savingSelfRatingForSport === sport.sportName ? 'Saving rating...' : `Current: ${sport.selfRating.label}`}</p>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-slate-900">{sport.selfRating.label}</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/30 shadow-none">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            Average from recent games
                          </div>
                          <p className="text-xl font-semibold">{sport.receivedRatingComparison.last5ActivitiesAverageLabel}</p>
                          <p className="text-xs text-muted-foreground">Score {sport.receivedRatingComparison.last5ActivitiesAverageScore || 0} from last 5 activities</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/30 shadow-none">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="h-4 w-4" />
                            Overall received average
                          </div>
                          <p className="text-xl font-semibold">{sport.receivedRatingComparison.averageLabel}</p>
                          <p className="text-xs text-muted-foreground">Score {sport.receivedRatingComparison.averageScore || 0} based on {sport.receivedRatingComparison.basedOnRatings} ratings</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-muted/20 shadow-none">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium">Past 5 activity ratings ({sport.sportName})</p>
                        {sport.recentActivityRatings.length ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {sport.recentActivityRatings.map((rating) => (
                              <div key={rating.activityId.content} className="rounded-md border bg-white px-3 py-2">
                                <p className="text-sm font-semibold">{rating.ratingLabel}</p>
                                <p className="text-xs text-muted-foreground">Score {rating.ratingScore}</p>
                                <p className="text-xs text-muted-foreground">
                                  {rating.playedAt ? new Date(rating.playedAt).toLocaleDateString() : 'Date unavailable'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No received activity ratings yet for this sport.</p>
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              ))}

              {!loading && !(profile?.sportRatings || []).length && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      {isViewingAnotherUser
                        ? 'No sports added in this profile yet.'
                        : 'No sports in your profile yet. Add one above and set your self rating.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="bg-muted/40 shadow-none">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Feedback summary</p>
                <p className="font-medium">{loading ? 'Loading...' : `${feedbackProfile?.totalFeedbackReceived ?? 0} anonymous ratings received`}</p>
                <p className="text-xs text-muted-foreground">Last updated {loading || !feedbackProfile?.lastFeedbackAt ? 'when new feedback arrives.' : new Date(feedbackProfile.lastFeedbackAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
