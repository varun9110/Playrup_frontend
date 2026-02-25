import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { User, Settings, Calendar } from 'lucide-react';
import { capitalizeWords } from '@/lib/utils';

export default function AcademyDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    setTimeout(() => navigate('/'), 1000);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">
          Unauthorized access. Redirecting...
        </p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PlayrUp</h1>
            <p className="text-muted-foreground">
              Welcome, {capitalizeWords(user.name)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Body */}
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Academy Dashboard</CardTitle>
            <CardDescription>
              Manage your academy settings and bookings
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col md:flex-row gap-4">
            
            {/* Academy Setup Button */}
            <Button size="lg" className="flex-1" asChild>
              <Link to="/academy-setup">
                <Settings className="mr-2 h-5 w-5" />
                Academy Setup
              </Link>
            </Button>

            {/* View Bookings Button */}
            <Button size="lg" variant="outline" className="flex-1" asChild>
              <Link to="/academy-bookings">
                <Calendar className="mr-2 h-5 w-5" />
                View Bookings
              </Link>
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}