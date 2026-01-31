import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users, Search } from 'lucide-react';

export default function AllActivities() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');

  const activities = [
    {
      id: 1,
      title: 'Friday Night Basketball',
      sport: 'Basketball',
      description: 'Weekly basketball game for intermediate players',
      host: 'Mike Johnson',
      participants: 8,
      maxParticipants: 10,
      date: '2024-01-19',
      time: '7:00 PM',
      location: 'Downtown Sports Center',
      skillLevel: 'Intermediate',
      price: '$5',
      tags: ['Weekly', 'Competitive']
    },
    {
      id: 2,
      title: 'Weekend Tennis Tournament',
      sport: 'Tennis',
      description: 'Singles tournament for advanced players',
      host: 'Sarah Williams',
      participants: 12,
      maxParticipants: 16,
      date: '2024-01-20',
      time: '9:00 AM',
      location: 'Riverside Tennis Club',
      skillLevel: 'Advanced',
      price: '$15',
      tags: ['Tournament', 'Prize Money']
    },
    {
      id: 3,
      title: 'Beginner Badminton Group',
      sport: 'Badminton',
      description: 'Learn badminton basics in a friendly environment',
      host: 'Alex Chen',
      participants: 6,
      maxParticipants: 12,
      date: '2024-01-21',
      time: '11:00 AM',
      location: 'City Sports Complex',
      skillLevel: 'Beginner',
      price: 'Free',
      tags: ['Learning', 'Friendly']
    }
  ];

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = selectedSport === 'all' || activity.sport === selectedSport;
    return matchesSearch && matchesSport;
  });

  const sports = ['Basketball', 'Tennis', 'Badminton', 'Volleyball', 'Football'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Browse Activities</h1>
          <p className="text-muted-foreground">Find and join sports activities in your area</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  {sports.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{activity.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Hosted by {activity.host}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{activity.sport}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{activity.date}</span>
                    <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                    <span>{activity.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{activity.participants}/{activity.maxParticipants} participants</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {activity.skillLevel}
                  </Badge>
                  {activity.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold text-primary">
                    {activity.price}
                  </span>
                  <Button size="sm">
                    Join Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                No activities found matching your criteria
              </p>
              <Button>Host Your Own Activity</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}