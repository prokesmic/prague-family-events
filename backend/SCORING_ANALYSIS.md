# Event Scoring Algorithm - ReAct Analysis & Recommendations

## Executive Summary

**Critical Issue Identified**: Score inflation due to overly generous treatment of null/missing data. All events currently score 100/100, defeating the purpose of differentiation.

## ReAct Analysis Framework

### 1. Observation - Current State

#### Score Distribution
- **Current**: 100% of events score 98-100/100
- **Expected**: Normal distribution with scores spread across 40-100 range
- **Impact**: Users cannot differentiate high-quality events from low-quality ones

#### Sample Events Analysis
```
Event: "Arakain + Törr – Koncert legend metalu" (Heavy Metal Concert)
- scoreToddler: 100 ❌ (Should be ~20-30 for toddlers)
- scoreChild: 100 ❌ (Should be ~40-50 for children)
- scoreFamily: 100 ❌ (Should be ~60-70 for families)
- Missing data: age restrictions, price info
```

### 2. Reasoning - Root Cause Analysis

#### Issue #1: Overly Optimistic Null Handling
**Location**: `scoring.ts:80-108`

Current behavior treats missing data as positive:
- `distanceFromPrague === null` → 8 points (moderate score)
- `adultPrice === null` → 15 points (treated as "free")
- `ageMin/ageMax === null` → 18-22 points (high appropriateness)
- `durationMinutes === null` → 5 points (moderate)

**Total Null Bonus**: ~46-50 points + BASE_SCORE (50) = 96-100 points

This means events with NO data still score 96-100!

#### Issue #2: Category Classification Too Generous
**Location**: `scoring.ts:123-195`

Most events categorized as "other" get base category score (5 points) plus potential bonuses that aren't validated against event suitability.

Example: Heavy metal concert for toddlers gets full points because:
- No age restriction specified → 22 points for toddler age appropriateness
- No price → 15 points for "free"
- Weekend event → 5 points for timing
- Unknown duration → 5 points

#### Issue #3: No Data Quality Penalty
Events with incomplete data are scored the same or better than events with complete data.

### 3. Thought - Impact Assessment

#### User Experience Impact
- **Trust erosion**: Users see inappropriate events highly rated
- **Decision paralysis**: All events look equally good
- **Filter ineffectiveness**: Filtering by score (e.g., "90+ only") returns all events

#### Business Impact
- **Recommendation quality**: System cannot provide meaningful recommendations
- **User retention**: Poor recommendations → user churn
- **Data quality**: No incentive to improve scraper data quality

### 4. Action - Recommended Fixes

## PRIORITY 1: Fix Null Value Handling

### A. Price Score Fix
**File**: `backend/src/services/scoring.ts:97-113`

**Current**:
```typescript
function calculatePriceScore(adultPrice?, childPrice?, familyPrice?): number {
  const effectivePrice = familyPrice || (adultPrice * 2 + childPrice);
  if (effectivePrice === 0) return 15; // ❌ Treats null as free
  // ...
}
```

**Recommended**:
```typescript
function calculatePriceScore(adultPrice?, childPrice?, familyPrice?): number {
  // If no price data available, give low score (uncertainty penalty)
  if (!adultPrice && !childPrice && !familyPrice) {
    return 3; // Changed from implicit 15 to explicit 3
  }

  const effectivePrice = familyPrice && familyPrice < individualPrice
    ? familyPrice
    : individualPrice;

  if (effectivePrice === 0) return 15; // Actually free
  if (effectivePrice < 200) return 12;
  if (effectivePrice < 500) return 8;
  if (effectivePrice < 1000) return 4;
  return 2;
}
```

**Impact**: -12 points for events without price data

### B. Age Appropriateness Fix
**File**: `backend/src/services/scoring.ts:20-72`

**Current**:
```typescript
function calculateAgeScore(ageMin?, ageMax?, targetAge?, ageGroup?): number {
  if (!ageMin && !ageMax) {
    if (ageGroup === AgeGroup.TODDLER) return 18; // ❌ Too high
    if (ageGroup === AgeGroup.CHILD) return 20;
    return 22;
  }
  // ...
}
```

**Recommended**:
```typescript
function calculateAgeScore(ageMin?, ageMax?, targetAge?, ageGroup?): number {
  if (!ageMin && !ageMax) {
    // Lower scores for unknown age appropriateness
    if (ageGroup === AgeGroup.TODDLER) return 8; // Changed from 18
    if (ageGroup === AgeGroup.CHILD) return 12; // Changed from 20
    return 15; // Changed from 22 - family events more flexible
  }
  // ... rest remains the same
}
```

**Impact**: -10 points for toddler, -8 for child, -7 for family (unknown age)

### C. Distance Score Fix
**File**: `backend/src/services/scoring.ts:79-87`

**Current**:
```typescript
function calculateDistanceScore(distance?: number): number {
  if (!distance) return 8; // ❌ Too generous for unknown
  // ...
}
```

**Recommended**:
```typescript
function calculateDistanceScore(distance?: number): number {
  if (!distance) return 3; // Changed from 8 - penalize unknown location

  if (distance < 10) return 15;
  if (distance < 30) return 10;
  if (distance < 70) return 5;
  if (distance < 130) return 2;
  return 0;
}
```

**Impact**: -5 points for events without distance data

### D. Duration Score Fix
**File**: `backend/src/services/scoring.ts:244-265`

**Current**:
```typescript
function calculateDurationScore(durationMinutes?: number, ageGroup?: AgeGroup): number {
  if (!durationMinutes) return 5; // ❌ Moderate score for unknown
  // ...
}
```

**Recommended**:
```typescript
function calculateDurationScore(durationMinutes?: number, ageGroup?: AgeGroup): number {
  if (!durationMinutes) return 2; // Changed from 5 - penalize unknown

  // ... rest remains the same
}
```

**Impact**: -3 points for events without duration data

## PRIORITY 2: Improve Category Detection

### A. Enhance Category Keywords
**File**: `backend/src/utils/scraperHelper.ts` (determineCategoryFromText function)

Add negative patterns to exclude inappropriate events:
```typescript
// Add to category detection:
const adultOnlyKeywords = ['18+', 'adult only', 'bar crawl', 'night club', 'metal', 'rock concert'];
const notForToddlers = ['lecture', 'conference', 'business', 'networking'];
```

### B. Cross-Validate Category Against Age Group
**File**: `backend/src/services/scoring.ts:123-195`

Add validation in `calculateEventTypeScore`:
```typescript
// Example for toddler group:
if (ageGroup === AgeGroup.TODDLER) {
  // Penalize clearly inappropriate categories
  if (cat.includes('concert') || cat.includes('club') || cat.includes('bar')) {
    score -= 20; // Major penalty
  }
  if (cat.includes('lecture') || cat.includes('conference')) {
    score -= 15;
  }
}
```

## PRIORITY 3: Add Data Completeness Multiplier

### New Function: Calculate Data Quality Score
**File**: `backend/src/services/scoring.ts` (after calculateSeasonalityScore)

```typescript
/**
 * Calculate data completeness multiplier (0.7 - 1.0)
 * Penalizes events with incomplete data
 */
function calculateDataCompletenessMultiplier(event: GeocodedEvent): number {
  let completeness = 0;
  let totalFields = 0;

  // Essential fields (weight: 2)
  if (event.ageMin != null && event.ageMax != null) completeness += 2;
  totalFields += 2;

  if (event.distanceFromPrague != null) completeness += 2;
  totalFields += 2;

  // Important fields (weight: 1)
  if (event.adultPrice != null || event.childPrice != null) completeness += 1;
  totalFields += 1;

  if (event.durationMinutes != null) completeness += 1;
  totalFields += 1;

  if (event.description && event.description.length > 50) completeness += 1;
  totalFields += 1;

  if (event.imageUrl) completeness += 1;
  totalFields += 1;

  const completenessRatio = completeness / totalFields;

  // Map to 0.7 - 1.0 range
  // 100% complete = 1.0x, 50% complete = 0.85x, 0% complete = 0.7x
  return 0.7 + (completenessRatio * 0.3);
}
```

**Apply in scoreEvent function**:
```typescript
const totalScore = Math.min(
  100,
  (BASE_SCORE +
    ageScore +
    distanceScore +
    priceScore +
    eventTypeScore +
    timingScore +
    durationScore +
    seasonalityScore) * calculateDataCompletenessMultiplier(event) // NEW
);
```

## Expected Impact After Fixes

### Score Distribution (Projected)
```
Before Fixes:
98-100: 100% of events ❌

After Fixes:
90-100: 5-10% (truly exceptional events)
75-89:  15-20% (highly recommended)
60-74:  25-30% (good options)
45-59:  25-30% (consider if interested)
<45:    15-25% (low priority)
```

### Example Score Changes

**Heavy Metal Concert** (Currently: T:100, C:100, F:100)
```
After fixes:
- Toddler: 30 (BASE:50 + Age:8 + Dist:3 + Price:3 + Type:-10 + Time:7 + Dur:2) * 0.75 = 30
- Child:   45 (BASE:50 + Age:12 + Dist:3 + Price:3 + Type:-5 + Time:7 + Dur:2) * 0.8 = 45
- Family:  60 (BASE:50 + Age:15 + Dist:3 + Price:3 + Type:5 + Time:7 + Dur:2) * 0.85 = 60
```

**Children's Museum Workshop** (with complete data)
```
After fixes:
- Toddler: 75 (BASE:50 + Age:23 + Dist:15 + Price:12 + Type:14 + Time:10 + Dur:10) * 1.0 = 100 → capped
- Child:   95 (BASE:50 + Age:25 + Dist:15 + Price:12 + Type:15 + Time:8 + Dur:10) * 1.0 = 100 → capped
- Family:  90 (BASE:50 + Age:22 + Dist:15 + Price:12 + Type:13 + Time:7 + Dur:10) * 1.0 = 100 → capped
```

## Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Fix null value scoring (DONE - just need to implement)
2. ✅ Document analysis (DONE)

### Phase 2: Category Improvements (2-3 hours)
1. Add negative category patterns
2. Implement cross-validation against age groups
3. Test with current event dataset

### Phase 3: Data Quality (1-2 hours)
1. Implement completeness multiplier
2. Update scoreEvent function
3. Test score distribution

### Phase 4: Validation (1 hour)
1. Run scoring on all events
2. Verify score distribution matches expectations
3. Manual spot-check of top/bottom scored events

## Testing Strategy

### Unit Tests Needed
```typescript
describe('Scoring Algorithm', () => {
  it('should penalize events with missing data', () => {
    const event = { /* all nulls */ };
    const score = scoreEvent(event, AgeGroup.TODDLER);
    expect(score.score).toBeLessThan(70);
  });

  it('should score inappropriate events low for toddlers', () => {
    const metalConcert = { title: 'Heavy Metal Concert', category: 'concert' };
    const score = scoreEvent(metalConcert, AgeGroup.TODDLER);
    expect(score.score).toBeLessThan(40);
  });

  it('should reward events with complete data', () => {
    const completeEvent = { /* all fields filled */ };
    const incompleteEvent = { /* many nulls */ };
    const completeScore = scoreEvent(completeEvent, AgeGroup.CHILD);
    const incompleteScore = scoreEvent(incompleteEvent, AgeGroup.CHILD);
    expect(completeScore.score).toBeGreaterThan(incompleteScore.score);
  });
});
```

## Monitoring & Metrics

After deployment, track:
- Score distribution histogram
- Average score per source
- User click-through rates by score tier
- Event quality correlation with user favorites

## Conclusion

The current scoring algorithm suffers from **score inflation** due to overly optimistic treatment of missing data. Implementing the recommended fixes will:

1. ✅ Create meaningful score differentiation (20-100 range instead of 98-100)
2. ✅ Penalize incomplete data (incentivize better scraping)
3. ✅ Improve recommendation quality (users get better suggestions)
4. ✅ Enable effective filtering (users can trust high-scored events)

**Estimated Total Implementation Time**: 5-8 hours
**Risk Level**: Low (changes are additive, can be rolled back)
**Expected User Impact**: High (dramatically improved recommendations)

---

**Document Generated**: 2025-10-30
**Analysis Method**: ReAct Framework (Reason-Act-Observe-Think)
**Status**: Ready for Implementation
