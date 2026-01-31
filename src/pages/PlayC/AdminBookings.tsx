import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminBookings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Admin Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Admin booking management</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}