import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UserBookings() {
  const upcomingBookings = [
    {
      id: 1,
      sport: 'Basketball',
      court: 'Court A',
      date: '2024-01-15',
      time: '6:00 PM - 8:00 PM',
      location: 'Downtown Sports Center',
      status: 'confirmed',
      price: '$25'
    },
    {
      id: 2,
      sport: 'Tennis',
      court: 'Court 3',
      date: '2024-01-17',
      time: '10:00 AM - 11:30 AM',
      location: 'Riverside Tennis Club',
      status: 'pending',
      price: '$35'
    }
  ];

  const pastBookings = [
    {
      id: 3,
      sport: 'Badminton',
      court: 'Court B',
      date: '2024-01-10',
      time: '7:00 PM - 8:30 PM',
      location: 'City Sports Complex',
      status: 'completed',
      price: '$20'
    },
    {
      id: 4,
      sport: 'Volleyball',
      court: 'Court 1',
      date: '2024-01-08',
      time: '5:00 PM - 7:00 PM',
      location: 'Beach Sports Center',
      status: 'completed',
      price: '$30'
    }
  ];

  const renderBookingCard = (booking: any) => (
    <Card key={booking.id}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{booking.sport}</h3>
            <Badge 
              variant={
                booking.status === 'confirmed' ? 'default' : 
                booking.status === 'pending' ? 'secondary' : 'outline'
              }
            >
              {booking.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">{booking.price}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>View Details</DropdownMenuItem>
                {booking.status !== 'completed' && (
                  <>
                    <DropdownMenuItem>Modify Booking</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Cancel Booking
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{booking.court} - {booking.location}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{booking.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{booking.time}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">Manage your court reservations</p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past Bookings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    No upcoming bookings found
                  </p>
                  <Button>Book a Court</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map(renderBookingCard)
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No past bookings found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}