import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const bookingSchema = z.object({
  sport: z.string().min(1, 'Please select a sport'),
  court: z.string().min(1, 'Please select a court'),
  date: z.date({ required_error: 'Please select a date' }),
  startTime: z.string().min(1, 'Please select start time'),
  duration: z.string().min(1, 'Please select duration'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function BookCourt() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const selectedDate = watch('date');

  const onSubmit = async (data: BookingFormData) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Booking successful!",
        description: `Your ${data.sport} court has been booked for ${format(data.date, 'PPP')} at ${data.startTime}.`,
      });
    } catch (error) {
      toast({
        title: "Booking failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sports = ['Basketball', 'Tennis', 'Badminton', 'Volleyball', 'Football'];
  const courts = ['Court A', 'Court B', 'Court C', 'Court D'];
  const timeSlots = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
  ];
  const durations = ['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Book a Court</CardTitle>
            <CardDescription>
              Reserve your preferred court for your next game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Select onValueChange={(value) => setValue('sport', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sport" />
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
                  <Label htmlFor="court">Court</Label>
                  <Select onValueChange={(value) => setValue('court', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a court" />
                    </SelectTrigger>
                    <SelectContent>
                      {courts.map((court) => (
                        <SelectItem key={court} value={court}>
                          {court}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.court && (
                    <p className="text-sm text-destructive">{errors.court.message}</p>
                  )}
                </div>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Select onValueChange={(value) => setValue('startTime', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.startTime && (
                    <p className="text-sm text-destructive">{errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select onValueChange={(value) => setValue('duration', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map((duration) => (
                        <SelectItem key={duration} value={duration}>
                          {duration}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.duration && (
                    <p className="text-sm text-destructive">{errors.duration.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Booking...' : 'Book Court'}
                </Button>
                <Button type="button" variant="outline" className="flex-1">
                  Check Availability
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}