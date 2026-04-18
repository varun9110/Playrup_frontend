import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, isSameDay, startOfToday } from "date-fns";
import { localDateTimeToUtcParts, utcDateTimeToLocalParts } from '@/lib/utils';
import { useNavigate } from "react-router-dom";
import { capitalizeWords } from "@/lib/utils";
import { Navbar } from "@/components/layout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  MapPin,
  Clock,
  Users,
  Zap,
  Trophy,
  DollarSign,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ----------------------------- Schema ----------------------------- */

const getHourValueFromSlot = (slot: string): number => {
  if (!slot) return Number.NaN;
  const normalized = slot.trim();

  const amPmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (amPmMatch) {
    const [, hourPart, , meridiem] = amPmMatch;
    const hour12 = Number(hourPart);
    if (Number.isNaN(hour12)) return Number.NaN;
    if (meridiem.toUpperCase() === "AM") return hour12 === 12 ? 0 : hour12;
    return hour12 === 12 ? 12 : hour12 + 12;
  }

  const hour24Match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hour24Match) {
    const hour24 = Number(hour24Match[1]);
    if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) return Number.NaN;
    return hour24;
  }

  return Number.NaN;
};

const schema = z.object({
  bookingId: z.string().optional(),

  location: z.string().min(1, "Location is required"),
  sport: z.string().min(1, "Sport is required"),

  academyId: z.string().min(1, "Academy is required"),
  academyName: z.string().optional(),
  academyAddress: z.string().optional(),

  date: z.date(),
  timeStart: z.string().min(1, "Start time is required"),
  timeEnd: z.string().min(1, "End time is required"),

  courtNumber: z.string().optional(),

  skillLevel: z.enum(["All Levels", "Beginner", "Intermediate", "Advanced"]),
  maxParticipants: z.coerce.number().min(2),
  price: z.coerce.number().optional(),
}).refine(
  (data) => {
    if (!data.timeStart || !data.timeEnd) return true;
    const startHour = getHourValueFromSlot(data.timeStart);
    const endHour = getHourValueFromSlot(data.timeEnd);

    if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
      return false;
    }

    // Allow midnight rollover only when selecting 12:00 AM as next-day end.
    if ((data.timeEnd === "12:00 AM" || data.timeEnd === "00:00") && startHour > 0) {
      return true;
    }

    return endHour > startHour;
  },
  {
    message: "End time must be later than start time",
    path: ["timeEnd"],
  }
);

type FormData = z.infer<typeof schema>;

/* ----------------------------- Component ----------------------------- */

export default function HostActivity() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const userEmail = JSON.parse(localStorage.getItem("user")!).email;
  const userId = JSON.parse(localStorage.getItem("user"))?.userId;

  const [bookings, setBookings] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [academiesList, setAcademiesList] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedBookingValue, setSelectedBookingValue] = useState("");
  const [bookingSelectRenderKey, setBookingSelectRenderKey] = useState(0);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      skillLevel: "All Levels",
      maxParticipants: 2,
    },
  });

  const selectedDate = watch("date");
  const selectedLocation = watch("location");
  const selectedSport = watch("sport");
  const selectedAcademyId = watch("academyId");
  const selectedTimeStart = watch("timeStart");
  const selectedTimeEnd = watch("timeEnd");

  const selectedAcademy = useMemo(
    () => academiesList.find((a) => a._id === selectedAcademyId),
    [academiesList, selectedAcademyId]
  );

  const resolvedAcademy = selectedAcademy || (selectedBooking
    ? {
        _id: selectedBooking.academyId,
        name: selectedBooking.academyName,
        address: selectedBooking.address,
      }
    : null);

  const timeSlots = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
  ];

  const get24HourSlotValue = (slot: string) => getHourValueFromSlot(slot);

  const filteredStartTimes = useMemo(() => {
    if (!selectedDate) return timeSlots;
    if (isSameDay(selectedDate, new Date())) {
      const nowHour = new Date().getHours();
      return timeSlots.filter((slot) => get24HourSlotValue(slot) > nowHour);
    }
    return timeSlots;
  }, [selectedDate]);

  const filteredEndTimes = useMemo(() => {
    if (!selectedTimeStart) return timeSlots;
    const startIndex = timeSlots.indexOf(selectedTimeStart);
    if (startIndex < 0) return timeSlots;
    const endOptions = [...timeSlots.slice(startIndex + 1)];

    if (selectedTimeStart !== "12:00 AM" && !endOptions.includes("12:00 AM")) {
      endOptions.push("12:00 AM");
    }

    return endOptions;
  }, [selectedTimeStart]);

  useEffect(() => {
    if (selectedBooking) return;

    if (!selectedTimeStart || !selectedTimeEnd) return;
    if (!filteredEndTimes.includes(selectedTimeEnd)) {
      setValue("timeEnd", "");
    }
  }, [selectedBooking, selectedTimeStart, selectedTimeEnd, filteredEndTimes, setValue]);

  /* ----------------------------- Initial Data ----------------------------- */

  useEffect(() => {
    axios
      .post("/api/booking/my-bookings", { userEmail, userId })
      .then((res) => {
        const bookingsFromApi = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.bookings)
          ? res.data.bookings
          : [];

        const now = new Date();
        const localBookings = bookingsFromApi.filter((b: any) => {
          const startFromUtc = utcDateTimeToLocalParts(b.date, b.startTime)?.dateObj;
          if (startFromUtc instanceof Date && !Number.isNaN(startFromUtc.getTime())) {
            return startFromUtc >= now;
          }

          // Fallback parser for date + 12-hour slot if conversion utility cannot parse.
          const dateOnly = String(b.date || "").includes("T")
            ? String(b.date).split("T")[0]
            : String(b.date || "");
          const localStart = new Date(dateOnly);
          if (Number.isNaN(localStart.getTime()) || !b.startTime) return false;

          localStart.setHours(get24HourSlotValue(b.startTime), 0, 0, 0);
          return localStart >= now;
        });
        setBookings(localBookings);
      });

    axios
      .get("/api/academy/locations")
      .then((res) => setCities(res.data?.uniqueCities || []))
      .catch(console.error);
  }, []);

  /* ----------------------------- Fetch Sports by Location ----------------------------- */

  useEffect(() => {
    if (selectedBooking) return;

    if (!selectedLocation) {
      setSportsList([]);
      setValue("sport", "");
      return;
    }

    axios
      .get(`/api/academy/sports/${selectedLocation}`)
      .then((res) => {
        setSportsList(res.data?.sports || []);
        setValue("sport", "");
        setAcademiesList([]); // Clear academies when location changes
        setValue("academyId", "");
      })
      .catch(console.error);
  }, [selectedLocation, selectedBooking, setValue]);

  /* ----------------------------- Fetch Academies by Location + Sport ----------------------------- */

  useEffect(() => {
    if (selectedBooking) return;

    if (!selectedLocation || !selectedSport) {
      setAcademiesList([]);
      setValue("academyId", "");
      return;
    }

    axios
      .get("/api/academy/getAcademies", {
        params: { city: selectedLocation, sport: selectedSport },
      })
      .then((res) => {
        setAcademiesList(res.data?.academies || []);
        setValue("academyId", "");
      })
      .catch((err) => {
        console.error(err);
        setAcademiesList([]);
      });
  }, [selectedLocation, selectedSport, selectedBooking, setValue]);

  /* ----------------------------- Fetch Courts by Academy + Sport ----------------------------- */

  useEffect(() => {
    if (selectedBooking) return;

    if (!resolvedAcademy || !selectedSport) {
      setCourts([]);
      setValue("courtNumber", "");
      return;
    }

    axios
      .get("/api/academy/getCourts", {
        params: { email: resolvedAcademy.email, sport: selectedSport },
      })
      .then((res) => {
        if (res.data?.success) {
          setCourts(res.data.courts || []);
          setValue("courtNumber", "");
        } else {
          setCourts([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching courts:", err);
        setCourts([]);
        setValue("courtNumber", "");
      });
  }, [resolvedAcademy, selectedSport, selectedBooking, setValue]);

  /* ----------------------------- Booking Mapping ----------------------------- */

  const clearSelectedBooking = () => {
    setSelectedBooking(null);
    setSelectedBookingValue("");
    setBookingSelectRenderKey((prev) => prev + 1);
    setValue("bookingId", "");
    setValue("location", "");
    setValue("sport", "");
    setValue("academyId", "");
    setValue("academyName", "");
    setValue("academyAddress", "");
    setValue("date", undefined as any);
    setValue("timeStart", "");
    setValue("timeEnd", "");
    setValue("courtNumber", "");
  };

  const handleBookingSelect = (bookingId: string) => {
    const booking = bookings.find((b) => b._id === bookingId);
    if (!booking) return;

    const resolvedAcademyId =
      typeof booking.academyId === "object" ? booking.academyId?._id : booking.academyId;
    const resolvedAcademyName = booking.academyName || booking.academyId?.name || "";
    const resolvedAcademyAddress = booking.address || booking.academyAddress || booking.academyId?.address || "";
    const resolvedCity = booking.city || booking.academyId?.city || "";
    const resolvedDate = utcDateTimeToLocalParts(booking.date, booking.startTime)?.dateObj || new Date(booking.date);

    setSelectedBookingValue(bookingId);
    setSelectedBooking(booking);

    // Seed academy list with selected booking academy so downstream selectors/payload stay consistent.
    setAcademiesList((prev) => {
      if (prev.some((a) => a._id === resolvedAcademyId)) return prev;
      return [
        {
          _id: resolvedAcademyId,
          name: resolvedAcademyName,
          address: resolvedAcademyAddress,
          email: booking.academyEmail || booking.email,
        },
        ...prev,
      ];
    });

    setValue("bookingId", String(booking._id || ""), { shouldValidate: true });
    setValue("location", String(resolvedCity || ""), { shouldValidate: true });
    setValue("sport", String(booking.sport || ""), { shouldValidate: true });
    setValue("academyId", String(resolvedAcademyId || ""), { shouldValidate: true });
    setValue("academyName", String(resolvedAcademyName || ""));
    setValue("academyAddress", String(resolvedAcademyAddress || ""));
    setValue("date", resolvedDate, { shouldValidate: true });
    setValue("timeStart", String(booking.startTime || ""), { shouldValidate: true });
    setValue("timeEnd", String(booking.endTime || ""), { shouldValidate: true });
    setValue("courtNumber", booking.courtNumber ? String(booking.courtNumber) : "");
  };

  const safeCapitalize = (value?: string) => (value ? capitalizeWords(value) : "");

  /* ----------------------------- Submit ----------------------------- */

  const onSubmit = async (data: FormData) => {
    try {
      const startHour = get24HourSlotValue(data.timeStart);
      const isNextDayMidnightEnd = (data.timeEnd === "12:00 AM" || data.timeEnd === "00:00") && startHour > 0;
      const endDate = isNextDayMidnightEnd ? addDays(data.date, 1) : data.date;

      const utcPartsStart = localDateTimeToUtcParts(data.date, data.timeStart);
      const utcPartsEnd = localDateTimeToUtcParts(endDate, data.timeEnd);
      const payload = {
        hostEmail: userEmail,
        hostId: userId,
        city: data.location,
        location: data.location,
        sport: data.sport,
        academyId: data.academyId || resolvedAcademy?._id || "",
        academy: data.academyName || resolvedAcademy?.name || "",
        address: data.academyAddress || resolvedAcademy?.address || "",
        date: utcPartsStart.date,
        fromTime: utcPartsStart.time,
        toTime: utcPartsEnd.time,
        courtNumber: data.courtNumber || "",
        skillLevel: data.skillLevel,
        maxPlayers: data.maxParticipants,
        pricePerParticipant: data.price || 0,
      };

      const res = await axios.post("/api/activity/createActivity", payload);

      if (res.data.success) {
        const shareCode = res.data?.activity?.shareCode;
        if (shareCode) {
          const shareLink = `${window.location.origin}/activity/share/${shareCode}`;
          try {
            await navigator.clipboard.writeText(shareLink);
            toast({ title: "Activity Created And Share Link Copied" });
          } catch (_error) {
            toast({ title: "Activity Created" });
          }
        } else {
          toast({ title: "Activity Created" });
        }
      } else {
        toast({ title: res.data.message || "Failed to create activity", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to create activity", variant: "destructive" });
    }
  };

  const onInvalid = (errors: Record<string, { message?: string }>) => {
    const firstError = Object.values(errors)[0];
    toast({
      title: firstError?.message || "Please complete all required fields",
      variant: "destructive",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  /* ----------------------------- UI ----------------------------- */

  const skillLevelConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    "All Levels": { color: "bg-slate-100 text-slate-700", icon: <Users className="w-3 h-3" /> },
    Beginner:     { color: "bg-green-100 text-green-700", icon: <Star className="w-3 h-3" /> },
    Intermediate: { color: "bg-blue-100 text-blue-700",  icon: <Zap className="w-3 h-3" /> },
    Advanced:     { color: "bg-purple-100 text-purple-700", icon: <Trophy className="w-3 h-3" /> },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Host an Activity</h1>
            <p className="text-slate-600 text-lg">
              Create a group activity and invite players in minutes
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button className="rounded-lg h-11" onClick={() => navigate('/my-hosted')}>
              My Hosted Activities
            </Button>
            <Button variant="outline" className="rounded-lg h-11" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full">
          {/* Step 1 — Link a Booking (optional) */}
          <Card className="overflow-hidden mb-6">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                Select a Future Booking
                <Badge className="ml-auto bg-blue-100 text-blue-700 text-xs font-medium">Optional</Badge>
              </CardTitle>
              <CardDescription className="mt-0.5">
                Choose a booking to auto-fill activity venue, date and time.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Select
                    key={bookingSelectRenderKey}
                    value={selectedBookingValue}
                    onValueChange={handleBookingSelect}
                    disabled={!bookings.length}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={bookings.length ? "Select Booking" : "No Future Bookings Available"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((booking) => (
                        <SelectItem key={booking._id} value={booking._id}>
                          {`${safeCapitalize(booking.academyName || booking.academyId?.name || "Academy")} · ${safeCapitalize(booking.sport || "Sport")} · ${format(new Date(booking.date), "PPP")} · ${booking.startTime || "--:--"} - ${booking.endTime || "--:--"}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:w-auto"
                  onClick={clearSelectedBooking}
                  disabled={!selectedBooking}
                >
                  Clear Booking
                </Button>
              </div>

              {selectedBooking && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                  Form pre-filled from selected booking. Clear booking to enter details manually.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Activity Form */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-blue-600" />
                Activity Details
              </CardTitle>
              <CardDescription className="mt-0.5">
                {selectedBooking
                  ? "Venue, date & time are pre-filled. Set skill level, participants & price."
                  : "Fill in all details for your activity"}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
              {/* ── Venue Section ── */}
              {!selectedBooking && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Venue
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">City</Label>
                      <Select onValueChange={(v) => setValue("location", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((city) => (
                            <SelectItem key={city} value={city}>{capitalizeWords(city)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Sport</Label>
                      <Select onValueChange={(v) => setValue("sport", v)} disabled={!selectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedLocation ? "Select Sport" : "Select City First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {sportsList.map((s) => (
                            <SelectItem key={s} value={s}>{capitalizeWords(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-sm font-medium">Academy</Label>
                      <Select onValueChange={(v) => setValue("academyId", v)} disabled={!selectedSport}>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedSport ? "Select Academy" : "Select Sport First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {academiesList.map((a) => (
                            <SelectItem key={a._id} value={a._id}>{capitalizeWords(a.name)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Address (always shown) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address
                </Label>
                <Input
                  disabled
                  value={resolvedAcademy?.address || ""}
                  placeholder="Auto-filled from academy selection"
                  className="bg-slate-50 text-slate-600"
                />
              </div>

              {/* ── Schedule Section ── */}
              {!selectedBooking && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Schedule
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Date</Label>
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {selectedDate ? format(selectedDate, "PP") : <span className="text-slate-400">Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => {
                              setValue("date", d!);
                              setIsDatePickerOpen(false);
                            }}
                            disabled={(d) => d < startOfToday()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Start Time</Label>
                      <Select onValueChange={(v) => setValue("timeStart", v)} disabled={!selectedDate}>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedDate ? "Start Time" : "Date First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStartTimes.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">End Time</Label>
                      <Select onValueChange={(v) => setValue("timeEnd", v)} disabled={!selectedTimeStart}>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedTimeStart ? "End Time" : "Start First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEndTimes.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t === "12:00 AM" ? "12:00 AM (Next Day)" : t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Court — only when academy + courts available */}
                  {selectedAcademy && courts.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <Label className="text-sm font-medium">Court</Label>
                      <Select onValueChange={(v) => setValue("courtNumber", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Court" />
                        </SelectTrigger>
                        <SelectContent>
                          {courts.map((c: any) => (
                            <SelectItem key={c.courtNumber} value={String(c.courtNumber)}>
                              Court {c.courtNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* ── Activity Settings ── */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Activity Settings
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Skill Level</Label>
                    <Select
                      defaultValue="All Levels"
                      onValueChange={(v) => setValue("skillLevel", v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["All Levels", "Beginner", "Intermediate", "Advanced"] as const).map((l) => {
                          const cfg = skillLevelConfig[l];
                          return (
                            <SelectItem key={l} value={l}>
                              <span className="flex items-center gap-1.5">
                                {cfg.icon}
                                {l}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Max Players
                    </Label>
                    <Input
                      type="number"
                      min={2}
                      defaultValue={2}
                      onChange={(e) => setValue("maxParticipants", +e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Price / Person
                      <span className="text-xs text-slate-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0 = free"
                      onChange={(e) => setValue("price", +e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold">
                <Zap className="w-4 h-4 mr-2" />
                Create Activity
              </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

