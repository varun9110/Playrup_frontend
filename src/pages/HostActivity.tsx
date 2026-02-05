import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";

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

/* ----------------------------- Schema ----------------------------- */

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
});

type FormData = z.infer<typeof schema>;

/* ----------------------------- Component ----------------------------- */

export default function HostActivity() {
  const { toast } = useToast();
  const userEmail = JSON.parse(localStorage.getItem("user")!).email;

  const [bookings, setBookings] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [academiesList, setAcademiesList] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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

  const selectedAcademy = useMemo(
    () => academiesList.find((a) => a._id === selectedAcademyId),
    [academiesList, selectedAcademyId]
  );

  const timeSlots = [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM",
    "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM",
    "4:00 PM", "5:00 PM", "6:00 PM",
    "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
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
    return startIndex >= 0 ? timeSlots.slice(startIndex + 1) : timeSlots;
  }, [selectedTimeStart]);

  /* ----------------------------- Initial Data ----------------------------- */

  useEffect(() => {
    axios
      .post("http://localhost:5000/api/booking/my-bookings", { userEmail })
      .then((res) => {
        setBookings(res.data.filter((b: any) => new Date(b.date) >= new Date()));
      });

    axios
      .get("http://localhost:5000/api/academy/locations")
      .then((res) => setCities(res.data?.uniqueCities || []))
      .catch(console.error);
  }, []);

  /* ----------------------------- Fetch Sports by Location ----------------------------- */

  useEffect(() => {
    if (!selectedLocation) {
      setSportsList([]);
      setValue("sport", "");
      return;
    }

    axios
      .get(`http://localhost:5000/api/academy/sports/${selectedLocation}`)
      .then((res) => {
        setSportsList(res.data?.sports || []);
        setValue("sport", "");
        setAcademiesList([]); // Clear academies when location changes
        setValue("academyId", "");
      })
      .catch(console.error);
  }, [selectedLocation]);

  /* ----------------------------- Fetch Academies by Location + Sport ----------------------------- */

  useEffect(() => {
    if (!selectedLocation || !selectedSport) {
      setAcademiesList([]);
      setValue("academyId", "");
      return;
    }

    axios
      .get("http://localhost:5000/api/academy/getAcademies", {
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
  }, [selectedLocation, selectedSport]);

  /* ----------------------------- Fetch Courts by Academy + Sport ----------------------------- */

  useEffect(() => {
    if (!selectedAcademy || !selectedSport) {
      setCourts([]);
      setValue("courtNumber", "");
      return;
    }

    axios
      .get("http://localhost:5000/api/academy/getCourts", {
        params: { email: selectedAcademy.email, sport: selectedSport },
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
  }, [selectedAcademy, selectedSport]);

  /* ----------------------------- Booking Mapping ----------------------------- */

  const handleBookingSelect = (bookingId: string) => {
    const booking = bookings.find((b) => b._id === bookingId);
    setSelectedBooking(booking);

    setValue("bookingId", booking._id);
    setValue("location", booking.city);
    setValue("sport", booking.sport);
    setValue("academyId", booking.academyId);
    setValue("academyName", booking.academyName);
    setValue("academyAddress", booking.address);
    setValue("date", new Date(booking.date));
    setValue("timeStart", booking.startTime);
    setValue("timeEnd", booking.endTime);
    setValue("courtNumber", booking.courtNumber);
  };

  /* ----------------------------- Submit ----------------------------- */

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        hostEmail: userEmail,
        city: data.location,
        location: data.location,
        sport: data.sport,
        academy: selectedAcademy?.name || "",
        address: selectedAcademy?.address || "",
        date: data.date,
        fromTime: data.timeStart,
        toTime: data.timeEnd,
        courtNumber: data.courtNumber || "",
        skillLevel: data.skillLevel,
        maxPlayers: data.maxParticipants,
        pricePerParticipant: data.price || 0,
      };

      const res = await axios.post("http://localhost:5000/api/activity/createActivity", payload);

      if (res.data.success) {
        toast({ title: "Activity created 🎉" });
      } else {
        toast({ title: res.data.message || "Failed to create activity", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to create activity", variant: "destructive" });
    }
  };

  /* ----------------------------- UI ----------------------------- */

  return (
    <div className="container max-w-3xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Host an Activity</CardTitle>
          <CardDescription>
            Map an existing booking or create a new activity
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Map Booking */}
            <div>
              <Label>Map a Booking (Optional)</Label>
              <Select onValueChange={handleBookingSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select future booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.academyName} • {b.sport} • {format(new Date(b.date), "PPP")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            {!selectedBooking && (
              <div>
                <Label>Location</Label>
                <Select onValueChange={(v) => setValue("location", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sport */}
            {!selectedBooking && (
              <div>
                <Label>Sport</Label>
                <Select onValueChange={(v) => setValue("sport", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportsList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Academy */}
            {!selectedBooking && (
              <div>
                <Label>Academy</Label>
                <Select onValueChange={(v) => setValue("academyId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select academy" />
                  </SelectTrigger>
                  <SelectContent>
                    {academiesList.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Address */}
            <div>
              <Label>Address</Label>
              <Input disabled value={selectedAcademy?.address || ""} />
            </div>

            {/* Date */}
            {!selectedBooking && (
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
                      disabled={(d) => d < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Time Start */}
            {!selectedBooking && (
              <div>
                <Label>Start Time</Label>
                <Select onValueChange={(v) => setValue("timeStart", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStartTimes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time End */}
            {!selectedBooking && (
              <div>
                <Label>End Time</Label>
                <Select onValueChange={(v) => setValue("timeEnd", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEndTimes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Court */}
            {!selectedBooking && selectedAcademy && courts.length > 0 && (
              <div>
                <Label>Court</Label>
                <Select onValueChange={(v) => setValue("courtNumber", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select court" />
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

            {/* Skill */}
            <div>
              <Label>Skill Level</Label>
              <Select onValueChange={(v) => setValue("skillLevel", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["All Levels", "Beginner", "Intermediate", "Advanced"].map(
                    (l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Participants */}
            <div>
              <Label>Max Participants</Label>
              <Input
                type="number"
                min={2}
                onChange={(e) => setValue("maxParticipants", +e.target.value)}
              />
            </div>

            {/* Price */}
            <div>
              <Label>Price per Person (Optional)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                onChange={(e) => setValue("price", +e.target.value)}
              />
            </div>

            <Button className="w-full">Create Activity</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
