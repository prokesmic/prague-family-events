/**
 * Interactive Map Component with Leaflet
 * Displays events on a map with markers
 */

'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Event {
  id: string;
  title: string;
  locationName?: string;
  latitude: number;
  longitude: number;
  distanceFromPrague?: number;
  startDateTime: Date | string;
  scoreToddler: number;
  scoreChild: number;
  scoreFamily: number;
  adultPrice?: number;
  childPrice?: number;
}

interface MapViewProps {
  events: Event[];
  view: 'toddler' | 'child' | 'family';
  onEventClick?: (eventId: string) => void;
}

// Prague center coordinates
const PRAGUE_CENTER: [number, number] = [50.0755, 14.4378];
const PRAGUE_RADIUS_KM = 130;

/**
 * Get marker color based on score
 */
function getMarkerColor(score: number): string {
  if (score >= 90) return '#DC2626'; // Red
  if (score >= 75) return '#EA580C'; // Orange
  if (score >= 60) return '#CA8A04'; // Yellow
  if (score >= 45) return '#16A34A'; // Green
  return '#6B7280'; // Gray
}

/**
 * Create custom colored marker icon
 */
function createColoredIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

export function MapView({ events, view, onEventClick }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border shadow-lg">
      <MapContainer
        center={PRAGUE_CENTER}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Prague center circle (130km radius) */}
        <Circle
          center={PRAGUE_CENTER}
          radius={PRAGUE_RADIUS_KM * 1000} // Convert to meters
          pathOptions={{
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.05,
            weight: 2,
            dashArray: '5, 5',
          }}
        />

        {/* Prague center marker */}
        <Marker position={PRAGUE_CENTER}>
          <Popup>
            <div className="text-center">
              <strong>Prague Center</strong>
              <p className="text-sm text-muted-foreground">
                Search radius: 130 km
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Event markers */}
        {events.map((event) => {
          if (!event.latitude || !event.longitude) return null;

          const score =
            view === 'toddler'
              ? event.scoreToddler
              : view === 'child'
              ? event.scoreChild
              : event.scoreFamily;

          const markerColor = getMarkerColor(score);
          const icon = createColoredIcon(markerColor);

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onEventClick) {
                    onEventClick(event.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-semibold mb-1">{event.title}</h3>
                  {event.locationName && (
                    <p className="text-sm text-muted-foreground mb-2">
                      📍 {event.locationName}
                    </p>
                  )}
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Score:</strong>{' '}
                      <span
                        style={{ color: markerColor }}
                        className="font-semibold"
                      >
                        {score}/100
                      </span>
                    </p>
                    {event.distanceFromPrague && (
                      <p>
                        <strong>Distance:</strong> {event.distanceFromPrague.toFixed(1)} km
                      </p>
                    )}
                    {event.adultPrice !== undefined && (
                      <p>
                        <strong>Price:</strong>{' '}
                        {event.adultPrice === 0
                          ? 'Zdarma'
                          : `${event.adultPrice} Kč`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onEventClick?.(event.id)}
                    className="mt-2 w-full text-center bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
