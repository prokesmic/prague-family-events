/**
 * Event Detail Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { eventAPI } from '@/lib/api';
import { ArrowLeft, MapPin, Clock, Euro, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    // Unwrap params promise
    params.then((p) => setEventId(p.id));
  }, [params]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await eventAPI.getEvent(eventId);
      setEvent(data.event);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Event Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This event does not exist or has been removed.
            </p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(event.startDateTime);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Event Image */}
      {event.imageUrl && (
        <div className="mb-6 rounded-lg overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Event Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                {event.category && (
                  <Badge variant="outline">{event.category}</Badge>
                )}
                <Badge className="bg-blue-600">
                  Toddler: {event.scoreToddler}/100
                </Badge>
                <Badge className="bg-green-600">
                  Child: {event.scoreChild}/100
                </Badge>
                <Badge className="bg-purple-600">
                  Family: {event.scoreFamily}/100
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Date</p>
                <p className="text-muted-foreground">
                  {format(startDate, 'EEEE, d. MMMM yyyy', { locale: cs })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Time</p>
                <p className="text-muted-foreground">
                  {format(startDate, 'HH:mm')}
                  {event.durationMinutes && ` (${event.durationMinutes} min)`}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          {event.locationName && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Location</p>
                <p className="text-muted-foreground">{event.locationName}</p>
                {event.address && (
                  <p className="text-sm text-muted-foreground">{event.address}</p>
                )}
                {event.distanceFromPrague && (
                  <p className="text-sm text-muted-foreground">
                    {event.distanceFromPrague.toFixed(1)} km from Prague center
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-start gap-3">
            <Euro className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-semibold">Price</p>
              {event.adultPrice === 0 && event.childPrice === 0 ? (
                <p className="text-green-600 font-semibold">Zdarma (Free)</p>
              ) : (
                <div className="space-y-1 text-muted-foreground">
                  {event.adultPrice && <p>Dospělý: {event.adultPrice} Kč</p>}
                  {event.childPrice && <p>Dítě: {event.childPrice} Kč</p>}
                  {event.familyPrice && (
                    <p className="font-semibold text-green-600">
                      Rodinné vstupné: {event.familyPrice} Kč
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Age Range */}
          {(event.ageMin || event.ageMax) && (
            <div>
              <p className="font-semibold mb-1">Age Range</p>
              <p className="text-muted-foreground">
                {event.ageMin && event.ageMax
                  ? `${event.ageMin} - ${event.ageMax} let`
                  : event.ageMin
                  ? `Od ${event.ageMin} let`
                  : `Do ${event.ageMax} let`}
              </p>
            </div>
          )}

          {/* Booking Link */}
          {event.bookingUrl && (
            <div>
              <a
                href={event.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Event Details & Book
                </Button>
              </a>
            </div>
          )}

          {/* Source */}
          <div className="text-sm text-muted-foreground border-t pt-4">
            Source: {event.source}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
