import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Mail, ShieldCheck, Star, User, Wallet } from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

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

type UserSummary = {
    id: { content: string };
    name: string;
    email: string;
    phone: string;
    role: string;
    joinedOn: string;
    karmaPoints: number;
    feedbackProfile: FeedbackProfile;
};

const scoreLabel = (value: number) => {
    if (value >= 1.5) return 'Very good';
    if (value >= 0.5) return 'Good';
    if (value <= -1.5) return 'Very bad';
    if (value <= -0.5) return 'Bad';
    return 'Mixed';
};

export default function UserProfile() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserSummary | null>(null);

    if (!user) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
        return null;
    }

    useEffect(() => {
        if (!user) return;

        const fetchUserDetails = async () => {
            try {
                const response = await axios.get('/api/user/profile-summary');
                setProfile(response.data.user);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, []);

    const feedbackProfile = profile?.feedbackProfile;

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-6">

            <div className="max-w-xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">My Profile</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">

                        <div className="flex items-center gap-4">
                            <User className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">
                                    {loading ? 'Loading...' : capitalizeWords(profile?.name || '')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Mail className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{loading ? 'Loading...' : profile?.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Calendar className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Joined</p>
                                <p className="font-medium">
                                    {loading || !profile?.joinedOn ? 'Loading...' : new Date(profile.joinedOn).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="bg-muted/40 shadow-none">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ShieldCheck className="h-4 w-4" />
                                        No-shows
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {loading ? '...' : feedbackProfile?.noShowCount ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Total recorded across all completed activities.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/40 shadow-none">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Star className="h-4 w-4" />
                                        Punctuality
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {loading ? '...' : `${feedbackProfile?.punctual.punctualityPercentage ?? 0}%`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Based on {loading ? '...' : feedbackProfile?.punctual.ratedCount ?? 0} ratings.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/40 shadow-none">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        Team player
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {loading ? '...' : `${feedbackProfile?.teamPlayer.averageScore ?? 0}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {loading ? 'Loading...' : scoreLabel(feedbackProfile?.teamPlayer.averageScore ?? 0)} from {feedbackProfile?.teamPlayer.ratingCount ?? 0} ratings.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/40 shadow-none">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Wallet className="h-4 w-4" />
                                        Payment reliability
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {loading ? '...' : `${feedbackProfile?.paymentReliability.averageScore ?? 0}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {loading ? 'Loading...' : scoreLabel(feedbackProfile?.paymentReliability.averageScore ?? 0)} from {feedbackProfile?.paymentReliability.ratingCount ?? 0} ratings.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-muted/40 shadow-none">
                            <CardContent className="p-4 space-y-2">
                                <p className="text-sm text-muted-foreground">Average skill level</p>
                                <p className="text-2xl font-semibold">
                                    {loading ? '...' : feedbackProfile?.skillLevel.averageLabel || 'Unrated'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Based on {loading ? '...' : feedbackProfile?.skillLevel.ratingCount ?? 0} ratings across completed games.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/40 shadow-none">
                            <CardContent className="p-4 space-y-2">
                                <p className="text-sm text-muted-foreground">Feedback summary</p>
                                <p className="font-medium">
                                    {loading ? 'Loading...' : `${feedbackProfile?.totalFeedbackReceived ?? 0} anonymous ratings received`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Last updated {loading || !feedbackProfile?.lastFeedbackAt ? 'when new feedback arrives.' : new Date(feedbackProfile.lastFeedbackAt).toLocaleString()} 
                                </p>
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full mt-4"
                            onClick={() => navigate('/dashboard')}
                        >
                            Back to Dashboard
                        </Button>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
