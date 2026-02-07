import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";
import { useParams, useNavigate } from "react-router-dom";

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
import { CalendarIcon } from "lucide-react";
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
  const userEmail = JSON.parse(localStorage.getItem("user")!).email;

  const [cities, setCities] = useState<string[]>([]);
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [academiesList, setAcademiesList] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const timeSlots = [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
  ];

  const filteredStartTimes = useMemo(() => {
    if (!selectedDate) return timeSlots;
    if (isSameDay(selectedDate, new Date())) {
      const nowHour = new Date().getHours();
      return timeSlots.filter((t) => {
        const hour = parseInt(t);
        return t.includes("PM") ? hour + 12 > nowHour : hour > nowHour;
      });
    }
    return timeSlots;
  }, [selectedDate]);

  const filteredEndTimes = useMemo(() => {
    if (!selectedTimeStart) return timeSlots;
    const startIndex = timeSlots.indexOf(selectedTimeStart);
    return timeSlots.slice(startIndex + 1);
  }, [selectedTimeStart]);

  /* ---------------- Load Activity ---------------- */
  useEffect(() => {
    if (!activityId) return;
    let isMounted = true;

    const loadActivity = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/activity/${activityId}`);
        if (!isMounted) return;
        const a = res.data?.activity;
        if (!a) throw new Error("Activity not found");

        setValue("location", a.city);
        setValue("sport", a.sport);
        setValue("date", new Date(a.date));
        setValue("timeStart", a.fromTime);
        setValue("timeEnd", a.toTime);
        setValue("courtNumber", a.courtNumber);
        setValue("skillLevel", a.skillLevel);
        setValue("maxParticipants", a.maxPlayers);
        setValue("price", a.pricePerParticipant);
        setValue("address", a.address || "");

        setLoading(false);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED") return;
        console.error("Load activity failed:", err);
        toast({ title: "Failed to load activity", variant: "destructive" });
      }
    };

    loadActivity();
    return () => { isMounted = false; };
  }, [activityId, setValue]);

  /* ---------------- Fetch Lookups ---------------- */

  useEffect(() => {
    axios.get("http://localhost:5000/api/academy/locations")
      .then(res => setCities(res.data.uniqueCities || []));
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    axios.get(`http://localhost:5000/api/academy/sports/${selectedLocation}`)
      .then(res => setSportsList(res.data.sports || []));
  }, [selectedLocation]);

  useEffect(() => {
    if (!selectedLocation || !selectedSport) return;
    axios.get("http://localhost:5000/api/academy/getAcademies", {
      params: { city: selectedLocation, sport: selectedSport }
    }).then(res => {
      setAcademiesList(res.data.academies || []);
    });
  }, [selectedLocation, selectedSport]);


  useEffect(() => {
    if (!selectedAcademy || !selectedSport) return;
    axios.get("http://localhost:5000/api/academy/getCourts", {
      params: { email: selectedAcademy.email, sport: selectedSport }
    }).then(res => setCourts(res.data.courts || []));
  }, [selectedAcademy, selectedSport]);

  /* ---------------- Submit ---------------- */

  const onSubmit = async (data: FormData) => {
    try {
      await axios.put(`http://localhost:5000/api/activity/updateActivity/${activityId}`, {
        hostEmail: userEmail,
        city: data.location,
        sport: data.sport,
        academyId: data.academyId,
        address: data.address,
        date: data.date,
        fromTime: data.timeStart,
        toTime: data.timeEnd,
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

  if (loading) return null;

  /* ---------------- UI ---------------- */

  return (
    <div className="container max-w-3xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Activity</CardTitle>
          <CardDescription>Update your hosted activity</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Location */}
            <div>
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={(v) => setValue("location", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Sport */}
            <div>
              <Label>Sport</Label>
              <Select value={selectedSport} onValueChange={(v) => setValue("sport", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sportsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Academy */}
            <div>
              <Label>Academy</Label>
              <Select
                value={watch("academyId") || ""}
                disabled={!academiesList.length}
                onValueChange={(v) => setValue("academyId", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {academiesList.map(a => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div>
              <Label>Address</Label>
              <Input value={watch("address") || ""} onChange={(e) => setValue("address", e.target.value)} />
            </div>

            {/* Date */}
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => setValue("date", d!)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Select value={selectedTimeStart || ""} onValueChange={(v) => setValue("timeStart", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filteredStartTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>End Time</Label>
                <Select value={selectedTimeEnd || ""} onValueChange={(v) => setValue("timeEnd", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filteredEndTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Skill Level */}
            <div>
              <Label>Skill Level</Label>
              <Select
                value={selectedSkillLevel}
                onValueChange={(v) =>
                  setValue("skillLevel", v as "All Levels" | "Beginner" | "Intermediate" | "Advanced")
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["All Levels", "Beginner", "Intermediate", "Advanced"].map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Participants */}
            <div>
              <Label>Max Participants</Label>
              <Input
                type="number"
                min={2}
                value={maxParticipants || 2}
                onChange={(e) => setValue("maxParticipants", parseInt(e.target.value))}
              />
            </div>

            {/* Price */}
            <div>
              <Label>Price Per Person (CAD)</Label>
              <Input
                type="number"
                min={0}
                value={watch("price") || 0}
                onChange={(e) => setValue("price", parseFloat(e.target.value))}
              />
            </div>

            <Button className="w-full">Update Activity</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
