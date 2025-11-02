/**
 * Event Card Component
 * Displays event information with score badge
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';
import { cs } from 'date-fns/locale';
import { MapPin, Clock, Euro, Calendar } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  startDateTime: Date | string;
  locationName?: string;
  distanceFromPrague?: number;
  adultPrice?: number;
  childPrice?: number;
  familyPrice?: number;
  category?: string;
  imageUrl?: string;
  scoreToddler: number;
  scoreChild: number;
  scoreFamily: number;
}

interface EventCardProps {
  event: Event;
  view: 'toddler' | 'child' | 'family';
  onClick?: () => void;
}

/**
 * Get score badge color and label based on score
 */
function getScoreBadge(score: number): { color: string; label: string; emoji: string } {
  if (score >= 90) {
    return { color: 'bg-red-600 hover:bg-red-700', label: 'Must See!', emoji: '🔥' };
  } else if (score >= 75) {
    return { color: 'bg-orange-600 hover:bg-orange-700', label: 'Highly Recommended', emoji: '⭐' };
  } else if (score >= 60) {
    return { color: 'bg-yellow-600 hover:bg-yellow-700', label: 'Good Option', emoji: '✓' };
  } else if (score >= 45) {
    return { color: 'bg-green-600 hover:bg-green-700', label: 'Consider', emoji: '' };
  } else {
    return { color: 'bg-gray-500 hover:bg-gray-600', label: 'Low Priority', emoji: '' };
  }
}

/**
 * Calculate best family price
 */
function calculateBestPrice(
  adultPrice?: number,
  childPrice?: number,
  familyPrice?: number
): { price: number; label: string } {
  const individual = (adultPrice || 0) * 2 + (childPrice || adultPrice || 0);

  if (familyPrice && familyPrice < individual) {
    const savings = individual - familyPrice;
    return { price: familyPrice, label: `Rodinné (úspora ${savings} Kč)` };
  }

  return { price: individual, label: 'Individuální' };
}

export function EventCard({ event, view, onClick }: EventCardProps) {
  const score =
    view === 'toddler'
      ? event.scoreToddler
      : view === 'child'
      ? event.scoreChild
      : event.scoreFamily;

  const scoreBadge = getScoreBadge(score);
  const startDate = typeof event.startDateTime === 'string'
    ? new Date(event.startDateTime)
    : event.startDateTime;

  const { price, label: priceLabel } = calculateBestPrice(
    event.adultPrice,
    event.childPrice,
    event.familyPrice
  );

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden"
      onClick={onClick}
    >
      {/* Score Badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className={`${scoreBadge.color} text-white font-bold`}>
          {score} {scoreBadge.emoji}
        </Badge>
      </div>

      {/* Image */}
      <div className="relative w-full h-48 bg-gray-200">
        <img
          src={event.imageUrl || 'https://picsum.photos/seed/100/800/600'}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== 'https://picsum.photos/seed/100/800/600') {
              target.src = 'https://picsum.photos/seed/100/800/600';
            }
          }}
        />
      </div>

      <CardHeader>
        <CardTitle className="text-lg pr-16">{event.title}</CardTitle>
        {event.category && (
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {event.category}
            </Badge>
            <Badge variant="secondary" className={scoreBadge.color.replace('bg-', 'text-')}>
              {scoreBadge.label}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {event.description && (
          <CardDescription className="mb-4 line-clamp-2">
            {event.description}
          </CardDescription>
        )}

        <div className="space-y-2 text-sm">
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {formatInTimeZone(startDate, 'Europe/Prague', 'EEEE, d. MMMM yyyy', { locale: cs })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatInTimeZone(startDate, 'Europe/Prague', 'HH:mm', { locale: cs })}</span>
          </div>

          {/* Location */}
          {event.locationName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>
                {event.locationName}
                {event.distanceFromPrague && (
                  <span className="text-xs ml-1">
                    ({event.distanceFromPrague.toFixed(1)} km)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Euro className="w-4 h-4" />
            {price === 0 ? (
              <span className="text-green-600 font-semibold">Zdarma</span>
            ) : (
              <span>
                {price} Kč{' '}
                <span className="text-xs">({priceLabel})</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
