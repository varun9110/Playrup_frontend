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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

  // Drawer state
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [modalTime, setModalTime] = useState("08:00");
  const [modalDuration, setModalDuration] = useState(60);
  const [courts, setCourts] = useState([]);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/academy/locations");
        if (res.data?.uniqueCities) setCities(res.data.uniqueCities);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchCities();
  }, []);

  // Fetch sports when city changes
  useEffect(() => {
    const fetchSports = async () => {
      if (!city) {
        setSportsList([]);
        setSport("");
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5000/api/academy/sports/${city}`);
        setSportsList(res.data?.sports || []);
        setSport("");
      } catch (error) {
        console.error("Error fetching sports:", error);
        setSportsList([]);
        setSport("");
      }
    };
    fetchSports();
  }, [city]);

  const handleSearch = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/booking/search", { city, sport, date });
      setAcademies(res.data.academies || []);
    } catch (err) {
      console.error("Error fetching academies:", err);
      setAcademies([]);
    }
  };

  const fetchCourtAvailability = async (academyId, sport, date, startTime, duration) => {
    try {
      const res = await axios.post("http://localhost:5000/api/booking/check-availability", {
        academyId,
        sport,
        date,
        startTime,
        duration,
      });
      setCourts(res.data.courts || []);
    } catch (err) {
      console.error("Error fetching court availability:", err);
      setCourts([]);
    }
  };

  const handleBook = async (courtNumber) => {
    if (!selectedAcademy) return;
    const userEmail = JSON.parse(localStorage.getItem("user")).email;

    // Helper to convert "HH:MM" to minutes
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Helper to convert minutes back to "HH:MM"
    const minutesToTime = (minutes) => {
      const hrs = Math.floor(minutes / 60) % 24;
      const mins = minutes % 60;
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    const startMinutes = timeToMinutes(modalTime);
    const endMinutes = startMinutes + modalDuration;
    const endTime = minutesToTime(endMinutes);

    await axios.post("http://localhost:5000/api/booking/create", {
      userEmail,
      academyId: selectedAcademy._id,
      sport,
      courtNumber,
      date,
      startTime: modalTime,
      // endTime,
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
    setSelectedAcademy(academy);
    setModalTime(academy.sports.find((s) => s.sportName === sport)?.startTime || "08:00");
    setModalDuration(60);
    setCourts([]);
    fetchCourtAvailability(
      academy._id,
      sport,
      date,
      academy.sports.find((s) => s.sportName === sport)?.startTime || "08:00",
      60
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Book a Court</CardTitle>
          <CardDescription> Search for available courts by city, sport, and date </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{capitalizeWords(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sport</Label>
              <Select value={sport} onValueChange={setSport} disabled={!city}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {sportsList.map((s) => (
                    <SelectItem key={s} value={s}>{capitalizeWords(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={handleSearch} className="w-full md:w-auto" disabled={!city || !sport || !date}> Search Academies </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}

      {academies.map((academy) => (
        <Card key={academy._id}>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{capitalizeWords(academy.name)}</h3>
                <p className="text-sm text-gray-500">{capitalizeWords(academy.address || academy.city)}</p>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenSheet(academy)}
                  >
                    Book
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>
                      {capitalizeWords(academy.name)}
                    </SheetTitle>
                    <SheetTitle>
                      {capitalizeWords(sport)} on {date}
                    </SheetTitle>
                  </SheetHeader>

                  {/* Time Slider */}
                  <div className="space-y-4 mt-4">
                    <label className="font-medium">Select Time</label>
                    <div className="flex items-center space-x-2">
                      {/* Decrease button */}
                      <button
                        className="p-2 bg-gray-300 rounded hover:bg-gray-400"
                        onClick={() => {
                          const [h, m] = modalTime.split(":").map(Number);
                          let val = h + m / 60 - 0.5;
                          if (val < 6) val = 6; // min limit
                          const hours = Math.floor(val) < 10 ? `0${Math.floor(val)}` : Math.floor(val);
                          const minutes = val % 1 === 0 ? "00" : "30";
                          const timeStr = `${hours}:${minutes}`;
                          setModalTime(timeStr);
                          fetchCourtAvailability(academy._id, sport, date, timeStr, modalDuration);
                        }}
                      >
                        ◀
                      </button>

                      {/* Slider */}
                      <Slider
                        className="w-full h-2 bg-gray-200 rounded"
                        thumbClassName="bg-primary h-4 w-4 rounded-full"
                        trackClassName="bg-primary/40 h-2 rounded"
                        min={6}
                        max={22}
                        step={0.5}
                        value={parseInt(modalTime.split(":")[0]) + parseInt(modalTime.split(":")[1]) / 60}
                        onChange={(val) => {
                          const hours = Math.floor(val) < 10 ? `0${Math.floor(val)}` : Math.floor(val);
                          const minutes = val % 1 === 0 ? "00" : "30";
                          const timeStr = `${hours}:${minutes}`;
                          setModalTime(timeStr);
                          fetchCourtAvailability(academy._id, sport, date, timeStr, modalDuration);
                        }}
                      />

                      {/* Increase button */}
                      <button
                        className="p-2 bg-gray-300 rounded hover:bg-gray-400"
                        onClick={() => {
                          const [h, m] = modalTime.split(":").map(Number);
                          let val = h + m / 60 + 0.5;
                          if (val > 22) val = 22; // max limit
                          const hours = Math.floor(val) < 10 ? `0${Math.floor(val)}` : Math.floor(val);
                          const minutes = val % 1 === 0 ? "00" : "30";
                          const timeStr = `${hours}:${minutes}`;
                          setModalTime(timeStr);
                          fetchCourtAvailability(academy._id, sport, date, timeStr, modalDuration);
                        }}
                      >
                        ▶
                      </button>
                    </div>
                    <p className="text-sm">Selected: {modalTime}</p>
                  </div>


                  {/* Duration */}
                  <div className="space-y-2 mt-4">
                    <label className="font-medium">Duration</label>
                    <select
                      className="border rounded p-2 w-full"
                      value={modalDuration}
                      onChange={(e) => {
                        const dur = Number(e.target.value);
                        setModalDuration(dur);
                        fetchCourtAvailability(academy._id, sport, date, modalTime, dur);
                      }}
                    >
                      <option value={30}>30 mins</option>
                      <option value={60}>60 mins</option>
                      <option value={90}>90 mins</option>
                    </select>
                  </div>

                  {/* Courts */}
                  {/* Courts */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {courts.map((court) => (
                      <div
                        key={court.courtNumber}
                        className={`p-4 rounded-full border w-20 h-20 flex flex-col items-center justify-center cursor-pointer
        ${court.available ? "bg-green-200 border-green-500" : "bg-red-200 border-red-500 cursor-not-allowed"}
      `}
                        onClick={() => court.available && handleBook(court.courtNumber)}
                      >
                        <span className="text-lg font-semibold">{court.courtNumber}</span>
                        <span className="text-sm text-gray-700">{court.price} CAD</span>
                      </div>
                    ))}
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
