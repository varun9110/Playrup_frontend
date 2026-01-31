import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { capitalizeWords } from "@/lib/utils";

export default function UserBookings() {
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // replace with logged-in user's email
        const userEmail = JSON.parse(localStorage.getItem("user")).email;
        const res = await axios.post("http://localhost:5000/api/booking/my-bookings", { userEmail });

        const today = new Date();
        const upcoming: any[] = [];
        const past: any[] = [];

        res.data.forEach((b: any) => {
          const bookingDate = new Date(b.date + "T" + b.startTime);
          const formattedBooking = {
            id: b._id,
            sport: b.sport,
            court: `Court ${b.courtNumber}`,
            date: b.date,
            time: `${b.startTime} - ${b.endTime}`,
            location: `${b.academyId.name}, ${b.academyId.address}, ${b.academyId.city}`,
            status: bookingDate >= today ? "confirmed" : "completed",
            price: `$${b.price}`,
          };

          if (bookingDate >= today) {
            upcoming.push(formattedBooking);
          } else {
            past.push(formattedBooking);
          }
        });

        setUpcomingBookings(upcoming);
        setPastBookings(past);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const renderBookingCard = (booking: any) => (
    <Card key={booking.id} className="card-gradient elegant-shadow hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{capitalizeWords(booking.sport)}</h3>
              <Badge
                variant={
                  booking.status === 'confirmed'
                    ? 'default'
                    : booking.status === 'pending'
                    ? 'secondary'
                    : 'outline'
                }
                className="mt-1"
              >
                {capitalizeWords(booking.status)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-primary">{booking.price}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
            <span>{booking.court} - {capitalizeWords(booking.location)}</span>
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
    <div className="min-h-screen gradient-bg p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            My Bookings
          </h1>
          <p className="text-muted-foreground text-lg">Manage your court reservations</p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading bookings...</p>
        ) : (
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
                    <Button onClick={() => navigate("/bookcourt")} className="btn-gradient text-white font-semibold">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Book a Court
                    </Button>
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
        )}
      </div>
    </div>
  );
}
