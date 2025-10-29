/**
 * Child Calendar View (9 years old)
 */

'use client';

import { useState, useEffect } from 'react';
import { EventCard } from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { eventAPI } from '@/lib/api';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ChildCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventAPI.getEvents({
        view: 'child',
        limit: 50
      });
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              👦 Child Calendar
              <span className="text-blue-600">(9 years)</span>
            </h1>
            <p className="text-muted-foreground">
              Educational and interactive activities
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">What to Expect</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            <li>• Museums, science centers, sports, workshops</li>
            <li>• Duration: 1-3 hours</li>
            <li>• Afternoon times preferred (2-5 PM)</li>
            <li>• Mix of indoor and outdoor activities</li>
            <li>• Maximum 4 events per day (highest scored)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              view="child"
              onClick={() => (window.location.href = `/events/${event.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              There are no child events available at the moment.
            </p>
            <p className="text-sm text-muted-foreground">
              The scraper runs daily at 3:00 AM to find new events.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
