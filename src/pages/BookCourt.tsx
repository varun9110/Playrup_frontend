import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Slider from "react-slider";
import { capitalizeWords } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/academy/locations");
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
          `http://localhost:5000/api/academy/sports/${city}`
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
        "http://localhost:5000/api/booking/search",
        { city, sport, date }
      );
      setAcademies(res.data.academies || []);
    } catch (err) {
      console.error(err);
      setAcademies([]);
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
      const res = await axios.post(
        "http://localhost:5000/api/booking/check-availability",
        {
          academyId,
          sport,
          date,
          startTime,
          duration,
        }
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

    const bookingDateTime = new Date(`${date}T${modalTime}:00`);
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

    await axios.post("http://localhost:5000/api/booking/create", {
      userEmail,
      academyId: selectedAcademy._id,
      sport,
      courtNumber,
      date,
      startTime: modalTime,
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
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Book a Court</CardTitle>
          <CardDescription>
            Search for available courts by city, sport, and date
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
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
              <Label>Sport</Label>
              <Select value={sport} onValueChange={setSport} disabled={!city}>
                <SelectTrigger>
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
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSearch}
              disabled={!city || !sport || !date}
            >
              Search Academies
            </Button>
          </div>
        </CardContent>
      </Card>

      {academies.map((academy) => (
        <Card key={academy._id}>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">
                  {capitalizeWords(academy.name)}
                </h3>
                <p className="text-sm text-gray-500">
                  {capitalizeWords(academy.address || academy.city)}
                </p>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" onClick={() => handleOpenSheet(academy)}>
                    Book
                  </Button>
                </SheetTrigger>

                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>{capitalizeWords(academy.name)}</SheetTitle>
                    <SheetTitle>
                      {capitalizeWords(sport)} on {date}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <label className="font-medium">Select Time</label>

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

                    <p className="text-sm">Selected: {modalTime}</p>

                    <label className="font-medium">Duration</label>
                    <select
                      className="border rounded p-2 w-full"
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

                    <div className="flex flex-wrap gap-3 mt-4">
                      {courts.map((court) => (
                        <div
                          key={court.courtNumber}
                          onClick={() =>
                            court.available &&
                            handleBook(court.courtNumber)
                          }
                          className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center cursor-pointer
                            ${
                              court.available
                                ? "bg-green-200 border-green-500"
                                : "bg-red-200 border-red-500 cursor-not-allowed"
                            }`}
                        >
                          <span className="font-semibold">
                            {court.courtNumber}
                          </span>
                          <span className="text-sm">
                            {court.price} CAD
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
