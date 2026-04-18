import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay, isValid } from "date-fns";
import { capitalizeWords, localDateTimeToUtcParts, utcDateTimeToLocalParts } from '@/lib/utils';
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Trophy,
  ArrowLeft,
  DollarSign,
  Star,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  location: z.string().min(1),
  sport: z.string().min(1),
  academyId: z.string().min(1),
  address: z.string().min(1),
  date: z.date(),
  timeStart: z.string().min(1),
  timeEnd: z.string().min(1),
  courtNumber: z.string().optional(),
  skillLevel: z.enum(["All Levels", "Beginner", "Intermediate", "Advanced"]),
  maxParticipants: z.coerce.number().min(2),
  price: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditActivity() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const userEmail = storedUser?.email;
  const userId = storedUser?.userId;

  const [cities, setCities] = useState<string[]>([]);
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [academiesList, setAcademiesList] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [shareCode, setShareCode] = useState('');

  const { handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      skillLevel: "All Levels",
      maxParticipants: 2,
      address: "",
    },
  });

  const selectedDate = watch("date");
  const selectedLocation = watch("location");
  const selectedSport = watch("sport");
  const selectedAcademyId = watch("academyId");
  const selectedTimeStart = watch("timeStart");
  const selectedTimeEnd = watch("timeEnd");
  const selectedSkillLevel = watch("skillLevel");
  const maxParticipants = watch("maxParticipants");

  const selectedAcademy = useMemo(
    () => academiesList.find((a) => a._id === selectedAcademyId),
    [academiesList, selectedAcademyId]
  );

  const safeCapitalize = (value?: string) => (value ? capitalizeWords(value) : "");

  const to12HourSlot = (timeValue?: string) => {
    if (!timeValue) return "";
    const raw = String(timeValue).trim();

    // Already 12-hour format.
    if (/^\d{1,2}:\d{2}\s*[AaPp][Mm]$/.test(raw)) {
      const [timePart, ampmPart] = raw.split(/\s+/);
      const [h, m] = timePart.split(":");
      return `${Number(h)}:${m} ${ampmPart.toUpperCase()}`;
    }

    // 24-hour format (HH:mm or HH:mm:ss).
    const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      const hour24 = Number(match24[1]);
      const minutes = match24[2];
      const ampm = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      return `${hour12}:${minutes} ${ampm}`;
    }

    // ISO/full datetime fallback.
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const hour24 = parsed.getHours();
      const minutes = String(parsed.getMinutes()).padStart(2, "0");
      const ampm = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      return `${hour12}:${minutes} ${ampm}`;
    }

    return raw;
  };

  const timeSlots = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
  ];

  const get24HourSlotValue = (slot: string) => {
    const [time, meridiem] = slot.split(" ");
    const hour12 = Number(time.split(":")[0]);

    if (meridiem === "AM") {
      return hour12 === 12 ? 0 : hour12;
    }

    return hour12 === 12 ? 12 : hour12 + 12;
  };

  const filteredStartTimes = useMemo(() => {
    if (!selectedDate || !isValid(selectedDate)) {
      if (!selectedTimeStart || timeSlots.includes(selectedTimeStart)) return timeSlots;
      return [selectedTimeStart, ...timeSlots];
    }

    if (isSameDay(selectedDate, new Date())) {
      const nowHour = new Date().getHours();
      const futureSlots = timeSlots.filter((slot) => get24HourSlotValue(slot) > nowHour);
      if (selectedTimeStart && !futureSlots.includes(selectedTimeStart)) {
        return [selectedTimeStart, ...futureSlots];
      }
      return futureSlots;
    }

    if (selectedTimeStart && !timeSlots.includes(selectedTimeStart)) {
      return [selectedTimeStart, ...timeSlots];
    }

    return timeSlots;
  }, [selectedDate, selectedTimeStart]);

  const filteredEndTimes = useMemo(() => {
    if (!selectedTimeStart) {
      if (!selectedTimeEnd || timeSlots.includes(selectedTimeEnd)) return timeSlots;
      return [selectedTimeEnd, ...timeSlots];
    }

    const startIndex = timeSlots.indexOf(selectedTimeStart);
    if (startIndex < 0) {
      if (selectedTimeEnd && !timeSlots.includes(selectedTimeEnd)) {
        return [selectedTimeEnd, ...timeSlots];
      }
      return timeSlots;
    }

    const endSlots = [...timeSlots.slice(startIndex + 1), ...timeSlots.slice(0, startIndex)];
    if (selectedTimeEnd && !endSlots.includes(selectedTimeEnd)) {
      return [selectedTimeEnd, ...endSlots];
    }
    return endSlots;
  }, [selectedTimeStart, selectedTimeEnd]);

  /* ---------------- Load Activity ---------------- */
  useEffect(() => {
    if (!activityId) return;
    let isMounted = true;

    const loadActivity = async () => {
      try {
        const res = await axios.get(`/api/activity/${activityId}`);
        if (!isMounted) return;
        const a = res.data?.activity;
        if (!a) throw new Error("Activity not found");

        setValue("location", a.city || a.location || "");
        setValue("sport", a.sport || "");
        setValue("academyId", String(a.academyId || ""));
        const localStart = utcDateTimeToLocalParts(a.date, a.fromTime);
        const localEnd = utcDateTimeToLocalParts(a.date, a.toTime);
        const resolvedDate = new Date(localStart?.date || a.date);
        setValue("date", isValid(resolvedDate) ? resolvedDate : new Date());
        setValue("timeStart", to12HourSlot(localStart?.time || a.fromTime));
        setValue("timeEnd", to12HourSlot(localEnd?.time || a.toTime));
        setValue("courtNumber", a.courtNumber ? String(a.courtNumber) : "");
        setValue("skillLevel", a.skillLevel || "All Levels");
        setValue("maxParticipants", Number(a.maxPlayers || 2));
        setValue("price", Number(a.pricePerParticipant || 0));
        setValue("address", a.address || "");
        setShareCode(a.shareCode || '');

        setAcademiesList((prev) => {
          const academyId = String(a.academyId || "");
          if (!academyId) return prev;
          if (prev.some((academy) => String(academy._id) === academyId)) return prev;
          return [
            {
              _id: academyId,
              name: a.academy || "Academy",
              address: a.address || "",
            },
            ...prev,
          ];
        });

        setLoading(false);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED") return;
        console.error("Load activity failed:", err);
        toast({ title: "Failed to load activity", variant: "destructive" });
        setLoading(false);
      }
    };

    loadActivity();
    return () => { isMounted = false; };
  }, [activityId, setValue]);

  /* ---------------- Fetch Lookups ---------------- */

  useEffect(() => {
    axios.get("/api/academy/locations")
      .then(res => setCities(res.data.uniqueCities || []));
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    axios.get(`/api/academy/sports/${selectedLocation}`)
      .then(res => setSportsList(res.data.sports || []));
  }, [selectedLocation]);

  useEffect(() => {
    if (!selectedLocation || !selectedSport) return;
    axios.get("/api/academy/getAcademies", {
      params: { city: selectedLocation, sport: selectedSport }
    }).then(res => {
      setAcademiesList(res.data.academies || []);
    });
  }, [selectedLocation, selectedSport]);


  useEffect(() => {
    if (!selectedAcademy || !selectedSport) return;
    axios.get("/api/academy/getCourts", {
      params: { email: selectedAcademy.email, sport: selectedSport }
    }).then(res => setCourts(res.data.courts || []));
  }, [selectedAcademy, selectedSport]);

  /* ---------------- Submit ---------------- */

  const onSubmit = async (data: FormData) => {
    try {
      const utcStart = localDateTimeToUtcParts(data.date, data.timeStart);
      const utcEnd = localDateTimeToUtcParts(data.date, data.timeEnd);
      await axios.put(`/api/activity/updateActivity/${activityId}`, {
        hostEmail: userEmail,
        hostId: userId,
        city: data.location,
        location: data.location,
        sport: data.sport,
        academyId: data.academyId,
        address: data.address,
        date: utcStart.date,
        fromTime: utcStart.time,
        toTime: utcEnd.time,
        courtNumber: data.courtNumber,
        skillLevel: data.skillLevel,
        maxPlayers: data.maxParticipants,
        pricePerParticipant: data.price || 0,
      });
      toast({ title: "Activity updated ✅" });
    } catch (err) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleCopyShareLink = async () => {
    if (!shareCode) {
      toast({ title: "Share Link Is Not Available Yet", variant: "destructive" });
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/activity/share/${shareCode}`);
      toast({ title: "Share Link Copied" });
    } catch (_error) {
      toast({ title: "Unable To Copy Share Link", variant: "destructive" });
    }
  };

  if (!userEmail || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <Navbar onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
          <Card className="border-slate-200">
            <CardContent className="p-10 text-center text-slate-500">Unauthorized access. Please log in again.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <Navbar onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
          <Card className="border-slate-200">
            <CardContent className="p-10 text-center text-slate-500">Loading activity details...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  const skillLevelConfig: Record<string, { icon: React.ReactNode }> = {
    "All Levels": { icon: <Users className="w-3 h-3" /> },
    Beginner: { icon: <Star className="w-3 h-3" /> },
    Intermediate: { icon: <Zap className="w-3 h-3" /> },
    Advanced: { icon: <Trophy className="w-3 h-3" /> },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900 -ml-2"
              onClick={() => navigate('/activities')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Activities
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyShareLink} disabled={!shareCode}>
              Copy Share Link
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Edit Activity</h1>
          <p className="text-slate-600 text-lg">
            Update your hosted activity details and keep your players informed
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-4 px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-blue-600" />
              Activity Details
            </CardTitle>
            <CardDescription className="mt-0.5">
              Make your changes and save to update this activity
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Venue
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">City</Label>
                    <Select value={selectedLocation} onValueChange={(v) => setValue("location", v)}>
                      <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{safeCapitalize(city)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Sport</Label>
                    <Select value={selectedSport} onValueChange={(v) => setValue("sport", v)}>
                      <SelectTrigger><SelectValue placeholder="Select Sport" /></SelectTrigger>
                      <SelectContent>
                        {sportsList.map((sport) => (
                          <SelectItem key={sport} value={sport}>{safeCapitalize(sport)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-sm font-medium">Academy</Label>
                    <Select
                      value={watch("academyId") || ""}
                      disabled={!academiesList.length}
                      onValueChange={(v) => setValue("academyId", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Academy" /></SelectTrigger>
                      <SelectContent>
                        {academiesList.map((academy) => (
                          <SelectItem key={academy._id} value={String(academy._id)}>
                            {safeCapitalize(academy.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address
                    </Label>
                    <Input
                      value={watch("address") || ""}
                      readOnly
                      placeholder="Enter address"
                      className="bg-slate-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

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
                          {selectedDate && isValid(selectedDate) ? format(selectedDate, "PP") : "Pick a date"}
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
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Start Time</Label>
                    <Select value={selectedTimeStart || ""} onValueChange={(v) => setValue("timeStart", v)}>
                      <SelectTrigger><SelectValue placeholder="Start Time" /></SelectTrigger>
                      <SelectContent>
                        {filteredStartTimes.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">End Time</Label>
                    <Select value={selectedTimeEnd || ""} onValueChange={(v) => setValue("timeEnd", v)}>
                      <SelectTrigger><SelectValue placeholder="End Time" /></SelectTrigger>
                      <SelectContent>
                        {filteredEndTimes.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!!courts.length && (
                  <div className="mt-4 space-y-1.5">
                    <Label className="text-sm font-medium">Court</Label>
                    <Select value={watch("courtNumber") || ""} onValueChange={(v) => setValue("courtNumber", v)}>
                      <SelectTrigger><SelectValue placeholder="Select Court" /></SelectTrigger>
                      <SelectContent>
                        {courts.map((court) => (
                          <SelectItem key={court.courtNumber} value={String(court.courtNumber)}>
                            Court {court.courtNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Activity Settings
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Skill Level</Label>
                    <Select
                      value={selectedSkillLevel}
                      onValueChange={(v) =>
                        setValue("skillLevel", v as "All Levels" | "Beginner" | "Intermediate" | "Advanced")
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["All Levels", "Beginner", "Intermediate", "Advanced"].map((level) => (
                          <SelectItem key={level} value={level}>
                            <span className="inline-flex items-center gap-1.5">
                              {skillLevelConfig[level].icon}
                              {level}
                            </span>
                          </SelectItem>
                        ))}
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
                      value={maxParticipants || 2}
                      onChange={(e) => setValue("maxParticipants", parseInt(e.target.value || '2', 10))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Price / Person
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={watch("price") || 0}
                      onChange={(e) => setValue("price", parseFloat(e.target.value || '0'))}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold">
                <Zap className="w-4 h-4 mr-2" />
                Update Activity
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

