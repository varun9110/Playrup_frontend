import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Navbar } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Calendar,
  Clock,
  Copy,
  PlusCircle,
  Settings,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { capitalizeWords } from "@/lib/utils";

const sportsList = ["Badminton", "Tennis", "Table Tennis", "Squash", "Basketball", "Cricket"];
const weekdayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type WeekdayKey = typeof weekdayKeys[number];

type RateSlot = {
  time: string;
  price: number;
  unavailable: boolean;
};

type CourtRates = {
  courtNumber: number;
  rates: RateSlot[];
};

type WeeklyRate = {
  weekday: WeekdayKey;
  courts: CourtRates[];
};

type SportRatePlan = {
  publicHolidayDates: string[];
  weeklyRates: WeeklyRate[];
  holidayRates: CourtRates[];
};

type SportConfig = {
  numberOfCourts: number;
  startTime: string;
  endTime: string;
  ratePlan: SportRatePlan;
};

type ActiveRateTab = WeekdayKey | "holiday";

const normalizeSportKey = (sport: string) => String(sport || "").trim().toLowerCase();
const toDisplaySportName = (sport: string) => {
  const normalized = normalizeSportKey(sport);
  return sportsList.find((item) => normalizeSportKey(item) === normalized) || capitalizeWords(String(sport || ""));
};

const generateTimeSlots = (start: string, end: string) => {
  const slots: string[] = [];
  let [h] = start.split(":").map(Number);
  const [endH] = end.split(":").map(Number);
  while (h < endH) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    h++;
  }
  return slots;
};

const toSlotMap = (courts: CourtRates[]) => {
  const map = new Map<string, { price: number; unavailable: boolean }>();
  courts.forEach((court) => {
    (court.rates || []).forEach((slot) => {
      map.set(`${Number(court.courtNumber)}-${slot.time}`, {
        price: Number(slot.price) || 0,
        unavailable: Boolean(slot.unavailable),
      });
    });
  });
  return map;
};

const rebuildCourtRates = (numberOfCourts: number, timeSlots: string[], existingCourts: CourtRates[] = []): CourtRates[] => {
  const existingSlotMap = toSlotMap(existingCourts);
  return Array.from({ length: numberOfCourts }, (_, idx) => ({
    courtNumber: idx + 1,
    rates: timeSlots.map((time) => ({
      time,
      price: existingSlotMap.get(`${idx + 1}-${time}`)?.price ?? 0,
      unavailable: existingSlotMap.get(`${idx + 1}-${time}`)?.unavailable ?? false,
    })),
  }));
};

const normalizeRatePlan = (plan: any, numberOfCourts: number, startTime: string, endTime: string): SportRatePlan => {
  const timeSlots = generateTimeSlots(startTime, endTime);
  const incomingWeekly = Array.isArray(plan?.weeklyRates) ? plan.weeklyRates : [];
  const holidayDates: string[] = Array.isArray(plan?.publicHolidayDates)
    ? Array.from(
      new Set<string>(
        plan.publicHolidayDates
          .map((date: unknown) => String(date || ""))
          .filter((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      )
    ).sort()
    : [];

  const weeklyRates: WeeklyRate[] = weekdayKeys.map((weekday) => {
    const existing = incomingWeekly.find((entry: any) => String(entry?.weekday || "").toLowerCase() === weekday);
    return {
      weekday,
      courts: rebuildCourtRates(numberOfCourts, timeSlots, existing?.courts || []),
    };
  });

  return {
    publicHolidayDates: holidayDates,
    weeklyRates,
    holidayRates: rebuildCourtRates(numberOfCourts, timeSlots, plan?.holidayRates || []),
  };
};

export default function AcademySetup() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      return {};
    }
  }, []);

  const userId = storedUser?.userId;
  const [academies, setAcademies] = useState<any[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportsConfig, setSportsConfig] = useState<Record<string, SportConfig>>({});
  const [activeSportTab, setActiveSportTab] = useState("");
  const [activeRateTabBySport, setActiveRateTabBySport] = useState<Record<string, ActiveRateTab>>({});
  const [copyTargetDayBySport, setCopyTargetDayBySport] = useState<Record<string, WeekdayKey>>({});
  const [timezone, setTimezone] = useState("");
  const [holidayDateInputBySport, setHolidayDateInputBySport] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isSportSelected = (sport: string) =>
    selectedSports.some((selectedSport) => normalizeSportKey(selectedSport) === normalizeSportKey(sport));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (!timezone && browserTz) {
      setTimezone(browserTz);
    }
  }, [timezone]);

  useEffect(() => {
    const fetchOwnerAcademies = async () => {
      try {
        const res = await axios.post("/api/academy/user-academies", { userId });
        const academyList = res.data?.data || [];
        setAcademies(academyList);
        setSelectedAcademyId((prev) => {
          if (!academyList.length) return "";
          if (prev && academyList.some((academy: any) => String(academy._id) === prev)) {
            return prev;
          }
          return String(academyList[0]._id);
        });
      } catch (error) {
        console.error("Error fetching owner academies:", error);
      }
    };

    if (userId) {
      void fetchOwnerAcademies();
    }
  }, [userId]);

  useEffect(() => {
    const fetchAcademyDetails = async () => {
      try {
        const res = await axios.post("/api/academy/getDetails", {
          academyId: selectedAcademyId,
        });
        const data = res.data?.academy;
        const sportsNames: string[] = [];
        const config: Record<string, SportConfig> = {};
        const seenSports = new Set<string>();

        (data?.sports || []).forEach((sport: any) => {
          const displaySportName = toDisplaySportName(sport.sportName);
          const normalizedSportName = normalizeSportKey(displaySportName);
          if (seenSports.has(normalizedSportName)) return;

          seenSports.add(normalizedSportName);
          sportsNames.push(displaySportName);

          const numberOfCourts = Number(sport.numberOfCourts) || 1;
          const startTime = sport.startTime || "08:00";
          const endTime = sport.endTime || "20:00";

          config[displaySportName] = {
            numberOfCourts,
            startTime,
            endTime,
            ratePlan: normalizeRatePlan(sport.ratePlan, numberOfCourts, startTime, endTime),
          };
        });

        setSelectedSports(sportsNames);
        setSportsConfig(config);
        setActiveSportTab(sportsNames[0] || "");
        setActiveRateTabBySport((prev) => {
          const next = { ...prev };
          sportsNames.forEach((sport) => {
            if (!next[sport]) next[sport] = "monday";
          });
          return next;
        });
        setTimezone(data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "");
      } catch (error) {
        console.error("Error fetching academy details:", error);
        setSelectedSports([]);
        setSportsConfig({});
        setActiveSportTab("");
      }
    };

    if (selectedAcademyId) {
      void fetchAcademyDetails();
    }
  }, [selectedAcademyId]);

  useEffect(() => {
    setSportsConfig((prev) => {
      const next: Record<string, SportConfig> = { ...prev };
      let changed = false;

      selectedSports.forEach((sport) => {
        const config = next[sport];
        if (!config) return;

        const normalized = normalizeRatePlan(config.ratePlan, Number(config.numberOfCourts) || 1, config.startTime, config.endTime);

        const before = JSON.stringify(config.ratePlan);
        const after = JSON.stringify(normalized);
        if (before !== after) {
          next[sport] = { ...config, ratePlan: normalized };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [selectedSports, sportsConfig]);

  const handleAddSport = (sport: string) => {
    if (isSportSelected(sport)) return;

    const displaySportName = toDisplaySportName(sport);
    const numberOfCourts = 1;
    const startTime = "08:00";
    const endTime = "20:00";

    setSelectedSports((prev) => [...prev, displaySportName]);
    setSportsConfig((prev) => ({
      ...prev,
      [displaySportName]: {
        numberOfCourts,
        startTime,
        endTime,
        ratePlan: normalizeRatePlan({}, numberOfCourts, startTime, endTime),
      },
    }));
    setActiveRateTabBySport((prev) => ({ ...prev, [displaySportName]: "monday" }));
    if (!activeSportTab) {
      setActiveSportTab(displaySportName);
    }
  };

  const handleDeleteSport = (sport: string) => {
    const normalizedToDelete = normalizeSportKey(sport);
    setSelectedSports((prev) => prev.filter((s) => normalizeSportKey(s) !== normalizedToDelete));

    setSportsConfig((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (normalizeSportKey(key) === normalizedToDelete) {
          delete next[key];
        }
      });
      return next;
    });

    setActiveRateTabBySport((prev) => {
      const next = { ...prev };
      delete next[sport];
      return next;
    });
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

  const updateSportConfig = (sport: string, nextConfig: SportConfig) => {
    setSportsConfig((prev) => ({
      ...prev,
      [sport]: {
        ...nextConfig,
        ratePlan: normalizeRatePlan(nextConfig.ratePlan, Number(nextConfig.numberOfCourts) || 1, nextConfig.startTime, nextConfig.endTime),
      },
    }));
  };

  const getCurrentCourtsForTab = (sport: string, tab: ActiveRateTab) => {
    const config = sportsConfig[sport];
    if (!config) return [];
    if (tab === "holiday") {
      return config.ratePlan.holidayRates;
    }
    return config.ratePlan.weeklyRates.find((entry) => entry.weekday === tab)?.courts || [];
  };

  const handleRateChange = (sport: string, tab: ActiveRateTab, courtIdx: number, timeIdx: number, value: string) => {
    const config = sportsConfig[sport];
    if (!config) return;

    const nextConfig = structuredClone(config) as SportConfig;
    if (tab === "holiday") {
      nextConfig.ratePlan.holidayRates[courtIdx].rates[timeIdx].price = Number(value);
    } else {
      const targetDay = nextConfig.ratePlan.weeklyRates.find((entry) => entry.weekday === tab);
      if (!targetDay) return;
      targetDay.courts[courtIdx].rates[timeIdx].price = Number(value);
    }

    updateSportConfig(sport, nextConfig);
  };

  const handleUnavailableToggle = (sport: string, tab: ActiveRateTab, courtIdx: number, timeIdx: number) => {
    const config = sportsConfig[sport];
    if (!config) return;

    const nextConfig = structuredClone(config) as SportConfig;
    const slot = tab === "holiday"
      ? nextConfig.ratePlan.holidayRates[courtIdx].rates[timeIdx]
      : nextConfig.ratePlan.weeklyRates.find((entry) => entry.weekday === tab)?.courts[courtIdx].rates[timeIdx];

    if (!slot) return;
    slot.unavailable = !slot.unavailable;
    updateSportConfig(sport, nextConfig);
  };

  const addHolidayDate = (sport: string) => {
    const nextDate = holidayDateInputBySport[sport];
    if (!nextDate) return;

    const config = sportsConfig[sport];
    if (!config) return;

    const merged = Array.from(new Set([...(config.ratePlan.publicHolidayDates || []), nextDate])).sort();
    updateSportConfig(sport, {
      ...config,
      ratePlan: {
        ...config.ratePlan,
        publicHolidayDates: merged,
      },
    });
    setHolidayDateInputBySport((prev) => ({ ...prev, [sport]: "" }));
  };

  const removeHolidayDate = (sport: string, dateToRemove: string) => {
    const config = sportsConfig[sport];
    if (!config) return;

    updateSportConfig(sport, {
      ...config,
      ratePlan: {
        ...config.ratePlan,
        publicHolidayDates: config.ratePlan.publicHolidayDates.filter((date) => date !== dateToRemove),
      },
    });
  };

  const handleCopyDayRates = (sport: string, fromDay: WeekdayKey, toDay: WeekdayKey) => {
    if (fromDay === toDay) {
      toast({
        title: "Invalid copy target",
        description: "Source and target day must be different.",
        variant: "destructive",
      });
      return;
    }

    const config = sportsConfig[sport];
    if (!config) return;

    const nextConfig = structuredClone(config) as SportConfig;
    const sourceDay = nextConfig.ratePlan.weeklyRates.find((entry) => entry.weekday === fromDay);
    const targetDay = nextConfig.ratePlan.weeklyRates.find((entry) => entry.weekday === toDay);
    if (!sourceDay || !targetDay) return;

    targetDay.courts = sourceDay.courts.map((court) => ({
      courtNumber: court.courtNumber,
      rates: court.rates.map((slot) => ({ ...slot })),
    }));

    updateSportConfig(sport, nextConfig);
    toast({
      title: "Rates copied",
      description: `${capitalizeWords(fromDay)} rates copied to ${capitalizeWords(toDay)}.`,
    });
  };

  const handleSubmit = async () => {
    if (!timezone.trim()) {
      toast({
        title: "Timezone required",
        description: "Please set academy timezone before saving rates.",
        variant: "destructive",
      });
      return;
    }

    const sports = selectedSports.map((sport) => ({
      sportName: sport.toLowerCase(),
      numberOfCourts: Number(sportsConfig[sport].numberOfCourts),
      startTime: sportsConfig[sport].startTime,
      endTime: sportsConfig[sport].endTime,
      ratePlan: sportsConfig[sport].ratePlan,
    }));

    try {
      setSaving(true);
      await axios.post("/api/academy/configure", {
        academyId: selectedAcademyId,
        timezone: timezone.trim(),
        sports,
      });
      toast({
        title: "Success",
        description: "Academy rates configured successfully.",
      });
    } catch (error: any) {
      console.error("Failed to save academy configuration", error);
      toast({
        title: "Save failed",
        description: error?.response?.data?.message || "Could not save academy configuration.",
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
      const config = sportsConfig[sport];
      if (!config) return sum;

      const weekdayCells = config.ratePlan.weeklyRates.reduce(
        (inner, day) => inner + day.courts.reduce((courtSum, court) => courtSum + (court.rates?.length || 0), 0),
        0
      );
      const holidayCells = config.ratePlan.holidayRates.reduce((inner, court) => inner + (court.rates?.length || 0), 0);
      return sum + weekdayCells + holidayCells;
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
                Configure day-wise and holiday-wise court rates using academy local timezone.
              </p>
            </div>
          </div>

          {academies.length > 0 && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Select Academy</p>
                <Tabs value={selectedAcademyId} onValueChange={setSelectedAcademyId}>
                  <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100 p-1">
                    {academies.map((academy) => (
                      <TabsTrigger key={academy._id} value={academy._id}>
                        {capitalizeWords(academy.name)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="max-w-md">
                <Label>Academy Timezone (IANA)</Label>
                <Input
                  placeholder="Asia/Kolkata"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">Weekday and holiday rates are applied in this timezone.</p>
              </div>
            </div>
          )}
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
                <p className="text-xs text-slate-500">Rate Slots</p>
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
                  <p className="text-xs text-slate-500">Choose sports to configure weekday and holiday rates</p>
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
                    No sports selected yet. Add a sport to start configuring rates.
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
                    const activeRateTab = activeRateTabBySport[sport] || "monday";
                    const activeWeekday = activeRateTab === "holiday" ? null : (activeRateTab as WeekdayKey);
                    const copyCandidates = weekdayKeys.filter((day) => day !== activeWeekday);
                    const fallbackCopyTarget = copyCandidates[0] || "monday";
                    const copyTargetDay =
                      (copyTargetDayBySport[sport] && copyCandidates.includes(copyTargetDayBySport[sport]))
                        ? copyTargetDayBySport[sport]
                        : fallbackCopyTarget;
                    const currentCourts = getCurrentCourtsForTab(sport, activeRateTab);

                    return (
                      <TabsContent key={sport} value={sport} className="mt-4">
                        <Card className="border-slate-200 overflow-hidden">
                          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>{capitalizeWords(sport)}</CardTitle>
                              <CardDescription className="mt-1">Configure all 7 weekdays and public holiday rates</CardDescription>
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
                                  min={1}
                                  value={config.numberOfCourts}
                                  onChange={(e) =>
                                    updateSportConfig(sport, {
                                      ...config,
                                      numberOfCourts: Math.max(1, Number(e.target.value) || 1),
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Start Time</Label>
                                <Input
                                  type="time"
                                  value={config.startTime}
                                  onChange={(e) => updateSportConfig(sport, { ...config, startTime: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>End Time</Label>
                                <Input
                                  type="time"
                                  value={config.endTime}
                                  onChange={(e) => updateSportConfig(sport, { ...config, endTime: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                              <Label className="font-semibold">Public Holiday Dates</Label>
                              <div className="flex flex-wrap gap-2">
                                <Input
                                  type="date"
                                  className="max-w-[220px]"
                                  value={holidayDateInputBySport[sport] || ""}
                                  onChange={(e) => setHolidayDateInputBySport((prev) => ({ ...prev, [sport]: e.target.value }))}
                                />
                                <Button type="button" variant="outline" onClick={() => addHolidayDate(sport)}>
                                  Add Holiday
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(config.ratePlan.publicHolidayDates || []).map((holidayDate) => (
                                  <Badge key={holidayDate} className="gap-2 pr-1" variant="outline">
                                    {holidayDate}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-5 px-1"
                                      onClick={() => removeHolidayDate(sport, holidayDate)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </Badge>
                                ))}
                                {config.ratePlan.publicHolidayDates.length === 0 && (
                                  <p className="text-xs text-slate-500">No holiday dates added.</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                              <Tabs value={activeRateTab} onValueChange={(value) => setActiveRateTabBySport((prev) => ({ ...prev, [sport]: value as ActiveRateTab }))}>
                                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100 p-1">
                                  {weekdayKeys.map((weekday) => (
                                    <TabsTrigger key={weekday} value={weekday}>
                                      {capitalizeWords(weekday)}
                                    </TabsTrigger>
                                  ))}
                                  <TabsTrigger value="holiday">Public Holiday</TabsTrigger>
                                </TabsList>
                              </Tabs>

                              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                <Label className="text-xs text-slate-600">Copy to</Label>
                                <Select
                                  value={copyTargetDay}
                                  onValueChange={(value) => setCopyTargetDayBySport((prev) => ({ ...prev, [sport]: value as WeekdayKey }))}
                                  disabled={!activeWeekday}
                                >
                                  <SelectTrigger className="w-[170px]">
                                    <SelectValue placeholder="Select day" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {copyCandidates.map((day) => (
                                      <SelectItem key={day} value={day}>
                                        {capitalizeWords(day)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9"
                                  disabled={!activeWeekday}
                                  onClick={() => {
                                    if (!activeWeekday) return;
                                    handleCopyDayRates(sport, activeWeekday, copyTargetDay);
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Day Rates
                                </Button>
                              </div>
                            </div>

                            {currentCourts.length > 0 && (
                              <div className="rounded-md border overflow-auto">
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
                                    {currentCourts.map((court, courtIdx) => (
                                      <TableRow key={court.courtNumber}>
                                        <TableCell className="font-semibold whitespace-nowrap px-2 py-2">
                                          Court {court.courtNumber}
                                        </TableCell>
                                        {court.rates.map((slot, timeIdx) => (
                                          <TableCell key={`${court.courtNumber}-${slot.time}`} className="px-2 py-2">
                                            <div className="space-y-1">
                                              <Input
                                                type="number"
                                                min={0}
                                                disabled={Boolean(slot.unavailable)}
                                                value={slot.price}
                                                className={`h-8 text-xs ${slot.unavailable ? "bg-slate-100 text-slate-400" : ""}`}
                                                onChange={(e) => handleRateChange(sport, activeRateTab, courtIdx, timeIdx, e.target.value)}
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant={slot.unavailable ? "destructive" : "outline"}
                                                className="h-7 w-full text-[10px] px-1"
                                                onClick={() => handleUnavailableToggle(sport, activeRateTab, courtIdx, timeIdx)}
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
                    <p>1. Configure rates individually for all 7 weekdays and public holidays.</p>
                    <p>2. Add exact public holiday dates in YYYY-MM-DD for this sport.</p>
                    <p>3. Holiday rate always overrides weekday rate on matching dates.</p>
                    <p>4. Academy timezone is mandatory for correct day/date based pricing.</p>
                  </CardContent>
                </Card>
              </div>

              {selectedSports.length > 0 && selectedAcademyId && (
                <Button className="w-full h-11" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving..." : "Submit Academy Details"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
