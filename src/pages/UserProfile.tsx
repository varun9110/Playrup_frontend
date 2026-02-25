import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Calendar } from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

export default function UserProfile() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const userEmail = user?.email;
    const userId = user?.userId;
    const token = localStorage.getItem('token');

    const [loading, setLoading] = useState(true);

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
                const response = await axios.post(
                    'http://localhost:5000/api/user/all-sports',
                    { userEmail, userId }
                    // Uncomment if your backend uses auth
                    // { headers: { Authorization: `Bearer ${token}` } }
                );

                const data = response.data;
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, []);

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
                                    {capitalizeWords("Varun")}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Mail className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{"varun@example.com"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Calendar className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">User ID</p>
                                <p className="font-medium">{userId?.content}</p>
                            </div>
                        </div>

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