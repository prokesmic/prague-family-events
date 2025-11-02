/**
 * Type definitions for the Prague Family Events application
 */

export interface RawEvent {
  externalId: string;
  source: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime?: Date;
  locationName?: string;
  address?: string;
  category?: string;
  ageMin?: number;
  ageMax?: number;
  adultPrice?: number;
  childPrice?: number;
  familyPrice?: number;
  isOutdoor?: boolean;
  durationMinutes?: number;
  imageUrl?: string;
  bookingUrl?: string;
}

export interface GeocodedEvent extends RawEvent {
  latitude?: number;
  longitude?: number;
  distanceFromPrague?: number;
}

export interface ScoredEvent extends GeocodedEvent {
  scoreToddler: number;
  scoreChild: number;
  scoreFamily: number;
}

export interface ScoreFactors {
  ageAppropriatenessScore: number;
  distanceScore: number;
  priceScore: number;
  eventTypeScore: number;
  timingScore: number;
  durationScore: number;
  seasonalityScore: number;
  weatherScore?: number;
}

export interface ScraperResult {
  source: string;
  events: RawEvent[];
  errors: string[];
  executionTime: number;
}

export interface WeatherData {
  date: string;
  temperature: number;
  condition: string;
  isGoodForOutdoor: boolean;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export enum AgeGroup {
  TODDLER = 'toddler',
  CHILD = 'child',
  FAMILY = 'family'
}

export enum EventCategory {
  MUSEUM = 'museum',
  THEATER = 'theater',
  WORKSHOP = 'workshop',
  OUTDOOR = 'outdoor',
  SPORT = 'sport',
  PLAYGROUND = 'playground',
  EXHIBITION = 'exhibition',
  CONCERT = 'concert',
  FESTIVAL = 'festival',
  EDUCATIONAL = 'educational',
  OTHER = 'other'
}

export interface FilterOptions {
  category?: string[];
  priceMin?: number;
  priceMax?: number;
  distanceMax?: number;
  ageGroup?: AgeGroup;
  indoorOnly?: boolean;
  outdoorOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}
