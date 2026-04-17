import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, ShieldCheck, Star, User, Wallet } from 'lucide-react';
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
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserSummary | null>(null);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <Navbar onLogout={handleLogout} />

            <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">My Profile</h1>
                        <p className="text-slate-600 text-lg">View your personal details and player feedback summary</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <Button className="rounded-lg h-11" onClick={() => navigate('/activity-requests')}>
                            Activity Requests
                        </Button>
                        <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>
                            Back to Dashboard
                        </Button>
                    </div>
                </div>

                <div className="max-w-xl mx-auto w-full">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Card className="bg-muted/40 shadow-none">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        Phone
                                    </div>
                                    <p className="font-semibold text-slate-900 break-all">
                                        {loading ? 'Loading...' : profile?.phone || 'Not provided'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/40 shadow-none">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Star className="h-4 w-4" />
                                        Karma Points
                                    </div>
                                    <p className="font-semibold text-slate-900">
                                        {loading ? 'Loading...' : profile?.karmaPoints ?? 0}
                                    </p>
                                </CardContent>
                            </Card>
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

                    </CardContent>
                </Card>
            </div>
            </div>
        </div>
    );
}
