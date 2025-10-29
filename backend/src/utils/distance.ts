/**
 * Distance calculation utilities using Haversine formula
 */

const PRAGUE_CENTER_LAT = 50.0755;
const PRAGUE_CENTER_LON = 14.4378;
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate distance from Prague center
 * @param lat Latitude
 * @param lon Longitude
 * @returns Distance in kilometers
 */
export function distanceFromPrague(lat: number, lon: number): number {
  return calculateDistance(PRAGUE_CENTER_LAT, PRAGUE_CENTER_LON, lat, lon);
}

/**
 * Check if location is within specified radius from Prague
 * @param lat Latitude
 * @param lon Longitude
 * @param maxDistanceKm Maximum distance in kilometers (default: 130)
 * @returns True if within radius, false otherwise
 */
export function isWithinPragueRadius(
  lat: number,
  lon: number,
  maxDistanceKm: number = 130
): boolean {
  const distance = distanceFromPrague(lat, lon);
  return distance <= maxDistanceKm;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export { PRAGUE_CENTER_LAT, PRAGUE_CENTER_LON };
