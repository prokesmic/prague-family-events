/**
 * Calendar Page - Family View
 * Shows events in a monthly calendar format
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarView } from '@/components/calendar-view';
import { eventAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Baby, User, Users } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'toddler' | 'child' | 'family'>('family');

  useEffect(() => {
    loadEvents();
  }, [view]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await eventAPI.getEvents({ view, limit: 1000 });
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: any) => {
    router.push(`/events/${event.id}`);
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
            <h1 className="text-3xl font-bold">Kalendář akcí</h1>
            <p className="text-muted-foreground">Zobrazení všech rodinných akcí v kalendáři</p>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={view === 'toddler' ? 'default' : 'outline'}
          onClick={() => setView('toddler')}
          className={view === 'toddler' ? 'bg-pink-600 hover:bg-pink-700' : ''}
        >
          <Baby className="w-4 h-4 mr-2" />
          Batolata (1.5 roku)
        </Button>
        <Button
          variant={view === 'child' ? 'default' : 'outline'}
          onClick={() => setView('child')}
          className={view === 'child' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <User className="w-4 h-4 mr-2" />
          Děti (9 let)
        </Button>
        <Button
          variant={view === 'family' ? 'default' : 'outline'}
          onClick={() => setView('family')}
          className={view === 'family' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Users className="w-4 h-4 mr-2" />
          Rodina
        </Button>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="h-[700px] bg-white rounded-lg shadow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítání událostí...</p>
          </div>
        </div>
      ) : (
        <CalendarView events={events} view={view} onEventClick={handleEventClick} />
      )}

      {/* Legend */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">Legenda hodnocení:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>90+ - Must See!</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-600 rounded"></div>
            <span>75+ - Velmi doporučeno</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-600 rounded"></div>
            <span>60+ - Dobrá volba</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>45+ - Zvážit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span>&lt;45 - Nízká priorita</span>
          </div>
        </div>
      </div>
    </div>
  );
}
