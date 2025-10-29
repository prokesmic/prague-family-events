/**
 * Geocoding service using OpenStreetMap Nominatim API
 */

import axios from 'axios';
import { GeocodingResult } from '../types';
import { distanceFromPrague, isWithinPragueRadius } from '../utils/distance';

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const REQUEST_DELAY = 1000; // 1 second delay between requests (Nominatim rate limit)

// Cache for geocoded addresses
const geocodeCache = new Map<string, GeocodingResult | null>();

/**
 * Geocode an address using Nominatim API
 * @param address Address to geocode
 * @returns Geocoding result or null if not found
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim() === '') {
    return null;
  }

  const cacheKey = address.toLowerCase().trim();

  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }

  try {
    // Add delay to respect rate limits
    await delay(REQUEST_DELAY);

    const response = await axios.get(NOMINATIM_API, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'cz', // Limit to Czech Republic
      },
      headers: {
        'User-Agent': 'PragueFamilyEvents/1.0 (family-calendar-app)',
      },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      const result: GeocodingResult = {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name,
      };

      // Cache the result
      geocodeCache.set(cacheKey, result);

      return result;
    }

    // Cache null result to avoid repeated failed requests
    geocodeCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error(`Geocoding error for address "${address}":`, error);
    // Cache null result
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Geocode address and calculate distance from Prague
 * @param address Address to geocode
 * @returns Object with coordinates and distance, or null
 */
export async function geocodeAndCalculateDistance(address: string): Promise<{
  latitude: number;
  longitude: number;
  distanceFromPrague: number;
} | null> {
  const result = await geocodeAddress(address);

  if (!result) {
    return null;
  }

  const distance = distanceFromPrague(result.latitude, result.longitude);

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    distanceFromPrague: distance,
  };
}

/**
 * Check if address is within Prague radius
 * @param address Address to check
 * @param maxDistanceKm Maximum distance in kilometers (default: 130)
 * @returns True if within radius, false otherwise
 */
export async function isAddressWithinPragueRadius(
  address: string,
  maxDistanceKm: number = 130
): Promise<boolean> {
  const result = await geocodeAndCalculateDistance(address);

  if (!result) {
    return false;
  }

  return result.distanceFromPrague <= maxDistanceKm;
}

/**
 * Batch geocode multiple addresses with rate limiting
 * @param addresses Array of addresses to geocode
 * @returns Array of geocoding results
 */
export async function batchGeocode(
  addresses: string[]
): Promise<(GeocodingResult | null)[]> {
  const results: (GeocodingResult | null)[] = [];

  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);
  }

  return results;
}

/**
 * Clear geocoding cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: number } {
  return {
    size: geocodeCache.size,
    entries: Array.from(geocodeCache.entries()).filter(([_, v]) => v !== null).length,
  };
}

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
