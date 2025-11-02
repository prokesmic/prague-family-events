/**
 * Calendar View Component
 * Monthly calendar showing events by date
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Event as BigCalendarEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Clock, Euro, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Setup date-fns localizer for Czech locale
const locales = {
  cs: cs,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Event {
  id: string;
  title: string;
  description?: string;
  startDateTime: Date | string;
  endDateTime?: Date | string;
  locationName?: string;
  distanceFromPrague?: number;
  adultPrice?: number;
  childPrice?: number;
  familyPrice?: number;
  category?: string;
  imageUrl?: string;
  bookingUrl?: string;
  scoreToddler: number;
  scoreChild: number;
  scoreFamily: number;
}

interface CalendarViewProps {
  events: Event[];
  view: 'toddler' | 'child' | 'family';
  onEventClick?: (event: Event) => void;
}

interface CalendarEvent extends BigCalendarEvent {
  event: Event;
  score: number;
}

/**
 * Get score badge color based on score
 */
function getScoreBadge(score: number): { color: string; label: string; bgColor: string } {
  if (score >= 90) {
    return { color: 'bg-red-600', label: 'Must See!', bgColor: '#DC2626' };
  } else if (score >= 75) {
    return { color: 'bg-orange-600', label: 'Highly Recommended', bgColor: '#EA580C' };
  } else if (score >= 60) {
    return { color: 'bg-yellow-600', label: 'Good Option', bgColor: '#CA8A04' };
  } else if (score >= 45) {
    return { color: 'bg-green-600', label: 'Consider', bgColor: '#16A34A' };
  } else {
    return { color: 'bg-gray-500', label: 'Low Priority', bgColor: '#6B7280' };
  }
}

export function CalendarView({ events, view, onEventClick }: CalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [calendarView, setCalendarView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Convert events to calendar format
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map((event) => {
      const score =
        view === 'toddler'
          ? event.scoreToddler
          : view === 'child'
          ? event.scoreChild
          : event.scoreFamily;

      const start =
        typeof event.startDateTime === 'string'
          ? new Date(event.startDateTime)
          : event.startDateTime;

      const end = event.endDateTime
        ? typeof event.endDateTime === 'string'
          ? new Date(event.endDateTime)
          : event.endDateTime
        : new Date(start.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours if no end time

      return {
        title: event.title,
        start,
        end,
        event,
        score,
      };
    });
  }, [events, view]);

  // Custom event style function
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const badge = getScoreBadge(event.score);
      return {
        style: {
          backgroundColor: badge.bgColor,
          borderRadius: '5px',
          opacity: 0.9,
          color: 'white',
          border: '0px',
          display: 'block',
          fontSize: '0.85rem',
          padding: '2px 5px',
        },
      };
    },
    []
  );

  // Handle event selection
  const handleSelectEvent = useCallback(
    (calendarEvent: CalendarEvent) => {
      setSelectedEvent(calendarEvent.event);
      if (onEventClick) {
        onEventClick(calendarEvent.event);
      }
    },
    [onEventClick]
  );

  // Calculate best price
  const calculateBestPrice = (
    adultPrice?: number,
    childPrice?: number,
    familyPrice?: number
  ): { price: number; label: string } => {
    const individual = (adultPrice || 0) * 2 + (childPrice || adultPrice || 0);

    if (familyPrice && familyPrice < individual) {
      const savings = individual - familyPrice;
      return { price: familyPrice, label: `Rodinné (úspora ${savings} Kč)` };
    }

    return { price: individual, label: 'Individuální' };
  };

  return (
    <>
      <div className="h-[700px] bg-white p-4 rounded-lg shadow">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          view={calendarView}
          onView={setCalendarView}
          date={date}
          onNavigate={setDate}
          culture="cs"
          messages={{
            next: 'Další',
            previous: 'Předchozí',
            today: 'Dnes',
            month: 'Měsíc',
            week: 'Týden',
            day: 'Den',
            agenda: 'Agenda',
            date: 'Datum',
            time: 'Čas',
            event: 'Událost',
            noEventsInRange: 'V tomto období nejsou žádné události.',
            showMore: (total) => `+ další (${total})`,
          }}
        />
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
              {selectedEvent.category && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{selectedEvent.category}</Badge>
                  <Badge
                    className={
                      getScoreBadge(
                        view === 'toddler'
                          ? selectedEvent.scoreToddler
                          : view === 'child'
                          ? selectedEvent.scoreChild
                          : selectedEvent.scoreFamily
                      ).color + ' text-white'
                    }
                  >
                    {view === 'toddler'
                      ? selectedEvent.scoreToddler
                      : view === 'child'
                      ? selectedEvent.scoreChild
                      : selectedEvent.scoreFamily}{' '}
                    -{' '}
                    {
                      getScoreBadge(
                        view === 'toddler'
                          ? selectedEvent.scoreToddler
                          : view === 'child'
                          ? selectedEvent.scoreChild
                          : selectedEvent.scoreFamily
                      ).label
                    }
                  </Badge>
                </div>
              )}
            </DialogHeader>

            {selectedEvent.imageUrl && (
              <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <DialogDescription className="text-base">
              {selectedEvent.description || 'Žádný popis k dispozici.'}
            </DialogDescription>

            <div className="space-y-3">
              {/* Date & Time */}
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {format(
                    typeof selectedEvent.startDateTime === 'string'
                      ? new Date(selectedEvent.startDateTime)
                      : selectedEvent.startDateTime,
                    'EEEE, d. MMMM yyyy',
                    { locale: cs }
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {format(
                    typeof selectedEvent.startDateTime === 'string'
                      ? new Date(selectedEvent.startDateTime)
                      : selectedEvent.startDateTime,
                    'HH:mm',
                    { locale: cs }
                  )}
                </span>
              </div>

              {/* Location */}
              {selectedEvent.locationName && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {selectedEvent.locationName}
                    {selectedEvent.distanceFromPrague && (
                      <span className="text-xs ml-1">
                        ({selectedEvent.distanceFromPrague.toFixed(1)} km od Prahy)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-2 text-sm">
                <Euro className="w-4 h-4" />
                {(() => {
                  const { price, label } = calculateBestPrice(
                    selectedEvent.adultPrice,
                    selectedEvent.childPrice,
                    selectedEvent.familyPrice
                  );
                  return price === 0 ? (
                    <span className="text-green-600 font-semibold">Zdarma</span>
                  ) : (
                    <span>
                      {price} Kč <span className="text-xs">({label})</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            {selectedEvent.bookingUrl && (
              <Button asChild className="w-full mt-4">
                <a href={selectedEvent.bookingUrl} target="_blank" rel="noopener noreferrer">
                  Více informací / Rezervace
                </a>
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
