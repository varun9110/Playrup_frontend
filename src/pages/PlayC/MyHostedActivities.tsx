import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MyHostedActivities() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Hosted Activities</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No hosted activities yet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}