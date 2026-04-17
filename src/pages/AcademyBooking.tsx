import React, { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  format,
  setHours,
  setMinutes,
  setSeconds,
  isSameDay,
  addDays,
  subDays
} from "date-fns";
import { capitalizeWords, utcDateTimeToLocalParts } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Clock3,
  RefreshCw,
  Settings,
  Trophy,
} from "lucide-react";

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
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademy, setSelectedAcademy] = useState<string>("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}") || {};
  const userId = user?.userId;

  const startDate = format(subDays(selectedDate, 1), "yyyy-MM-dd");
  const endDate = format(addDays(selectedDate, 1), "yyyy-MM-dd");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;

    // Parse as local date at midday to avoid UTC/date-shift issues across environments.
    setSelectedDate(new Date(year, month - 1, day, 12, 0, 0));
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
  };

  /* ---------------- Fetch Academies ---------------- */
  const fetchAcademies = async () => {
    try {
      const res = await axios.post(
        "/api/academy/user-academies",
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
        "/api/booking/academy-bookings",
        {
          academyId: selectedAcademy,
          startDate,
          endDate,
          sport: selectedSport,
        }
      );

      const data: Booking[] = res.data.bookings.map((b: any) => {
        const localStart = utcDateTimeToLocalParts(b.date, b.startTime);
        const localEnd = utcDateTimeToLocalParts(b.date, b.endTime);

        return {
          id: b._id,
          court: b.courtNumber,
          date: localStart?.dateObj ?? new Date(`${b.date}T${b.startTime}:00Z`),
          start: localStart?.dateObj ?? new Date(`${b.date}T${b.startTime}:00Z`),
          end: localEnd?.dateObj ?? new Date(`${b.date}T${b.endTime}:00Z`),
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
  const cancelSelectedBooking = async () => {
    if (!selectedBooking || !selectedAcademy) return;

    setCancelLoading(true);
    try {
      await axios.post('/api/booking/academy-cancel-booking', {
        bookingId: selectedBooking.id,
        academyId: selectedAcademy
      });

      setSelectedBooking(null);
      await fetchBookings();
    } catch (error) {
      console.error('Failed to cancel booking', error);
    } finally {
      setCancelLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const selectedSportConfig = sports.find((sport) => sport.sportName === selectedSport);
  const bookingsForDay = bookings
    .filter((b) => isSameDay(b.date, selectedDate))
    .filter((b) => (selectedSport ? b.sport === selectedSport : true));
  const selectedAcademyName = academies.find((academy) => academy._id === selectedAcademy)?.name || "-";
  const activeCourtsCount = new Set(bookingsForDay.map((booking) => booking.court)).size;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-12 max-w-[96vw] 2xl:max-w-[1700px]">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Academy Bookings</h1>
              <p className="text-slate-500 text-lg">Monitor and manage court reservations with a day-view timeline.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <Link to="/academy-dashboard">
                  <Building2 className="h-4 w-4 mr-2" />
                  Academy Dashboard
                </Link>
              </Button>
              <Button variant="outline" className="rounded-lg h-11" asChild>
                <Link to="/academy-setup">
                  <Settings className="h-4 w-4 mr-2" />
                  Academy Setup
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Selected Date</p>
                <p className="text-base md:text-lg font-bold text-slate-800">{format(selectedDate, "dd MMM")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-emerald-100">
                <Trophy className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Bookings Today</p>
                <p className="text-2xl font-bold text-slate-800">{bookingsForDay.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Time Window</p>
                <p className="text-sm font-bold text-slate-800">
                  {selectedSportConfig ? `${selectedSportConfig.startTime} - ${selectedSportConfig.endTime}` : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-slate-100">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Active Courts</p>
                <p className="text-2xl font-bold text-slate-800">{activeCourtsCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-slate-800">Day View Timeline</CardTitle>
                <CardDescription className="text-slate-500 mt-1">Select academy, sport and date to inspect all reservations.</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit border-slate-300 text-slate-700">
                {selectedAcademyName}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Academy</p>
                {academies.length > 0 ? (
                  <Tabs value={selectedAcademy} onValueChange={setSelectedAcademy}>
                    <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                      {academies.map((academy) => (
                        <TabsTrigger
                          key={academy._id}
                          value={academy._id}
                          className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
                        >
                          {capitalizeWords(academy.name)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                ) : (
                  <p className="text-sm text-slate-500">No academies available.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Sport</p>
                {sports.length > 0 ? (
                  <Tabs value={selectedSport} onValueChange={setSelectedSport}>
                    <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                      {sports.map((sport) => (
                        <TabsTrigger
                          key={sport.sportName}
                          value={sport.sportName}
                          className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
                        >
                          {capitalizeWords(sport.sportName)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                ) : (
                  <p className="text-sm text-slate-500">No sports configured for this academy.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[auto_auto_auto_auto] gap-3 items-end">
                <Button variant="outline" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="h-10">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                </Button>

                <Input
                  ref={dateInputRef}
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  onClick={openDatePicker}
                  className="h-10 min-w-[170px] cursor-pointer text-center [text-align-last:center]"
                />

                <Button variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="h-10">
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>

                <Button
                  onClick={onRefresh}
                  className="h-10 bg-blue-600 text-white hover:bg-blue-700"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            {!selectedAcademy || !selectedSport || courts.length === 0 || hours.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="p-10 text-center text-slate-500">
                  Select an academy and sport to view court bookings.
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <div
                  className="grid relative bg-white min-w-[800px]"
                  style={{
                    gridTemplateColumns: `120px repeat(${courts.length}, minmax(120px, 1fr))`,
                    gridAutoRows: "64px",
                  }}
                >
                  <div className="border p-2 bg-slate-50" />

                  {courts.map((court) => (
                    <div key={court} className="border p-2 font-semibold text-center text-slate-800 bg-slate-50">
                      Court {court}
                    </div>
                  ))}

                  {(() => {
                    const alreadyRenderedBooking = new Set<string>();

                    return hours.map((hour) => (
                      <React.Fragment key={hour.toISOString()}>
                        <div className="border p-2 text-sm bg-slate-50 text-slate-600">
                          {format(hour, "hh:mm a")}
                        </div>

                        {courts.map((court) => {
                          const bookingsForCourt = bookingsForDay.filter((b) => b.court === court);

                          return (
                            <div key={court} className="relative border">
                              {bookingsForCourt.map((booking) => {
                                if (alreadyRenderedBooking.has(booking.id)) return null;

                                const slotHeight = 64;
                                const firstHour = hours[0].getHours() + hours[0].getMinutes() / 60;
                                const bookingStartHour = booking.start.getHours() + booking.start.getMinutes() / 60;
                                const bookingEndHour = booking.end.getHours() + booking.end.getMinutes() / 60;

                                if (hour.getHours() + hour.getMinutes() / 60 > bookingStartHour) return null;

                                alreadyRenderedBooking.add(booking.id);

                                const top = (bookingStartHour - firstHour) * slotHeight;
                                const height = (bookingEndHour - bookingStartHour) * slotHeight;

                                return (
                                  <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute left-1 right-1 rounded-xl bg-blue-100 border border-blue-200 p-2 text-xs text-slate-800 shadow-sm cursor-pointer"
                                    style={{ top, height }}
                                    onClick={() => setSelectedBooking(booking)}
                                  >
                                    <div className="font-medium truncate">{booking.userName}</div>
                                    <div className="truncate">{booking.sport}</div>
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
              </div>
            )}

          </CardContent>
        </Card>

        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-3 text-sm text-slate-700">
                <div><strong>User:</strong> {selectedBooking.userName}</div>
                <div><strong>Sport:</strong> {selectedBooking.sport}</div>
                <div>
                  <strong>Time:</strong>{" "}
                  {format(selectedBooking.start, "hh:mm a")} - {format(selectedBooking.end, "hh:mm a")}
                </div>
                <div>
                  <strong>Date:</strong> {format(selectedBooking.date, "dd MMM yyyy")}
                </div>
                <div><strong>Court:</strong> {selectedBooking.court}</div>

                <div className="pt-2">
                  <Button variant="destructive" onClick={cancelSelectedBooking} disabled={cancelLoading}>
                    {cancelLoading ? "Cancelling..." : "Cancel Booking"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
