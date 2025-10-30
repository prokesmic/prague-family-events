/**
 * Event scoring algorithm for toddler, child, and family views
 * Base score: 50 points, then add points based on various factors
 */

import { GeocodedEvent, ScoredEvent, AgeGroup, ScoreFactors } from '../types';
import { WeatherData } from '../types';

const BASE_SCORE = 50;

/**
 * Calculate age appropriateness score (max 25 points)
 * Enhanced version with better age range handling
 * @param ageMin Minimum age for event
 * @param ageMax Maximum age for event
 * @param targetAge Target age to score for
 * @param ageGroup The age group being scored for
 * @returns Score between 0 and 25
 */
function calculateAgeScore(ageMin?: number, ageMax?: number, targetAge?: number, ageGroup?: AgeGroup): number {
  if (!ageMin && !ageMax) {
    // No age restriction specified - lower scores for unknown age appropriateness
    // This penalizes events with missing data to encourage better scraping
    if (ageGroup === AgeGroup.TODDLER) return 8; // Changed from 18 - toddlers need specific content
    if (ageGroup === AgeGroup.CHILD) return 12; // Changed from 20 - children need appropriate content
    return 15; // Changed from 22 - family events more flexible but still need verification
  }

  if (!targetAge) {
    return 12;
  }

  // Perfect match: targetAge is within range
  if (ageMin && ageMax && targetAge >= ageMin && targetAge <= ageMax) {
    return 25;
  }

  // Within range but not specified both bounds
  if (ageMin && !ageMax && targetAge >= ageMin) {
    // Event says "X+ years", check how close we are
    const diff = targetAge - ageMin;
    if (diff < 2) return 23;
    if (diff < 5) return 20;
    return 16;
  }

  if (ageMax && !ageMin && targetAge <= ageMax) {
    // Event says "up to X years", check how close we are
    const diff = ageMax - targetAge;
    if (diff > 2) return 23;
    if (diff >= 0) return 20;
    return 16;
  }

  // Close to the range - use graduated scoring
  if (ageMin && targetAge < ageMin) {
    const diff = ageMin - targetAge;
    if (diff <= 1) return 15;
    if (diff <= 2) return 10;
    if (diff <= 4) return 5;
    return 0;
  }

  if (ageMax && targetAge > ageMax) {
    const diff = targetAge - ageMax;
    if (diff <= 1) return 15;
    if (diff <= 2) return 10;
    if (diff <= 4) return 5;
    return 0;
  }

  return 0;
}

/**
 * Calculate distance score (max 15 points)
 * @param distance Distance from Prague in km
 * @returns Score between 0 and 15
 */
function calculateDistanceScore(distance?: number): number {
  if (!distance) return 3; // Changed from 8 - penalize unknown location

  if (distance < 10) return 15;
  if (distance < 30) return 10;
  if (distance < 70) return 5;
  if (distance < 130) return 2;
  return 0;
}

/**
 * Calculate price score (max 15 points)
 * Uses adult price as reference
 * @param adultPrice Adult price in CZK
 * @param childPrice Child price in CZK
 * @param familyPrice Family price in CZK
 * @returns Score between 0 and 15
 */
function calculatePriceScore(
  adultPrice?: number,
  childPrice?: number,
  familyPrice?: number
): number {
  // If no price data available, give low score (uncertainty penalty)
  if (!adultPrice && !childPrice && !familyPrice) {
    return 3; // Changed from implicit 15 to explicit 3 - penalize missing data
  }

  // Calculate best family price (2 adults + 1 child)
  const individualPrice = (adultPrice || 0) * 2 + (childPrice || adultPrice || 0);
  const effectivePrice = familyPrice && familyPrice < individualPrice
    ? familyPrice
    : individualPrice;

  if (effectivePrice === 0) return 15; // Actually free
  if (effectivePrice < 200) return 12;
  if (effectivePrice < 500) return 8;
  if (effectivePrice < 1000) return 4;
  return 2;
}

/**
 * Calculate event type score (max 15 points)
 * @param category Event category
 * @param isOutdoor Whether event is outdoor
 * @param ageGroup Target age group
 * @param weather Weather data if available
 * @returns Score between 0 and 15
 */
function calculateEventTypeScore(
  category?: string,
  isOutdoor?: boolean,
  ageGroup?: AgeGroup,
  weather?: WeatherData
): number {
  let score = 5; // Base score

  if (!category) return score;

  const cat = category.toLowerCase();

  // Apply negative patterns for inappropriate events
  if (ageGroup === AgeGroup.TODDLER) {
    // Major penalties for clearly inappropriate events for toddlers
    if (cat.includes('concert') && !cat.includes('kids') && !cat.includes('children')) {
      score -= 15; // Concerts usually too loud and long for toddlers
    }
    if (cat.includes('club') || cat.includes('nightclub') || cat.includes('bar')) {
      score -= 20; // Completely inappropriate
    }
    if (cat.includes('lecture') || cat.includes('conference') || cat.includes('business')) {
      score -= 18; // Too complex and long
    }
    if (cat.includes('horror') || cat.includes('scary')) {
      score -= 20; // Inappropriate content
    }
  } else if (ageGroup === AgeGroup.CHILD) {
    // Moderate penalties for less suitable events for children
    if (cat.includes('nightclub') || cat.includes('bar crawl')) {
      score -= 20; // Completely inappropriate
    }
    if (cat.includes('business') || cat.includes('networking')) {
      score -= 15; // Not relevant
    }
    if (cat.includes('horror') && !cat.includes('mild')) {
      score -= 10; // Might be too scary
    }
  }

  // Outdoor events get bonus if weather is good
  if (isOutdoor && weather?.isGoodForOutdoor) {
    score += 8;
  } else if (isOutdoor && weather && !weather.isGoodForOutdoor) {
    score -= 3; // Penalty for outdoor event with bad weather
  }

  // Educational events
  if (cat.includes('museum') || cat.includes('educational') || cat.includes('workshop')) {
    score += 7;
  }

  // Interactive events
  if (cat.includes('workshop') || cat.includes('interactive') || cat.includes('sport')) {
    score += 5;
  }

  // Age-specific preferences
  if (ageGroup === AgeGroup.TODDLER) {
    // Toddlers (0-3 years): simple, safe activities
    if (cat.includes('playground') || cat.includes('soft play') || cat.includes('puppet')) {
      score += 9;
    }
    if (cat.includes('petting zoo') || cat.includes('farm') || cat.includes('animals')) {
      score += 8;
    }
    if (cat.includes('music') || cat.includes('sensory')) {
      score += 7;
    }
    // Avoid complex/long activities for toddlers
    if (cat.includes('theater') && !cat.includes('puppet')) {
      score -= 2;
    }
  } else if (ageGroup === AgeGroup.CHILD) {
    // Children (4-12 years): educational, interactive, active
    if (cat.includes('museum') || cat.includes('science') || cat.includes('educational')) {
      score += 8;
    }
    if (cat.includes('sport') || cat.includes('climbing') || cat.includes('adventure')) {
      score += 7;
    }
    if (cat.includes('workshop') || cat.includes('craft') || cat.includes('art')) {
      score += 7;
    }
    if (cat.includes('theater') || cat.includes('cinema')) {
      score += 6;
    }
  } else if (ageGroup === AgeGroup.FAMILY) {
    // Family: everyone can enjoy
    if (cat.includes('festival') || cat.includes('zoo') || cat.includes('park')) {
      score += 7;
    }
    if (cat.includes('exhibition') || cat.includes('museum')) {
      score += 6;
    }
    if (cat.includes('outdoor') || cat.includes('nature') || cat.includes('hiking')) {
      score += 6;
    }
  }

  return Math.min(score, 15);
}

/**
 * Calculate timing score (max 10 points)
 * @param startDateTime Event start date and time
 * @param ageGroup Target age group
 * @returns Score between 0 and 10
 */
function calculateTimingScore(startDateTime: Date, ageGroup?: AgeGroup): number {
  let score = 0;

  const dayOfWeek = startDateTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = startDateTime.getHours();

  // Weekend bonus
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    score += 5;
  }

  // Time of day preferences based on age group
  if (ageGroup === AgeGroup.TODDLER) {
    // Morning events better for toddlers (9-11 AM)
    if (hour >= 9 && hour < 11) {
      score += 5;
    } else if (hour >= 11 && hour < 14) {
      score += 2;
    }
  } else if (ageGroup === AgeGroup.CHILD) {
    // Afternoon events better for older children (2-5 PM)
    if (hour >= 14 && hour < 17) {
      score += 3;
    }
  } else {
    // Flexible for family events
    if (hour >= 10 && hour < 18) {
      score += 2;
    }
  }

  return Math.min(score, 10);
}

/**
 * Calculate duration score (max 10 points)
 * @param durationMinutes Event duration in minutes
 * @param ageGroup Target age group
 * @returns Score between 0 and 10
 */
function calculateDurationScore(durationMinutes?: number, ageGroup?: AgeGroup): number {
  if (!durationMinutes) return 2; // Changed from 5 - penalize unknown duration

  if (ageGroup === AgeGroup.TODDLER) {
    // Optimal: 30-60 minutes for toddlers
    if (durationMinutes >= 30 && durationMinutes <= 60) return 10;
    if (durationMinutes >= 60 && durationMinutes <= 90) return 7;
    if (durationMinutes < 30) return 5;
    return 3;
  } else if (ageGroup === AgeGroup.CHILD) {
    // Optimal: 90-180 minutes for older children
    if (durationMinutes >= 90 && durationMinutes <= 180) return 10;
    if (durationMinutes >= 60 && durationMinutes <= 90) return 8;
    if (durationMinutes >= 180 && durationMinutes <= 240) return 7;
    return 5;
  } else {
    // Family: flexible duration
    if (durationMinutes >= 90 && durationMinutes <= 240) return 10;
    if (durationMinutes >= 60 && durationMinutes <= 90) return 8;
    return 6;
  }
}

/**
 * Calculate seasonality score (max 5 points)
 * @param title Event title
 * @param description Event description
 * @param startDateTime Event start date
 * @returns Score between 0 and 5
 */
function calculateSeasonalityScore(
  title: string,
  description?: string,
  startDateTime?: Date
): number {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Check for seasonal/limited-time indicators
  const seasonalKeywords = [
    'festival',
    'speciální',
    'výjimečný',
    'limited',
    'exkluzivní',
    'pouze',
    'jednou',
    'naposledy',
    'premiéra',
    'closing',
  ];

  for (const keyword of seasonalKeywords) {
    if (text.includes(keyword)) {
      return 5;
    }
  }

  // Check for holiday events
  if (startDateTime) {
    const month = startDateTime.getMonth();
    const day = startDateTime.getDate();

    // Christmas season
    if (month === 11) return 5;
    // Easter (approximate)
    if (month === 3 || month === 2) return 3;
  }

  return 0;
}

/**
 * Calculate data completeness multiplier (0.7 - 1.0)
 * Penalizes events with incomplete data to encourage better scraping
 * @param event Event to evaluate
 * @returns Multiplier between 0.7 and 1.0
 */
function calculateDataCompletenessMultiplier(event: GeocodedEvent): number {
  let completeness = 0;
  let totalFields = 0;

  // Essential fields (weight: 2 each)
  if (event.ageMin != null && event.ageMax != null) {
    completeness += 2;
  }
  totalFields += 2;

  if (event.distanceFromPrague != null) {
    completeness += 2;
  }
  totalFields += 2;

  // Important fields (weight: 1 each)
  if (event.adultPrice != null || event.childPrice != null || event.familyPrice != null) {
    completeness += 1;
  }
  totalFields += 1;

  if (event.durationMinutes != null) {
    completeness += 1;
  }
  totalFields += 1;

  if (event.description && event.description.length > 50) {
    completeness += 1;
  }
  totalFields += 1;

  if (event.imageUrl) {
    completeness += 1;
  }
  totalFields += 1;

  const completenessRatio = completeness / totalFields;

  // Map to 0.7 - 1.0 range
  // 100% complete = 1.0x, 50% complete = 0.85x, 0% complete = 0.7x
  return 0.7 + (completenessRatio * 0.3);
}

/**
 * Score a single event for a specific age group
 * @param event Event to score
 * @param ageGroup Target age group
 * @param weather Weather data if available
 * @returns Scored event
 */
export function scoreEvent(
  event: GeocodedEvent,
  ageGroup: AgeGroup,
  weather?: WeatherData
): { score: number; factors: ScoreFactors } {
  const targetAge =
    ageGroup === AgeGroup.TODDLER ? 2 : ageGroup === AgeGroup.CHILD ? 8 : undefined;

  const ageScore = calculateAgeScore(event.ageMin, event.ageMax, targetAge, ageGroup);
  const distanceScore = calculateDistanceScore(event.distanceFromPrague);
  const priceScore = calculatePriceScore(event.adultPrice, event.childPrice, event.familyPrice);
  const eventTypeScore = calculateEventTypeScore(
    event.category,
    event.isOutdoor,
    ageGroup,
    weather
  );
  const timingScore = calculateTimingScore(event.startDateTime, ageGroup);
  const durationScore = calculateDurationScore(event.durationMinutes, ageGroup);
  const seasonalityScore = calculateSeasonalityScore(
    event.title,
    event.description,
    event.startDateTime
  );

  // Apply data completeness multiplier to final score
  const dataMultiplier = calculateDataCompletenessMultiplier(event);
  const totalScore = Math.min(
    100,
    (BASE_SCORE +
      ageScore +
      distanceScore +
      priceScore +
      eventTypeScore +
      timingScore +
      durationScore +
      seasonalityScore) * dataMultiplier
  );

  return {
    score: Math.round(totalScore),
    factors: {
      ageAppropriatenessScore: ageScore,
      distanceScore,
      priceScore,
      eventTypeScore,
      timingScore,
      durationScore,
      seasonalityScore,
      weatherScore: weather?.isGoodForOutdoor ? 5 : 0,
    },
  };
}

/**
 * Score event for all age groups
 * @param event Event to score
 * @param weather Weather data if available
 * @returns Scored event with scores for all age groups
 */
export function scoreEventForAllGroups(
  event: GeocodedEvent,
  weather?: WeatherData
): ScoredEvent {
  const toddlerResult = scoreEvent(event, AgeGroup.TODDLER, weather);
  const childResult = scoreEvent(event, AgeGroup.CHILD, weather);
  const familyResult = scoreEvent(event, AgeGroup.FAMILY, weather);

  return {
    ...event,
    scoreToddler: toddlerResult.score,
    scoreChild: childResult.score,
    scoreFamily: familyResult.score,
  };
}

/**
 * Get score color and label based on score value
 * @param score Score value (0-100)
 * @returns Color hex and label
 */
export function getScoreBadge(score: number): { color: string; label: string; emoji: string } {
  if (score >= 90) {
    return { color: '#DC2626', label: 'Must See!', emoji: '🔥' };
  } else if (score >= 75) {
    return { color: '#EA580C', label: 'Highly Recommended', emoji: '⭐' };
  } else if (score >= 60) {
    return { color: '#CA8A04', label: 'Good Option', emoji: '✓' };
  } else if (score >= 45) {
    return { color: '#16A34A', label: 'Consider', emoji: '' };
  } else {
    return { color: '#6B7280', label: 'Low Priority', emoji: '' };
  }
}
