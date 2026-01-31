import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const activitySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  sport: z.string().min(1, 'Please select a sport'),
  skillLevel: z.string().min(1, 'Please select skill level'),
  date: z.date({ required_error: 'Please select a date' }),
  time: z.string().min(1, 'Please select time'),
  location: z.string().min(5, 'Location must be at least 5 characters'),
  maxParticipants: z.string().min(1, 'Please set maximum participants'),
  price: z.string().min(1, 'Please set price (enter 0 for free)'),
});

type ActivityFormData = z.infer<typeof activitySchema>;

export default function HostActivity() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
  });

  const selectedDate = watch('date');

  const onSubmit = async (data: ActivityFormData) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Activity created successfully!",
        description: `Your ${data.sport} activity "${data.title}" has been posted.`,
      });
    } catch (error) {
      toast({
        title: "Failed to create activity",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sports = ['Basketball', 'Tennis', 'Badminton', 'Volleyball', 'Football', 'Cricket'];
  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
  const timeSlots = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Host an Activity</CardTitle>
            <CardDescription>
              Create a new sports activity and invite others to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Activity Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Friday Night Basketball"
                  {...register('title')}
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your activity, skill level requirements, what to bring, etc."
                  rows={4}
                  {...register('description')}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Select onValueChange={(value) => setValue('sport', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {sports.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sport && (
                    <p className="text-sm text-destructive">{errors.sport.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skillLevel">Skill Level</Label>
                  <Select onValueChange={(value) => setValue('skillLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.skillLevel && (
                    <p className="text-sm text-destructive">{errors.skillLevel.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setValue('date', date as Date)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && (
                    <p className="text-sm text-destructive">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Select onValueChange={(value) => setValue('time', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.time && (
                    <p className="text-sm text-destructive">{errors.time.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Downtown Sports Center, Court A"
                  {...register('location')}
                  className={errors.location ? 'border-destructive' : ''}
                />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="2"
                    max="50"
                    placeholder="e.g., 10"
                    {...register('maxParticipants')}
                    className={errors.maxParticipants ? 'border-destructive' : ''}
                  />
                  {errors.maxParticipants && (
                    <p className="text-sm text-destructive">{errors.maxParticipants.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price per Person ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 5.00 (or 0 for free)"
                    {...register('price')}
                    className={errors.price ? 'border-destructive' : ''}
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Activity...' : 'Create Activity'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}