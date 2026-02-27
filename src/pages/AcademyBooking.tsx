import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  format,
  setHours,
  setMinutes,
  setSeconds,
  isSameDay,
  addDays,
  subDays,
  parse,
  addHours
} from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Sport {
  sportName: string;
  numberOfCourts: number;
  startTime: string;
  endTime: string;
}

interface Academy {
  _id: string;
  name: string;
  sports: Sport[];
}

export default function AcademyBooking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademy, setSelectedAcademy] = useState<string>("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const userId = JSON.parse(localStorage.getItem("user") || "{}")?.userId;

  const startDate = format(subDays(selectedDate, 1), "yyyy-MM-dd");
  const endDate = format(addDays(selectedDate, 1), "yyyy-MM-dd");

  /* ---------------- Fetch Academies ---------------- */
  const fetchAcademies = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/academy/user-academies",
        { userId }
      );

      const academyList = res.data.data || [];
      setAcademies(academyList);

      if (academyList.length > 0) {
        const firstAcademy = academyList[0];
        setSelectedAcademy(firstAcademy._id);
        setSports(firstAcademy.sports || []);
        if (firstAcademy.sports?.length > 0) {
          setSelectedSport(firstAcademy.sports[0].sportName);
        }
      }
    } catch (err) {
      console.error("Error fetching academies:", err);
    }
  };

  /* ---------------- Fetch Bookings ---------------- */
  const fetchBookings = async () => {
    if (!selectedAcademy) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/api/booking/academy-bookings",
        {
          academyId: selectedAcademy,
          startDate,
          endDate,
          sport: selectedSport,
        }
      );

      const data: Booking[] = res.data.bookings.map((b: any) => {
        const start = parse(`${b.date} ${b.startTime}`, "yyyy-MM-dd HH:mm", new Date());
        const end = parse(`${b.date} ${b.endTime}`, "yyyy-MM-dd HH:mm", new Date());

        return {
          id: b._id,
          court: b.courtNumber,
          date: start,
          start,
          end,
          userName: b.userId?.name || b.userEmail,
          sport: b.sport,
        };
      });

      setBookings(data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  useEffect(() => {
    if (userId) fetchAcademies();
  }, []);

  useEffect(() => {
    const academy = academies.find(a => a._id === selectedAcademy);
    if (!academy) return;

    setSports(academy.sports || []);
    setSelectedSport(academy.sports?.[0]?.sportName || "");
  }, [selectedAcademy]);

  useEffect(() => {
    if (!selectedAcademy) return;

    fetchBookings();

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(fetchBookings, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedDate, selectedAcademy, selectedSport]);

  /* ---------------- Filtered Bookings ---------------- */
  const bookingsForDay = bookings
    .filter(b => isSameDay(b.date, selectedDate))
    .filter(b => selectedSport ? b.sport === selectedSport : true);

  /* ---------------- Time Range Based On Sport ---------------- */
  const hours = useMemo(() => {
    const sportObj = sports.find(s => s.sportName === selectedSport);
    if (!sportObj) return [];

    const startHour = parseInt(sportObj.startTime.split(":")[0]);
    const endHour = parseInt(sportObj.endTime.split(":")[0]);

    const list: Date[] = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push(setSeconds(setMinutes(setHours(new Date(selectedDate), h), 0), 0));
    }

    return list;
  }, [selectedDate, selectedSport, sports]);

  /* ---------------- Courts ---------------- */
  const courts = useMemo(() => {
    const sportObj = sports.find(s => s.sportName === selectedSport);
    return sportObj
      ? Array.from({ length: sportObj.numberOfCourts }, (_, i) => i + 1)
      : [];
  }, [selectedSport, sports]);

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">
              Academy Bookings - Day View
            </CardTitle>

            <div className="flex items-center space-x-2">
              <Button onClick={() => setSelectedDate(subDays(selectedDate, 1))}>{"<"}</Button>

              <Input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-48"
              />

              <Button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>{">"}</Button>

              <Button onClick={fetchBookings} variant="secondary">
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="w-72">
              <Select value={selectedAcademy} onValueChange={setSelectedAcademy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Academy" />
                </SelectTrigger>
                <SelectContent>
                  {academies.map((academy) => (
                    <SelectItem key={academy._id} value={academy._id}>
                      {academy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-72">
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((sport) => (
                    <SelectItem key={sport.sportName} value={sport.sportName}>
                      {sport.sportName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div
            className="grid relative border"
            style={{
              gridTemplateColumns: `120px repeat(${courts.length}, 1fr)`,
              gridAutoRows: "64px",
            }}
          >
            {/* Top-left empty cell */}
            <div className="border p-2 bg-gray-50"></div>

            {/* Header: Court Names */}
            {courts.map((court) => (
              <div key={court} className="border p-2 font-semibold text-center">
                Court {court}
              </div>
            ))}

            {/* Track which bookings have been rendered globally */}
            {(() => {
              const alreadyRenderedBooking = new Set<string>();

              return hours.map((hour) => (
                <React.Fragment key={hour.toISOString()}>
                  {/* Time Column */}
                  <div className="border p-2 text-sm bg-gray-50">
                    {format(hour, "hh:mm a")}
                  </div>

                  {/* Court Columns */}
                  {courts.map((court) => {
                    const bookingsForCourt = bookingsForDay.filter((b) => b.court === court);

                    return (
                      <div key={court} className="relative border">
                        {bookingsForCourt.map((booking) => {
                          if (alreadyRenderedBooking.has(booking.id)) return null;

                          const slotHeight = 64; // px per hour
                          const firstHour = hours[0].getHours() + hours[0].getMinutes() / 60;
                          const bookingStartHour =
                            booking.start.getHours() + booking.start.getMinutes() / 60;
                          const bookingEndHour =
                            booking.end.getHours() + booking.end.getMinutes() / 60;

                          // Render only at the first hour row that overlaps the booking
                          if (hour.getHours() + hour.getMinutes() / 60 > bookingStartHour) return null;

                          // Mark booking as rendered
                          alreadyRenderedBooking.add(booking.id);

                          const top = (bookingStartHour - firstHour) * slotHeight;
                          const height = (bookingEndHour - bookingStartHour) * slotHeight;

                          return (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute left-1 right-1 rounded-xl bg-primary/20 p-2 text-xs shadow-sm cursor-pointer"
                              style={{ top, height }}
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <div className="font-medium">{booking.userName}</div>
                              <div>{booking.sport}</div>
                              <div>
                                {format(booking.start, "hh:mm a")} - {format(booking.end, "hh:mm a")}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div><strong>User:</strong> {selectedBooking.userName}</div>
              <div><strong>Sport:</strong> {selectedBooking.sport}</div>
              <div>
                <strong>Time:</strong>{" "}
                {format(selectedBooking.start, "hh:mm a")} -{" "}
                {format(selectedBooking.end, "hh:mm a")}
              </div>
              <div>
                <strong>Date:</strong>{" "}
                {format(selectedBooking.date, "dd MMM yyyy")}
              </div>
              <div><strong>Court:</strong> {selectedBooking.court}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}