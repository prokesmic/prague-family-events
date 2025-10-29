/**
 * Map View Page - Interactive map showing all events
 */

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { eventAPI } from '@/lib/api';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/map-view').then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

type View = 'toddler' | 'child' | 'family';

export default function MapPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<View>('family');

  useEffect(() => {
    loadEvents();
  }, [selectedView]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventAPI.getMapEvents(selectedView);
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  // Filter events with valid coordinates
  const validEvents = useMemo(() => {
    return events.filter(e => e.latitude && e.longitude);
  }, [events]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Map View</h1>
            <p className="text-muted-foreground">
              Interactive map of all family events in Prague (130km radius)
            </p>
          </div>
        </div>

        {/* View Selector */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium mr-2">View:</span>
          <Button
            variant={selectedView === 'toddler' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('toddler')}
            className={selectedView === 'toddler' ? 'bg-pink-600 hover:bg-pink-700' : ''}
          >
            🧸 Toddler
          </Button>
          <Button
            variant={selectedView === 'child' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('child')}
            className={selectedView === 'child' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            👦 Child
          </Button>
          <Button
            variant={selectedView === 'family' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('family')}
            className={selectedView === 'family' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            👨‍👩‍👧‍👦 Family
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 flex gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{validEvents.length}</strong> events on map
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Badge className="bg-red-600">90-100: Must See</Badge>
              <Badge className="bg-orange-600">75-89: Highly Recommended</Badge>
              <Badge className="bg-yellow-600">60-74: Good Option</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading events...</p>
          </CardContent>
        </Card>
      ) : validEvents.length > 0 ? (
        <MapView
          events={validEvents}
          view={selectedView}
          onEventClick={handleEventClick}
        />
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Events With Locations</h3>
            <p className="text-muted-foreground">
              No events have geocoded coordinates to display on the map.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Map Legend</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Colored markers represent events (color = score)</li>
            <li>• Blue circle shows 130km search radius from Prague center</li>
            <li>• Click markers to see event details</li>
            <li>• Scroll to zoom, drag to pan</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
