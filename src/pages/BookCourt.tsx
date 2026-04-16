import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Slider from "react-slider";
import { capitalizeWords, combineLocalDateAndTime, localDateTimeToUtcParts } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout";
import { Calendar, Clock3, MapPin, Search, Building2 } from "lucide-react";

export default function BookCourt() {
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [date, setDate] = useState("");
  const [academies, setAcademies] = useState([]);
  const [cities, setCities] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const { toast } = useToast();

  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [modalTime, setModalTime] = useState("08:00");
  const [modalDuration, setModalDuration] = useState(60);
  const [courts, setCourts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  /* ================= TIME HELPERS (LOCAL TZ SAFE) ================= */

  const getLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getNowInMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  const todayStr = getLocalDateString();
  const isToday = date === todayStr;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get("/api/academy/locations");
        if (res.data?.uniqueCities) setCities(res.data.uniqueCities);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const fetchSports = async () => {
      if (!city) {
        setSportsList([]);
        setSport("");
        return;
      }
      try {
        const res = await axios.get(
          `/api/academy/sports/${city}`
        );
        setSportsList(res.data?.sports || []);
        setSport("");
      } catch (err) {
        console.error(err);
      }
    };
    fetchSports();
  }, [city]);

  const handleSearch = async () => {
    try {
      const res = await axios.post(
        "/api/booking/search",
        { city, sport, date }
      );
      setAcademies(res.data.academies || []);
    } catch (err) {
      console.error(err);
      setAcademies([]);
    } finally {
      setHasSearched(true);
    }
  };

  const fetchCourtAvailability = async (
    academyId,
    sport,
    date,
    startTime,
    duration
  ) => {
    try {
      const payload: any = { academyId, sport, duration };
      if (date && startTime) {
        const utcParts = localDateTimeToUtcParts(date, startTime);
        payload.date = utcParts.date;
        payload.startTime = utcParts.time;
      } else {
        payload.date = date;
        payload.startTime = startTime;
      }

      const res = await axios.post(
        "/api/booking/check-availability",
        payload
      );
      setCourts(res.data.courts || []);
    } catch (err) {
      console.error(err);
      setCourts([]);
    }
  };

  /* ================= BOOKING ================= */

  const handleBook = async (courtNumber) => {
    if (!selectedAcademy) return;

    const bookingDateTime = combineLocalDateAndTime(date, modalTime);
    const now = new Date();

    if (bookingDateTime.getTime() < now.getTime()) {
      toast({
        title: "Invalid booking",
        description: "You cannot book a past date or time.",
        variant: "destructive",
      });
      return;
    }

    const userEmail = JSON.parse(localStorage.getItem("user"))?.email;
    const userId = JSON.parse(localStorage.getItem("user"))?.userId;

    const utcParts = localDateTimeToUtcParts(date, modalTime);
    await axios.post("/api/booking/create", {
      userEmail,
      userId,
      academyId: selectedAcademy._id,
      sport,
      courtNumber,
      date: utcParts.date,
      startTime: utcParts.time,
      duration: modalDuration,
    });

    toast({
      title: "Success",
      description: "Booking Confirmed!",
    });

    setSelectedAcademy(null);
    setCourts([]);
    handleSearch();
  };

  const handleOpenSheet = (academy) => {
    const sportConfig = academy.sports.find(
      (s) => s.sportName === sport
    );
    const academyStart = sportConfig?.startTime || "08:00";

    let startTime = academyStart;

    if (isToday) {
      const nowMinutes = getNowInMinutes();
      const academyStartMinutes =
        parseInt(academyStart.split(":")[0]) * 60 +
        parseInt(academyStart.split(":")[1]);

      const validMinutes = Math.max(nowMinutes, academyStartMinutes);
      const rounded = Math.ceil(validMinutes / 30) * 30;

      const hrs = String(Math.floor(rounded / 60)).padStart(2, "0");
      const mins = String(rounded % 60).padStart(2, "0");
      startTime = `${hrs}:${mins}`;
    }

    setSelectedAcademy(academy);
    setModalTime(startTime);
    setModalDuration(60);
    setCourts([]);

    fetchCourtAvailability(
      academy._id,
      sport,
      date,
      startTime,
      60
    );
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Book a Court</h1>
            <p className="text-slate-600 text-lg">Find available slots and confirm your booking in seconds</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button className="rounded-lg h-11" onClick={() => navigate('/my-bookings')}>My Bookings</Button>
            <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="text-slate-900">Search Courts</CardTitle>
            <CardDescription>Choose city, sport, and date to see available academies</CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-700">City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {capitalizeWords(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700">Sport</Label>
                <Select value={sport} onValueChange={setSport} disabled={!city}>
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportsList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {capitalizeWords(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700">Date</Label>
                <div className="relative mt-2">
                  <Input
                    type="date"
                    value={date}
                    min={todayStr}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSearch}
                disabled={!city || !sport || !date}
                className="rounded-lg h-11"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Academies
              </Button>

              {city && sport && date && (
                <Badge variant="outline" className="border-slate-300 text-slate-700">
                  {capitalizeWords(city)} · {capitalizeWords(sport)} · {date}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Available Academies</h2>
            <p className="text-sm text-slate-500">{academies.length} found</p>
          </div>

          {hasSearched && academies.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <p className="text-slate-500">No academies found for the selected filters.</p>
              </CardContent>
            </Card>
          )}

          {academies.map((academy) => (
            <Card key={academy._id} className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-lg text-slate-900">
                        {capitalizeWords(academy.name)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>{capitalizeWords(academy.address || academy.city)}</span>
                    </div>
                  </div>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="rounded-lg" onClick={() => handleOpenSheet(academy)}>
                        Book Now
                      </Button>
                    </SheetTrigger>

                    <SheetContent side="right" className="w-[95vw] max-w-md p-0 overflow-hidden">
                      <SheetHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-5">
                        <SheetTitle className="text-slate-900">{capitalizeWords(academy.name)}</SheetTitle>
                        <SheetDescription className="text-slate-600">
                          {capitalizeWords(sport)} on {date}
                        </SheetDescription>
                      </SheetHeader>

                      <div className="p-6 space-y-6">
                        <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white">
                          <div className="flex items-center gap-2 text-slate-900 font-medium">
                            <Clock3 className="w-4 h-4 text-blue-600" />
                            Select Time
                          </div>

                          <Slider
                            className="w-full h-2 bg-gray-200 rounded"
                            thumbClassName="bg-primary h-4 w-4 rounded-full"
                            trackClassName="bg-primary/40 h-2 rounded"
                            min={
                              isToday
                                ? Math.ceil(getNowInMinutes() / 30) * 0.5
                                : 6
                            }
                            max={22}
                            step={0.5}
                            value={
                              parseInt(modalTime.split(":")[0]) +
                              parseInt(modalTime.split(":")[1]) / 60
                            }
                            onChange={(val) => {
                              const totalMinutes = val * 60;
                              if (isToday && totalMinutes < getNowInMinutes()) return;

                              const hrs = String(Math.floor(val)).padStart(2, "0");
                              const mins = val % 1 === 0 ? "00" : "30";
                              const timeStr = `${hrs}:${mins}`;

                              setModalTime(timeStr);
                              fetchCourtAvailability(
                                academy._id,
                                sport,
                                date,
                                timeStr,
                                modalDuration
                              );
                            }}
                          />

                          <p className="text-sm text-slate-600">Selected Time: <span className="font-semibold text-slate-900">{modalTime}</span></p>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4 bg-white">
                          <label className="font-medium text-slate-900">Duration</label>
                          <select
                            className="border rounded p-2 w-full mt-2 bg-white"
                            value={modalDuration}
                            onChange={(e) => {
                              const d = Number(e.target.value);
                              setModalDuration(d);
                              fetchCourtAvailability(
                                academy._id,
                                sport,
                                date,
                                modalTime,
                                d
                              );
                            }}
                          >
                            <option value={30}>30 mins</option>
                            <option value={60}>60 mins</option>
                            <option value={90}>90 mins</option>
                          </select>
                        </div>

                        <div>
                          <p className="font-medium text-slate-900 mb-3">Available Courts</p>
                          <div className="flex flex-wrap gap-3">
                            {courts.map((court) => (
                              <div
                                key={court.courtNumber}
                                onClick={() =>
                                  court.available &&
                                  handleBook(court.courtNumber)
                                }
                                className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center cursor-pointer transition-all
                                  ${
                                    court.available
                                      ? "bg-emerald-100 border-emerald-400 hover:scale-105"
                                      : "bg-rose-100 border-rose-400 cursor-not-allowed"
                                  }`}
                              >
                                <span className="font-semibold">
                                  {court.courtNumber}
                                </span>
                                <span className="text-xs">
                                  {court.price} CAD
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

