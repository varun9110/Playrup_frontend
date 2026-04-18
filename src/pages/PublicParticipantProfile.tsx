import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Share2, ShieldCheck, Star, Target, TrendingUp, User, Wallet } from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

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

type FeedbackProfile = {
  noShowCount: number;
  totalFeedbackReceived: number;
  punctual: {
    punctualityPercentage: number;
    ratedCount: number;
  };
  teamPlayer: {
    averageScore: number;
    ratingCount: number;
  };
  paymentReliability: {
    averageScore: number;
    ratingCount: number;
  };
  lastFeedbackAt: string | null;
};

type PublicProfile = {
  id: { content: string };
  name: string;
  avatarUrl?: string | null;
  joinedOn?: string;
  karmaPoints?: number;
  feedbackProfile?: FeedbackProfile;
  sportRatings?: SportRating[];
  playPals?: { id: { content: string }; name: string }[];
};

const scoreLabel = (value: number) => {
  if (value >= 1.5) return 'Very good';
  if (value >= 0.5) return 'Good';
  if (value <= -1.5) return 'Very bad';
  if (value <= -0.5) return 'Bad';
  return 'Mixed';
};

export default function PublicParticipantProfile() {
  const { userToken } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  const parsedUserToken = useMemo(() => {
    if (!userToken) return null;
    try {
      return JSON.parse(decodeURIComponent(userToken));
    } catch (error) {
      console.error('Invalid user token in public profile route', error);
      return null;
    }
  }, [userToken]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!parsedUserToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.post('/api/public/user/profile-summary', {
          userId: parsedUserToken,
        });
        setProfile(response.data?.user || null);
      } catch (error) {
        console.error('Failed to fetch public profile', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [parsedUserToken]);

  const feedbackProfile = profile?.feedbackProfile;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="max-w-3xl mx-auto w-full">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-blue-600" />
                  Player Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 text-center text-slate-500">Loading Profile...</CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="max-w-3xl mx-auto w-full">
            <Card className="overflow-hidden border-slate-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  Player Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 text-center space-y-4">
                <p className="text-slate-700 font-medium">Profile Not Available.</p>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">

        {/* Hero strip */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Player Profile</h1>
            <p className="text-slate-600 text-lg">
              View player details and sport-by-sport performance.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button className="rounded-lg h-11" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

          {/* Left column */}
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Player Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatarUrl || undefined} alt={profile.name} />
                    <AvatarFallback className="text-lg">
                      {(profile.name || 'P')
                        .split(' ')
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{capitalizeWords(profile.name)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        Karma Points
                      </div>
                      <p className="font-semibold text-slate-900">{profile.karmaPoints ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {feedbackProfile && (
                <>
                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        No-shows
                      </div>
                      <p className="text-2xl font-semibold">{feedbackProfile.noShowCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Total recorded across all completed activities.</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        Punctuality
                      </div>
                      <p className="text-2xl font-semibold">{feedbackProfile.punctual.punctualityPercentage ?? 0}%</p>
                      <p className="text-xs text-muted-foreground">Based on {feedbackProfile.punctual.ratedCount ?? 0} ratings.</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        Team Player
                      </div>
                      <p className="text-2xl font-semibold">{feedbackProfile.teamPlayer.averageScore ?? 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {scoreLabel(feedbackProfile.teamPlayer.averageScore ?? 0)} from {feedbackProfile.teamPlayer.ratingCount ?? 0} ratings.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                        Payment Reliability
                      </div>
                      <p className="text-2xl font-semibold">{feedbackProfile.paymentReliability.averageScore ?? 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {scoreLabel(feedbackProfile.paymentReliability.averageScore ?? 0)} from {feedbackProfile.paymentReliability.ratingCount ?? 0} ratings.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {isLoggedIn && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    PlayPals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.playPals?.length ? (
                    <div className="space-y-3 max-h-72 overflow-auto pr-1">
                      {profile.playPals.map((pal) => (
                        <div key={pal.id.content} className="rounded-lg border bg-muted/20 p-3">
                          <p className="font-medium text-slate-900">{capitalizeWords(pal.name)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No play pals yet.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sport ratings */}
            {(profile.sportRatings || []).length > 0 && (
              <div className="space-y-4">
                {(profile.sportRatings || []).map((sport) => (
                  <Card key={sport.sportName}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{capitalizeWords(sport.sportName)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card className="bg-muted/30 shadow-none">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Target className="h-4 w-4" />
                              Self rating
                            </div>
                            <p className="text-sm font-medium text-slate-900">{sport.selfRating.label}</p>
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
                            <p className="text-xs text-muted-foreground">
                              Score {sport.receivedRatingComparison.averageScore || 0} based on {sport.receivedRatingComparison.basedOnRatings} ratings
                            </p>
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
              </div>
            )}

            {!(profile.sportRatings || []).length && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">No sports added in this profile yet.</p>
                </CardContent>
              </Card>
            )}

            {feedbackProfile && (
              <Card className="bg-muted/40 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Feedback summary</p>
                  <p className="font-medium">{feedbackProfile.totalFeedbackReceived ?? 0} anonymous ratings received</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated {feedbackProfile.lastFeedbackAt ? new Date(feedbackProfile.lastFeedbackAt).toLocaleString() : 'when new feedback arrives.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
