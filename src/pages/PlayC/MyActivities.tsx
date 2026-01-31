import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function MyActivities() {
  const activities = [
    {
      id: 1,
      title: 'Friday Night Basketball',
      sport: 'Basketball',
      date: '2024-01-19',
      time: '7:00 PM',
      location: 'Downtown Sports Center',
      participants: 8,
      maxParticipants: 10,
      status: 'joined'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Activities</h1>
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{activity.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {activity.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {activity.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {activity.participants}/{activity.maxParticipants}
                      </span>
                    </div>
                  </div>
                  <Badge>{activity.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}