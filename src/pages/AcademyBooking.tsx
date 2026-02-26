import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { format, setHours, setMinutes, isSameDay, addDays, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Booking {
  id: string;
  court: number;
  date: Date;
  start: Date;
  end: Date;
  userName: string;
  sport: string;
}

const courts = [1, 2, 3];

export default function AcademyBooking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date("2026-02-26"));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);


  const userId = JSON.parse(localStorage.getItem("user"))?.userId;

  const startDate = format(subDays(selectedDate, 1), "yyyy-MM-dd");
  const endDate = format(addDays(selectedDate, 1), "yyyy-MM-dd");

  const fetchBookings = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/booking/academy-bookings", {
        academyId: userId,
        startDate,
        endDate,
      });

      const data: Booking[] = res.data.bookings.map((b: any) => ({
        id: b._id,
        court: b.court,
        date: new Date(b.date),
        start: new Date(b.start),
        end: new Date(b.end),
        userName: b.userName,
        sport: b.sport,
      }));

      setBookings(data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  // Fetch on mount and set interval for 30s
  useEffect(() => {
    fetchBookings();

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      fetchBookings();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedDate]); // refetch if selectedDate changes

  const hours = useMemo(() => {
    const startHour = 6;
    const endHour = 22;
    const list: Date[] = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push(setMinutes(setHours(new Date(selectedDate), h), 0));
    }
    return list;
  }, [selectedDate]);

  const bookingsForDay = bookings.filter((b) => isSameDay(b.date, selectedDate));

  const getBookingForSlot = (court: number, hour: Date) => {
    return bookingsForDay.find((b) => b.court === court && b.start.getHours() === hour.getHours());
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-x-2">
          <CardTitle className="text-xl">Academy Bookings - Day View</CardTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setSelectedDate(subDays(selectedDate, 1))}>{'<'}</Button>
            <Input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-48"
            />
            <Button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>{'>'}</Button>
            <Button onClick={fetchBookings} variant="secondary">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${courts.length}, 1fr)` }}>
            {/* Header Row */}
            <div className="border p-2 font-semibold">Time</div>
            {courts.map((court) => (
              <div key={court} className="border p-2 font-semibold text-center">
                Court {court}
              </div>
            ))}

            {/* Time Rows */}
            {hours.map((hour) => (
              <React.Fragment key={hour.toISOString()}>
                <div className="border p-2 text-sm">{format(hour, "hh:mm a")}</div>
                {courts.map((court, index) => {
                  const booking = getBookingForSlot(court, hour);
                  return (
                    <div
                      key={court}
                      className="border h-16 relative group cursor-pointer"
                      onClick={() => booking && setSelectedBooking(booking)}
                    >
                      {booking && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-1 rounded-xl bg-primary/20 p-2 text-xs shadow-sm hover:shadow-md transition"
                        >
                          <div className="font-medium">{booking.userName}</div>
                          <div>{booking.sport}</div>

                          <div
                            className={`absolute hidden group-hover:block bg-white shadow-lg rounded-xl p-3 text-xs top-0 z-50 w-48 ${
                              index === courts.length - 1 ? "right-full mr-2 left-auto" : "left-full ml-2"
                            }`}
                          >
                            <div className="font-semibold mb-1">Booking Details</div>
                            <div>User: {booking.userName}</div>
                            <div>Sport: {booking.sport}</div>
                            <div>
                              Time: {format(booking.start, "hh:mm a")} - {format(booking.end, "hh:mm a")}
                            </div>
                            <div>Date: {format(booking.date, "dd MMM yyyy")}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Booking Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div>
                <strong>User:</strong> {selectedBooking.userName}
              </div>
              <div>
                <strong>Sport:</strong> {selectedBooking.sport}
              </div>
              <div>
                <strong>Time:</strong> {format(selectedBooking.start, "hh:mm a")} - {format(selectedBooking.end, "hh:mm a")}
              </div>
              <div>
                <strong>Date:</strong> {format(selectedBooking.date, "dd MMM yyyy")}
              </div>
              <div>
                <strong>Court:</strong> {selectedBooking.court}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}