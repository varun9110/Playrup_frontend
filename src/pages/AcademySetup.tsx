import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Navbar } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Calendar,
  Clock,
  PlusCircle,
  Settings,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { capitalizeWords } from "@/lib/utils";

const sportsList = ["Badminton", "Tennis", "Table Tennis", "Squash", "Basketball", "Cricket"];
const normalizeSportKey = (sport) => String(sport || "").trim().toLowerCase();

const toDisplaySportName = (sport) => {
  const normalized = normalizeSportKey(sport);
  return sportsList.find((item) => normalizeSportKey(item) === normalized) || capitalizeWords(String(sport || ""));
};

export default function AcademySetup() {
  const navigate = useNavigate();
  const email = JSON.parse(localStorage.getItem("user"))?.email;
  const userId = JSON.parse(localStorage.getItem("user"))?.userId;
  const [selectedSports, setSelectedSports] = useState([]);
  const [sportsConfig, setSportsConfig] = useState({});
  const [activeSportTab, setActiveSportTab] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isSportSelected = (sport) =>
    selectedSports.some((selectedSport) => normalizeSportKey(selectedSport) === normalizeSportKey(sport));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const generateTimeSlots = (start, end) => {
    const slots = [];
    let [h] = start.split(":").map(Number);
    const [endH] = end.split(":").map(Number);
    while (h < endH) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      h++;
    }
    return slots;
  };

  // Fetch academy details on component mount
  useEffect(() => {
    const fetchAcademyDetails = async () => {
      try {
        const res = await axios.post("/api/academy/getDetails", {
          email,
          userId,
        });
        const data = res.data.academy;

        if (data && data.sports) {
          const sportsNames = [];
          const config = {};
          const seenSports = new Set();

          data.sports.forEach((sport) => {
            const displaySportName = toDisplaySportName(sport.sportName);
            const normalizedSportName = normalizeSportKey(displaySportName);
            if (seenSports.has(normalizedSportName)) return;

            seenSports.add(normalizedSportName);
            sportsNames.push(displaySportName);

            config[displaySportName] = {
              numberOfCourts: sport.numberOfCourts,
              startTime: sport.startTime,
              endTime: sport.endTime,
              pricing: sport.pricing,
            };
          });
          setSelectedSports(sportsNames);
          setSportsConfig(config);
        }
      } catch (error) {
        console.error("Error fetching academy details:", error);
      }
    };

    if (email) fetchAcademyDetails();
  }, []);

  const handleAddSport = (sport) => {
    if (!isSportSelected(sport)) {
      const displaySportName = toDisplaySportName(sport);
      setSelectedSports([...selectedSports, displaySportName]);
      if (!activeSportTab) {
        setActiveSportTab(displaySportName);
      }
      setSportsConfig({
        ...sportsConfig,
        [displaySportName]: {
          numberOfCourts: 1,
          startTime: "08:00",
          endTime: "20:00",
          pricing: [],
        },
      });
    }
  };

  const handleDeleteSport = (sport) => {
    const normalizedToDelete = normalizeSportKey(sport);
    setSelectedSports(selectedSports.filter((s) => normalizeSportKey(s) !== normalizedToDelete));

    const updatedConfig = { ...sportsConfig };
    Object.keys(updatedConfig).forEach((key) => {
      if (normalizeSportKey(key) === normalizedToDelete) {
        delete updatedConfig[key];
      }
    });

    setSportsConfig(updatedConfig);
  };

  useEffect(() => {
    if (!selectedSports.length) {
      if (activeSportTab) setActiveSportTab("");
      return;
    }

    const activeExists = selectedSports.some((sport) => sport === activeSportTab);
    if (!activeExists) {
      setActiveSportTab(selectedSports[0]);
    }
  }, [selectedSports, activeSportTab]);

  // Automatically regenerate pricing whenever start/end time or number of courts changes
  useEffect(() => {
    selectedSports.forEach((sport) => {
      const config = sportsConfig[sport];
      if (!config) return;

      const timeSlots = generateTimeSlots(config.startTime, config.endTime);
      const currentPricing = Array.isArray(config.pricing) ? config.pricing : [];

      const needsUpdate =
        !currentPricing.length ||
        currentPricing.length !== config.numberOfCourts ||
        (currentPricing[0]?.prices?.length || 0) !== timeSlots.length;

      if (needsUpdate) {
        // Preserve existing entered prices for the same court/time combinations.
        const existingSlotMap = new Map();
        currentPricing.forEach((court) => {
          const courtNumber = Number(court.courtNumber);
          (court.prices || []).forEach((slot) => {
            existingSlotMap.set(`${courtNumber}-${slot.time}`, {
              price: Number(slot.price) || 0,
              unavailable: Boolean(slot.unavailable),
            });
          });
        });

        const pricing = Array.from({ length: config.numberOfCourts }, (_, i) => ({
          courtNumber: i + 1,
          prices: timeSlots.map((time) => ({
            time,
            price: existingSlotMap.get(`${i + 1}-${time}`)?.price ?? 0,
            unavailable: existingSlotMap.get(`${i + 1}-${time}`)?.unavailable ?? false,
          })),
        }));

        setSportsConfig((prev) => ({
          ...prev,
          [sport]: { ...prev[sport], pricing },
        }));
      }
    });
  }, [selectedSports, sportsConfig]);

  const handlePriceChange = (sport, courtIdx, timeIdx, value) => {
    const updated = { ...sportsConfig };
    updated[sport].pricing[courtIdx].prices[timeIdx].price = Number(value);
    setSportsConfig(updated);
  };

  const handleUnavailableToggle = (sport, courtIdx, timeIdx) => {
    const updated = { ...sportsConfig };
    const slot = updated[sport].pricing[courtIdx].prices[timeIdx];
    slot.unavailable = !slot.unavailable;
    setSportsConfig(updated);
  };

  const handleSubmit = async () => {
    const sports = selectedSports.map((sport) => ({
      sportName: sport.toLowerCase(),
      numberOfCourts: sportsConfig[sport].numberOfCourts,
      startTime: sportsConfig[sport].startTime,
      endTime: sportsConfig[sport].endTime,
      pricing: sportsConfig[sport].pricing,
    }));

    try {
      setSaving(true);
      await axios.post("/api/academy/configure", {
        email,
        userId,
        sports,
      });
      toast({
        title: "Success",
        description: "Academy configuration saved.",
      });
    } catch (error) {
      console.error("Failed to save academy configuration", error);
      toast({
        title: "Save failed",
        description: "Could not save academy configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalCourts = useMemo(
    () => selectedSports.reduce((sum, sport) => sum + Number(sportsConfig[sport]?.numberOfCourts || 0), 0),
    [selectedSports, sportsConfig]
  );

  const totalPricingCells = useMemo(
    () => selectedSports.reduce((sum, sport) => {
      const pricing = sportsConfig[sport]?.pricing || [];
      return sum + pricing.reduce((inner, court) => inner + (court.prices?.length || 0), 0);
    }, 0),
    [selectedSports, sportsConfig]
  );

  const configuredSportsCount = useMemo(
    () => selectedSports.filter((sport) => {
      const cfg = sportsConfig[sport];
      return cfg && cfg.startTime && cfg.endTime && Number(cfg.numberOfCourts) > 0;
    }).length,
    [selectedSports, sportsConfig]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar onLogout={handleLogout} />

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-12 max-w-[96vw] 2xl:max-w-[1700px]">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
                Academy Setup
              </h1>
              <p className="text-slate-500 text-lg">
                Configure sports, court counts, operating windows and hourly pricing.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <Link to="/academy-dashboard">
                  <Building2 className="h-4 w-4 mr-2" />
                  Academy Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Selected Sports</p>
                <p className="text-2xl font-bold text-slate-800">{selectedSports.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-slate-100">
                <Settings className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Configured</p>
                <p className="text-2xl font-bold text-slate-800">{configuredSportsCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-emerald-100">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Courts</p>
                <p className="text-2xl font-bold text-slate-800">{totalCourts}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-amber-100">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Price Slots</p>
                <p className="text-2xl font-bold text-slate-800">{totalPricingCells}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-0">
              <div className="p-6 space-y-5 mt-0">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <h3 className="font-semibold text-slate-800">Add Sports</h3>
                    <p className="text-xs text-slate-500">Choose sports to configure for your academy</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sportsList.map((s) => (
                      <Button
                        key={s}
                        variant={isSportSelected(s) ? "secondary" : "outline"}
                        onClick={() => handleAddSport(s)}
                        disabled={isSportSelected(s)}
                        className="h-9"
                      >
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedSports.length === 0 ? (
                  <Card className="border-slate-200">
                    <CardContent className="p-10 text-center text-slate-500">
                      No sports selected yet. Add a sport to start configuring courts and pricing.
                    </CardContent>
                  </Card>
                ) : (
                  <Tabs value={activeSportTab} onValueChange={setActiveSportTab}>
                    <TabsList className="w-full justify-start flex-wrap h-auto bg-slate-100 p-1 gap-1">
                      {selectedSports.map((sport) => (
                        <TabsTrigger
                          key={sport}
                          value={sport}
                          className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
                        >
                          {capitalizeWords(sport)}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {selectedSports.map((sport) => {
                      const config = sportsConfig[sport];
                      if (!config) return null;
                      const timeSlots = generateTimeSlots(config.startTime, config.endTime);

                      return (
                        <TabsContent key={sport} value={sport} className="mt-4">
                          <Card className="border-slate-200 overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b flex flex-row items-center justify-between">
                              <div>
                                <CardTitle>{capitalizeWords(sport)}</CardTitle>
                                <CardDescription className="mt-1">Configure courts, operating hours and time-slot pricing</CardDescription>
                              </div>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteSport(sport)}>
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <Label>Number of Courts</Label>
                                  <Input
                                    type="number"
                                    value={config.numberOfCourts}
                                    onChange={(e) =>
                                      setSportsConfig({
                                        ...sportsConfig,
                                        [sport]: { ...config, numberOfCourts: +e.target.value },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Start Time</Label>
                                  <Input
                                    type="time"
                                    value={config.startTime}
                                    onChange={(e) =>
                                      setSportsConfig({
                                        ...sportsConfig,
                                        [sport]: { ...config, startTime: e.target.value },
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>End Time</Label>
                                  <Input
                                    type="time"
                                    value={config.endTime}
                                    onChange={(e) =>
                                      setSportsConfig({
                                        ...sportsConfig,
                                        [sport]: { ...config, endTime: e.target.value },
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              {config.pricing.length > 0 && (
                                <div className="rounded-md border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Court</TableHead>
                                        {timeSlots.map((time) => (
                                          <TableHead key={time} className="text-[11px] px-2 py-2 whitespace-nowrap">{time}</TableHead>
                                        ))}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {config.pricing.map((court, courtIdx) => (
                                        <TableRow key={court.courtNumber}>
                                          <TableCell className="font-semibold whitespace-nowrap px-2 py-2">
                                            Court {court.courtNumber}
                                          </TableCell>
                                          {court.prices.map((slot, timeIdx) => (
                                            <TableCell key={timeIdx} className="px-2 py-2">
                                              <div className="space-y-1">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  disabled={Boolean(slot.unavailable)}
                                                  value={slot.price}
                                                  className={`h-8 text-xs ${slot.unavailable ? "bg-slate-100 text-slate-400" : ""}`}
                                                  onChange={(e) =>
                                                    handlePriceChange(sport, courtIdx, timeIdx, e.target.value)
                                                  }
                                                />
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant={slot.unavailable ? "destructive" : "outline"}
                                                  className="h-7 w-full text-[10px] px-1"
                                                  onClick={() => handleUnavailableToggle(sport, courtIdx, timeIdx)}
                                                >
                                                  {slot.unavailable ? "Unavailable" : "Available"}
                                                </Button>
                                              </div>
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Setup Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedSports.length ? (
                        selectedSports.map((sport) => (
                          <div key={sport} className="flex items-center justify-between rounded-md border p-3">
                            <span className="font-medium text-slate-800">{capitalizeWords(sport)}</span>
                            <Badge variant="outline">{sportsConfig[sport]?.numberOfCourts || 0} courts</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No sports configured yet.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Setup Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                      <p>1. Select a sport before configuring courts and pricing.</p>
                      <p>2. Pricing grid updates automatically based on start/end time and number of courts.</p>
                      <p>3. Mark slots unavailable where bookings should be blocked.</p>
                      <p>4. Use Submit Academy Details to save all selected sport configurations.</p>
                    </CardContent>
                  </Card>
                </div>

                {selectedSports.length > 0 && (
                  <Button className="w-full h-11" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Saving...' : 'Submit Academy Details'}
                  </Button>
                )}
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

