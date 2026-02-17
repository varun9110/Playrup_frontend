import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Calendar, Clock, MapPin, MoreHorizontal } from 'lucide-react';
import Slider from "react-slider";
import { capitalizeWords } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';

export default function UserBookings() {
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [openCancel, setOpenCancel] = useState(false);

  const [bookingToModify, setBookingToModify] = useState<any | null>(null);
  const [openModify, setOpenModify] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");
  const [courts, setCourts] = useState<any[]>([]);
  const [priceDiff, setPriceDiff] = useState<number>(0);

  const { toast } = useToast();
  const navigate = useNavigate();

  /* ================= FETCH BOOKINGS ================= */

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const userEmail = JSON.parse(localStorage.getItem("user")!).email;
        const userId = JSON.parse(localStorage.getItem("user"))?.userId;
        const res = await axios.post(
          "http://localhost:5000/api/booking/my-bookings",
          { userEmail, userId }
        );

        const today = new Date();
        const upcoming: any[] = [];
        const past: any[] = [];

        res.data.forEach((b: any) => {
          const bookingDate = new Date(`${b.date}T${b.startTime}`);

          // Calculate duration in minutes
          const [startHour, startMin] = b.startTime.split(":").map(Number);
          const [endHour, endMin] = b.endTime.split(":").map(Number);
          const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

          const formattedBooking = {
            id: b._id,
            sport: b.sport,
            court: `Court ${b.courtNumber}`,
            date: b.date,
            startTime: b.startTime,
            endTime: b.endTime,
            time: `${b.startTime} - ${b.endTime}`,
            academy: b.academyId.name,
            address: b.academyId.address,
            city: b.academyId.city,
            location: `${b.academyId.name}, ${b.academyId.address}, ${b.academyId.city}`,
            status: bookingDate >= today ? "confirmed" : "completed",
            price: b.price,
            duration, // calculated from startTime and endTime
            academyId: b.academyId._id,
            courtNumber: b.courtNumber,
          };

          bookingDate >= today ? upcoming.push(formattedBooking) : past.push(formattedBooking);
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


  /* ================= MODAL HANDLERS ================= */

  const openDetailsModal = (booking: any) => {
    setSelectedBooking(booking);
    setOpenDetails(true);
  };

  const openCancelModal = (booking: any) => {
    setBookingToCancel(booking);
    setOpenCancel(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      const userEmail = JSON.parse(localStorage.getItem("user")!).email;
      const userId = JSON.parse(localStorage.getItem("user"))?.userId;
      const res = await axios.post(
        "http://localhost:5000/api/booking/cancel-booking",
        { bookingId: bookingToCancel.id, userEmail, userId }
      );

      if (res.data?.booking) {
        setUpcomingBookings(prev =>
          prev.filter(b => b.id !== bookingToCancel.id)
        );
        setOpenCancel(false);
        setBookingToCancel(null);
        toast({ title: "Booking Cancelled", variant: "destructive" });
      }
    } catch (err) {
      console.error("Cancel booking failed", err);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  /* ================= MODIFY BOOKING ================= */

  const openModifyModal = (booking: any) => {
    setBookingToModify(booking);
    setModalDate(booking.date);
    setModalTime(booking.startTime);
    fetchCourtAvailability(booking.academyId, booking.sport, booking.date);
    setOpenModify(true);
  };

  const fetchCourtAvailability = async (academyId: string, sport: string, date: string, time?: string) => {
  try {
    const res = await axios.post(
      "http://localhost:5000/api/booking/check-availability",
      {
        academyId,
        sport,
        date,
        startTime: time || modalTime, // use passed time if available
        duration: bookingToModify?.duration || 60,
      }
    );
    setCourts(res.data.courts || []);
    calculatePriceDiff(res.data.courts || []);
  } catch (err) {
    console.error(err);
    setCourts([]);
  }
};

  const calculatePriceDiff = (availableCourts: any[]) => {
    if (!bookingToModify) return;
    const originalPrice = bookingToModify.price;
    const newCourt = availableCourts.find(c => c.courtNumber === Number(bookingToModify.court.split(' ')[1]));
    if (newCourt) setPriceDiff(newCourt.price - originalPrice);
  };

  const handleModifyBooking = async (courtNumber: number) => {
    if (!bookingToModify) return;

    try {
      const userEmail = JSON.parse(localStorage.getItem("user")!).email;
      const userId = JSON.parse(localStorage.getItem("user"))?.userId;

      const res = await axios.patch(
        "http://localhost:5000/api/booking/modify-booking",
        {
          bookingId: bookingToModify.id,  // <-- send booking ID
          userEmail,
          userId,
          academyId: bookingToModify.academyId,
          sport: bookingToModify.sport,
          courtNumber,
          date: modalDate,
          startTime: modalTime,
          duration: bookingToModify.duration,
        }
      );

      // Backend should return updated booking with new price
      const updatedBooking = res.data.booking;

      const newPrice = updatedBooking.price;
      const priceDiff = newPrice - bookingToModify.price;

      toast({
        title: "Booking Modified",
        description: `Booking updated! Price difference: ${priceDiff >= 0 ? '+' : ''}${priceDiff} CAD`,
      });

      // Refresh bookings locally
      setUpcomingBookings(prev =>
        prev.map(b =>
          b.id === bookingToModify.id
            ? {
              ...b,
              courtNumber,
              date: modalDate,
              startTime: modalTime,
              time: `${modalTime} - ${calculateEndTime(modalTime, b.duration)}`,
              price: newPrice,
            }
            : b
        )
      );

      setOpenModify(false);
      setBookingToModify(null);
      setCourts([]);
    } catch (err) {
      console.error("Modify booking failed", err);
      toast({ title: "Failed to modify booking", variant: "destructive" });
    }
  };


  const calculateEndTime = (startTime: string, duration: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const end = new Date();
    end.setHours(h);
    end.setMinutes(m + duration);
    const hrs = String(end.getHours()).padStart(2, "0");
    const mins = String(end.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  /* ================= RENDER BOOKING CARD ================= */

  const renderBookingCard = (booking: any) => (
    <Card
      key={booking.id}
      className="card-gradient elegant-shadow hover:shadow-lg transition-all duration-300"
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold">
                {booking.sport[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {capitalizeWords(booking.sport)}
              </h3>
              <Badge className="mt-1">
                {capitalizeWords(booking.status)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-primary">
              ${booking.price}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => openDetailsModal(booking)}>
                  View Details
                </DropdownMenuItem>

                {booking.status !== 'completed' && (
                  <>
                    <DropdownMenuItem onClick={() => openModifyModal(booking)}>
                      Modify Booking
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => openCancelModal(booking)}
                    >
                      Cancel Booking
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{booking.court} · {capitalizeWords(booking.location)}</span>
          </div>

          <div className="flex items-center gap-4">
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

  /* ================= UI ================= */

  return (
    <>
      <div className="min-h-screen gradient-bg p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              My Bookings
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your court reservations
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">
              Loading bookings...
            </p>
          ) : (
            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past Bookings</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingBookings.length
                  ? upcomingBookings.map(renderBookingCard)
                  : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">
                          No upcoming bookings found
                        </p>
                        <Button
                          onClick={() => navigate("/bookcourt")}
                          className="btn-gradient text-white"
                        >
                          Book a Court
                        </Button>
                      </CardContent>
                    </Card>
                  )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {pastBookings.length
                  ? pastBookings.map(renderBookingCard)
                  : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">
                          No past bookings found
                        </p>
                      </CardContent>
                    </Card>
                  )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* ================= VIEW DETAILS MODAL ================= */}
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="max-w-lg card-gradient elegant-shadow">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Booking Details
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 text-sm">
              <DetailRow label="Sport" value={capitalizeWords(selectedBooking.sport)} />
              <DetailRow label="Status" value={<Badge>{capitalizeWords(selectedBooking.status)}</Badge>} />
              <DetailRow label="Price" value={<span className="text-primary font-semibold">${selectedBooking.price}</span>} />
              <DetailRow label="Court" value={selectedBooking.court} />
              <DetailRow label="Date" value={selectedBooking.date} />
              <DetailRow label="Time" value={selectedBooking.time} />
              <div>
                <p className="text-muted-foreground mb-1">Location</p>
                <p className="font-medium">
                  {capitalizeWords(selectedBooking.location)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= CANCEL CONFIRMATION MODAL ================= */}
      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent className="max-w-md card-gradient elegant-shadow">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">
              Cancel Booking?
            </DialogTitle>
          </DialogHeader>

          {bookingToCancel && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Are you sure you want to cancel this booking?
              </p>

              <div className="rounded-lg border p-3 space-y-1">
                <p className="font-semibold">
                  {capitalizeWords(bookingToCancel.sport)}
                </p>
                <p>{bookingToCancel.date} · {bookingToCancel.time}</p>
                <p>{bookingToCancel.court}</p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenCancel(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={confirmCancelBooking}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODIFY BOOKING MODAL ================= */}
      <Dialog open={openModify} onOpenChange={setOpenModify}>
        <DialogContent className="max-w-lg card-gradient elegant-shadow">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Modify Booking
            </DialogTitle>
          </DialogHeader>

          {bookingToModify && (
            <div className="space-y-4">
              <div>
                <label className="font-medium">Select Date</label>
                <input
                  type="date"
                  value={modalDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setModalDate(e.target.value);
                    fetchCourtAvailability(bookingToModify.academyId, bookingToModify.sport, e.target.value);
                  }}
                  className="border rounded p-2 w-full"
                />
              </div>

              <div>
                <label className="font-medium">Select Time</label>
                <Slider
                  className="w-full h-2 bg-gray-200 rounded"
                  thumbClassName="bg-primary h-4 w-4 rounded-full"
                  trackClassName="bg-primary/40 h-2 rounded"
                  min={6}
                  max={22}
                  step={0.5}
                  value={parseInt(modalTime.split(":")[0]) + parseInt(modalTime.split(":")[1]) / 60}
                  onChange={(val) => {
                    const hrs = Math.floor(val);
                    const mins = Math.round((val - hrs) * 60);
                    const timeStr = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
                    setModalTime(timeStr);
                    fetchCourtAvailability(bookingToModify.academyId, bookingToModify.sport, modalDate, timeStr); // pass timeStr
                  }}
                />
                <p className="text-sm mt-1">Selected: {modalTime}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Duration: {bookingToModify.duration} mins</p>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                {courts.map((court) => (
                  <div
                    key={court.courtNumber}
                    onClick={() => court.available && handleModifyBooking(court.courtNumber)}
                    className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center cursor-pointer
                      ${court.available
                        ? "bg-green-200 border-green-500"
                        : "bg-red-200 border-red-500 cursor-not-allowed"
                      }`}
                  >
                    <span className="font-semibold">{court.courtNumber}</span>
                    <span className="text-sm">{court.price} CAD</span>
                  </div>
                ))}
              </div>

              {priceDiff !== 0 && (
                <p className="text-sm mt-2">
                  Price Difference: {priceDiff > 0 ? "+" : ""}{priceDiff} CAD
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
