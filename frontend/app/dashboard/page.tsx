/**
 * Main Dashboard Page
 * Shows calendar view selector and event overview
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EventCard } from '@/components/event-card';
import { eventAPI, statsAPI } from '@/lib/api';
import { Baby, User, Users, Calendar, Map, Settings } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [statsData, eventsData] = await Promise.all([
        statsAPI.getStats(),
        eventAPI.getEvents({ view: 'family', limit: 6 }),
      ]);
      setStats(statsData.stats);
      setRecentEvents(eventsData.events || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Prague Family Events</h1>
        <p className="text-muted-foreground">
          Discover amazing family-friendly events in Prague and surrounding areas
        </p>
      </div>

      {/* Calendar View Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/toddler">
          <Card className="h-full cursor-pointer hover:shadow-lg transition-all hover:border-pink-400">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 rounded-full">
                  <Baby className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Toddler View</CardTitle>
                  <CardDescription>For 1.5 year old</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Soft play, puppet shows, baby concerts, sensory activities
              </p>
              {stats && (
                <p className="text-xs mt-2 text-pink-600 font-semibold">
                  Avg. Score: {stats.averageScores.toddler}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/child">
          <Card className="h-full cursor-pointer hover:shadow-lg transition-all hover:border-blue-400">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Child View</CardTitle>
                  <CardDescription>For 9 year old</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Museums, science centers, sports, workshops, theater
              </p>
              {stats && (
                <p className="text-xs mt-2 text-blue-600 font-semibold">
                  Avg. Score: {stats.averageScores.child}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/family">
          <Card className="h-full cursor-pointer hover:shadow-lg transition-all hover:border-green-400">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Family View</CardTitle>
                  <CardDescription>For everyone</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Parks, zoos, festivals, family shows, exhibitions
              </p>
              {stats && (
                <p className="text-xs mt-2 text-green-600 font-semibold">
                  Avg. Score: {stats.averageScores.family}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <Link href="/calendar">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar View
          </Button>
        </Link>
        <Link href="/map">
          <Button variant="outline">
            <Map className="w-4 h-4 mr-2" />
            Map View
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalEvents}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming Events</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sources</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.eventsBySource?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Updated</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Daily at 3:00 AM</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent High-Scored Events */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Top Recommended Events</h2>
          <Link href="/dashboard/family">
            <Button variant="link">View All →</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : recentEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                view="family"
                onClick={() => (window.location.href = `/events/${event.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No events found.</p>
              <p className="text-sm text-muted-foreground">
                Run the scraper to populate the database with events.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>🔥 Must See (90-100):</strong> Highly recommended events perfect for the age group
          </p>
          <p>
            <strong>⭐ Highly Recommended (75-89):</strong> Great events worth attending
          </p>
          <p>
            <strong>✓ Good Option (60-74):</strong> Good events if available
          </p>
          <p className="text-muted-foreground">
            Events are scored based on age-appropriateness, distance, price, timing, and weather.
            Each calendar view shows max 4 events per day (highest scored).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
