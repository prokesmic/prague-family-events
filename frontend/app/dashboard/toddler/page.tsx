/**
 * Toddler Calendar View (1.5 years old)
 */

'use client';

import { useState, useEffect } from 'react';
import { EventCard } from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { eventAPI } from '@/lib/api';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ToddlerCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventAPI.getEvents({
        view: 'toddler',
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
              🧸 Toddler Calendar
              <span className="text-pink-600">(1.5 years)</span>
            </h1>
            <p className="text-muted-foreground">
              Events perfect for your little one
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-pink-50 border-pink-200">
        <CardHeader>
          <CardTitle className="text-lg">What to Expect</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            <li>• Soft play areas, puppet shows, baby concerts</li>
            <li>• Short duration (30-60 minutes)</li>
            <li>• Morning times preferred (9-11 AM)</li>
            <li>• Indoor activities prioritized</li>
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
              view="toddler"
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
              There are no toddler events available at the moment.
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
