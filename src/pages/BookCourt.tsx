import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { Calendar, Clock3, MapPin, Search, Building2, Heart } from "lucide-react";

type AcademyItem = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  mapLink?: string;
  shareCode?: string;
  sports: Array<{
    sportName: string;
    startTime: string;
    endTime: string;
    numberOfCourts: number;
  }>;
};

type GeoPoint = {
  lat: number;
  lng: number;
};

type RateContext = {
  rateType: "weekday" | "holiday";
  weekday?: string;
  localDate?: string;
  timezone?: string;
};

const BOOK_COURT_FILTERS_STORAGE_KEY = "bookcourt.filters";
const BOOK_COURT_RESULTS_STORAGE_KEY = "bookcourt.results";

function BookCourt() {
  const location = useLocation();
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [date, setDate] = useState("");
  const [academies, setAcademies] = useState<AcademyItem[]>([]);
  const [cities, setCities] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const { toast } = useToast();

  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [modalTime, setModalTime] = useState("08:00");
  const [modalDuration, setModalDuration] = useState(60);
  const [courts, setCourts] = useState([]);
  const [rateContext, setRateContext] = useState<RateContext | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [favoriteAcademyIds, setFavoriteAcademyIds] = useState<string[]>([]);
  const [favoriteLoadingAcademyId, setFavoriteLoadingAcademyId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);
  const [distanceByAcademyId, setDistanceByAcademyId] = useState<Record<string, number>>({});
  const [openSheetAcademyId, setOpenSheetAcademyId] = useState<string | null>(null);
  const sheetJustClosedRef = useRef(false);
  const navigate = useNavigate();

  const prefills = (location.state || {}) as {
    city?: string;
    sport?: string;
    date?: string;
  };

  const getAcademyMapHref = (academy: AcademyItem) => {
    const trimmedMapLink = String(academy?.mapLink || "").trim();
    if (trimmedMapLink) {
      const lower = trimmedMapLink.toLowerCase();
      const isAbsoluteUrl =
        lower.startsWith("http://") ||
        lower.startsWith("https://") ||
        lower.startsWith("www.");

      if (isAbsoluteUrl) {
        return lower.startsWith("www.") ? `https://${trimmedMapLink}` : trimmedMapLink;
      }

      // If mapLink is plain text (e.g. venue name), open it as a Google Maps query.
      return `https://maps.google.com/maps?q=${encodeURIComponent(trimmedMapLink)}`;
    }

    const fallbackQuery = `${academy?.address || ""} ${academy?.city || ""}`.trim();
    if (!fallbackQuery) return "https://maps.google.com";
    return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackQuery)}`;
  };

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

  const haversineKm = (from: GeoPoint, to: GeoPoint) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const latDiff = toRad(to.lat - from.lat);
    const lngDiff = toRad(to.lng - from.lng);
    const a =
      Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
      Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
      Math.sin(lngDiff / 2) * Math.sin(lngDiff / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const extractCoordinates = (academy: AcademyItem): GeoPoint | null => {
    const mapLink = String(academy?.mapLink || '');
    const patterns = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/];

    for (const pattern of patterns) {
      const match = mapLink.match(pattern);
      if (!match) continue;
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      return { lat, lng };
    }

    return null;
  };

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
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchFavorites = async () => {
      try {
        const response = await axios.get('/api/user/favorite-academies', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFavoriteAcademyIds(response.data?.favoriteAcademyIds || []);
      } catch (error) {
        console.error('Failed to fetch favorite academies', error);
      }
    };

    void fetchFavorites();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (_error) => {
        setCurrentLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
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
        const nextSports = res.data?.sports || [];
        setSportsList(nextSports);
        setSport((prevSport) => (nextSports.includes(prevSport) ? prevSport : ""));
      } catch (err) {
        console.error(err);
      }
    };
    fetchSports();
  }, [city]);

  useEffect(() => {
    let storedFilters: { city?: string; sport?: string; date?: string } = {};
    try {
      storedFilters = JSON.parse(sessionStorage.getItem(BOOK_COURT_FILTERS_STORAGE_KEY) || "{}");
    } catch {
      storedFilters = {};
    }

    const nextCity = prefills.city || storedFilters.city || "";
    const nextSport = prefills.sport || storedFilters.sport || "";
    const nextDate = prefills.date || storedFilters.date || "";

    if (nextCity) setCity(nextCity);
    if (nextSport) setSport(nextSport);
    if (nextDate) setDate(nextDate);

    try {
      const storedResults = JSON.parse(sessionStorage.getItem(BOOK_COURT_RESULTS_STORAGE_KEY) || "{}");
      if (Array.isArray(storedResults?.academies)) {
        setAcademies(storedResults.academies);
      }
      if (typeof storedResults?.hasSearched === "boolean") {
        setHasSearched(storedResults.hasSearched);
      }
    } catch {
      // Ignore invalid session storage payloads.
    }
  }, [prefills.city, prefills.date, prefills.sport]);

  useEffect(() => {
    sessionStorage.setItem(
      BOOK_COURT_FILTERS_STORAGE_KEY,
      JSON.stringify({ city, sport, date })
    );
  }, [city, sport, date]);

  useEffect(() => {
    sessionStorage.setItem(
      BOOK_COURT_RESULTS_STORAGE_KEY,
      JSON.stringify({ academies, hasSearched })
    );
  }, [academies, hasSearched]);

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

  useEffect(() => {
    if (prefills.city && prefills.sport && prefills.date && city && sport && date && !hasSearched) {
      void handleSearch();
    }
  }, [city, date, hasSearched, prefills.city, prefills.date, prefills.sport, sport]);

  useEffect(() => {
    if (!currentLocation || academies.length === 0) {
      setDistanceByAcademyId({});
      return;
    }

    const nextDistances: Record<string, number> = {};
    academies.forEach((academy) => {
      const coords = extractCoordinates(academy);
      if (!coords) {
        nextDistances[academy._id] = Number.POSITIVE_INFINITY;
        return;
      }
      nextDistances[academy._id] = haversineKm(currentLocation, coords);
    });

    setDistanceByAcademyId(nextDistances);
  }, [academies, currentLocation]);

  const sortedAcademies = useMemo(() => {
    const favoriteSet = new Set(favoriteAcademyIds);
    return [...academies].sort((a, b) => {
      const aFavorite = favoriteSet.has(a._id) ? 1 : 0;
      const bFavorite = favoriteSet.has(b._id) ? 1 : 0;
      if (aFavorite !== bFavorite) return bFavorite - aFavorite;

      const aDistance = distanceByAcademyId[a._id] ?? Number.POSITIVE_INFINITY;
      const bDistance = distanceByAcademyId[b._id] ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [academies, distanceByAcademyId, favoriteAcademyIds]);

  const handleToggleFavorite = async (academyId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: 'Login required',
        description: 'Please login to manage favorites.',
        variant: 'destructive',
      });
      return;
    }

    const currentlyFavorite = favoriteAcademyIds.includes(academyId);
    setFavoriteLoadingAcademyId(academyId);
    try {
      const response = await axios.post(
        `/api/user/venue/${academyId}/favorite`,
        { isFavorite: !currentlyFavorite },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const nextIsFavorite = Boolean(response.data?.isFavorite);
      setFavoriteAcademyIds((prev) => {
        if (nextIsFavorite) {
          return prev.includes(academyId) ? prev : [...prev, academyId];
        }
        return prev.filter((id) => id !== academyId);
      });
    } catch (error) {
      console.error('Failed to update favorite', error);
      toast({ title: 'Failed to update favorite', variant: 'destructive' });
    } finally {
      setFavoriteLoadingAcademyId(null);
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
      setRateContext(res.data.rateContext || null);
    } catch (err) {
      console.error(err);
      setCourts([]);
      setRateContext(null);
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
    setRateContext(null);
    setOpenSheetAcademyId(null);
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
    setRateContext(null);

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
            <p className="text-sm text-slate-500">{sortedAcademies.length} found</p>
          </div>

          {hasSearched && academies.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <p className="text-slate-500">No academies found for the selected filters.</p>
              </CardContent>
            </Card>
          )}

          {sortedAcademies.map((academy) => (
            <Card
              key={academy._id}
              className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => {
                if (sheetJustClosedRef.current) return;
                if (!academy?.shareCode) return;
                navigate(`/venue/${academy.shareCode}`, {
                  state: {
                    city,
                    sport,
                    date,
                  },
                });
              }}
            >
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
                      <a
                        href={getAcademyMapHref(academy)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-blue-700"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {capitalizeWords(academy.address || academy.city)}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className={`rounded-lg ${favoriteAcademyIds.includes(academy._id) ? 'border-rose-300 text-rose-600' : ''}`}
                      onClick={(event) => void handleToggleFavorite(academy._id, event)}
                      disabled={favoriteLoadingAcademyId === academy._id}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${favoriteAcademyIds.includes(academy._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </Button>

                    <Sheet
                      open={openSheetAcademyId === academy._id}
                      onOpenChange={(open) => {
                        if (!open) {
                          sheetJustClosedRef.current = true;
                          setOpenSheetAcademyId(null);
                          setTimeout(() => { sheetJustClosedRef.current = false; }, 300);
                        }
                      }}
                    >
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-lg"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenSheetAcademyId(academy._id);
                          handleOpenSheet(academy);
                        }}
                      >
                        Book Now
                      </Button>
                    </SheetTrigger>

                    <SheetContent side="right" className="w-[95vw] max-w-md p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                          {rateContext && (
                            <p className="text-xs text-slate-500 mb-3">
                              Applied rate: <span className="font-medium text-slate-700">{rateContext.rateType === "holiday" ? "Public Holiday" : capitalizeWords(rateContext.weekday || "weekday")}</span>
                              {rateContext.localDate ? ` (${rateContext.localDate})` : ""}
                            </p>
                          )}
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
                                  ₹{court.price}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BookCourt;

