import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const sportsList = ["Badminton", "Tennis", "Table Tennis", "Squash", "Basketball", "Cricket"];

export default function AcademySetup() {
  const email = JSON.parse(localStorage.getItem("user"))?.email;
  const userId = JSON.parse(localStorage.getItem("user"))?.userId;
  const [selectedSports, setSelectedSports] = useState([]);
  const [sportsConfig, setSportsConfig] = useState({});
  const { toast } = useToast();

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
        const res = await axios.post("http://localhost:5000/api/academy/getDetails", {
          email,
          userId,
        });
        const data = res.data.academy;

        if (data && data.sports) {
          const sportsNames = data.sports.map((s) => s.sportName);
          const config = {};
          data.sports.forEach((sport) => {
            config[sport.sportName] = {
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
  }, [email]);

  const handleAddSport = (sport) => {
    if (!selectedSports.includes(sport)) {
      setSelectedSports([...selectedSports, sport]);
      setSportsConfig({
        ...sportsConfig,
        [sport]: {
          numberOfCourts: 1,
          startTime: "08:00",
          endTime: "20:00",
          pricing: [],
        },
      });
    }
  };

  const handleDeleteSport = (sport) => {
    setSelectedSports(selectedSports.filter((s) => s !== sport));
    const updatedConfig = { ...sportsConfig };
    delete updatedConfig[sport];
    setSportsConfig(updatedConfig);
  };

  // Automatically regenerate pricing whenever start/end time or number of courts changes
  useEffect(() => {
    selectedSports.forEach((sport) => {
      const config = sportsConfig[sport];
      if (!config) return;

      const timeSlots = generateTimeSlots(config.startTime, config.endTime);

      const needsUpdate =
        !config.pricing.length ||
        config.pricing.length !== config.numberOfCourts ||
        config.pricing[0].prices.length !== timeSlots.length;

      if (needsUpdate) {
        const pricing = Array.from({ length: config.numberOfCourts }, (_, i) => ({
          courtNumber: i + 1,
          prices: timeSlots.map((time) => ({ time, price: 0 })),
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

  const handleSubmit = async () => {
    const sports = selectedSports.map((sport) => ({
      sportName: sport.toLowerCase(),
      numberOfCourts: sportsConfig[sport].numberOfCourts,
      startTime: sportsConfig[sport].startTime,
      endTime: sportsConfig[sport].endTime,
      pricing: sportsConfig[sport].pricing,
    }));

    await axios.post("http://localhost:5000/api/academy/configure", {
      email,
      userId,
      sports,
    });
    toast({
      title: "Success",
      description: "Academy configuration saved.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Academy Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              {sportsList.map((s) => (
                <Button
                  key={s}
                  variant={selectedSports.includes(s) ? "secondary" : "default"}
                  onClick={() => handleAddSport(s)}
                  disabled={selectedSports.includes(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedSports.map((sport) => {
        const config = sportsConfig[sport];
        if (!config) return null;
        const timeSlots = generateTimeSlots(config.startTime, config.endTime);

        return (
          <Card key={sport}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{sport}</CardTitle>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteSport(sport)}>
                Delete
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Court</TableHead>
                      {timeSlots.map((time) => (
                        <TableHead key={time}>{time}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.pricing.map((court, courtIdx) => (
                      <TableRow key={court.courtNumber}>
                        <TableCell className="font-semibold">
                          Court {court.courtNumber}
                        </TableCell>
                        {court.prices.map((slot, timeIdx) => (
                          <TableCell key={timeIdx}>
                            <Input
                              type="number"
                              value={slot.price}
                              onChange={(e) =>
                                handlePriceChange(sport, courtIdx, timeIdx, e.target.value)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}

      {selectedSports.length > 0 && (
        <Button className="w-full" onClick={handleSubmit}>
          Submit Academy Details
        </Button>
      )}
    </div>
  );
}
