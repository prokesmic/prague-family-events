/**
 * Czech price parser utilities
 */

/**
 * Parse Czech price string to number
 * Examples: "100 Kč", "zdarma", "od 50 Kč", "150,-", "free"
 * @param priceStr Price string to parse
 * @returns Price in CZK or 0 if free, null if cannot parse
 */
export function parseCzechPrice(priceStr: string): number | null {
  if (!priceStr) return null;

  const cleaned = priceStr.toLowerCase().trim();

  // Check for free
  if (
    cleaned.includes('zdarma') ||
    cleaned.includes('free') ||
    cleaned.includes('vstup zdarma') ||
    cleaned === '0' ||
    cleaned === '0 kč'
  ) {
    return 0;
  }

  // Remove common Czech price formatting
  // "100 Kč" -> "100"
  // "1 500 Kč" -> "1500"
  // "150,-" -> "150"
  // "od 50 Kč" -> "50"
  let numericStr = cleaned
    .replace(/kč/g, '')
    .replace(/czk/g, '')
    .replace(/,-/g, '')
    .replace(/od\s+/g, '')
    .replace(/do\s+/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.');

  // Extract first number found
  const match = numericStr.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const price = parseFloat(match[1]);
    return isNaN(price) ? null : Math.round(price);
  }

  return null;
}

/**
 * Extract adult and child prices from text
 * @param text Text containing price information
 * @returns Object with adult and child prices
 */
export function extractPrices(text: string): {
  adultPrice?: number;
  childPrice?: number;
  familyPrice?: number;
} {
  const result: { adultPrice?: number; childPrice?: number; familyPrice?: number } = {};

  if (!text) return result;

  const lowerText = text.toLowerCase();

  // Try to find adult price
  const adultPatterns = [
    /dospělí[:\s]+(\d+[,\s]?\d*)\s*kč/i,
    /dospělý[:\s]+(\d+[,\s]?\d*)\s*kč/i,
    /adult[:\s]+(\d+[,\s]?\d*)\s*kč/i,
  ];

  for (const pattern of adultPatterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseCzechPrice(match[1]);
      if (price !== null) {
        result.adultPrice = price;
        break;
      }
    }
  }

  // Try to find child price
  const childPatterns = [
    /děti[:\s]+(\d+[,\s]?\d*)\s*kč/i,
    /dítě[:\s]+(\d+[,\s]?\d*)\s*kč/i,
    /child[:\s]+(\d+[,\s]?\d*)\s*kč/i,
    /do\s+\d+\s+let[:\s]+(\d+[,\s]?\d*)\s*kč/i,
  ];

  for (const pattern of childPatterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseCzechPrice(match[1]);
      if (price !== null) {
        result.childPrice = price;
        break;
      }
    }
  }

  // Try to find family price
  const familyPatterns = [
    /rodin[a-zá]+[:\s]+(\d+[,\s]?\d*)\s*kč/i,
    /family[:\s]+(\d+[,\s]?\d*)\s*kč/i,
  ];

  for (const pattern of familyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseCzechPrice(match[1]);
      if (price !== null) {
        result.familyPrice = price;
        break;
      }
    }
  }

  return result;
}

/**
 * Extract age range from text
 * @param text Text containing age information
 * @returns Object with min and max age
 */
export function extractAgeRange(text: string): { ageMin?: number; ageMax?: number } {
  const result: { ageMin?: number; ageMax?: number } = {};

  if (!text) return result;

  // Patterns like "3-6 let", "od 5 let", "do 12 let"
  const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*let/i);
  if (rangeMatch) {
    result.ageMin = parseInt(rangeMatch[1], 10);
    result.ageMax = parseInt(rangeMatch[2], 10);
    return result;
  }

  const fromMatch = text.match(/od\s+(\d+)\s*let/i);
  if (fromMatch) {
    result.ageMin = parseInt(fromMatch[1], 10);
  }

  const toMatch = text.match(/do\s+(\d+)\s*let/i);
  if (toMatch) {
    result.ageMax = parseInt(toMatch[1], 10);
  }

  return result;
}

/**
 * Calculate the best price for a family (2 adults + 1 child 9yo + 1 toddler 1.5yo)
 * @param adultPrice Price per adult
 * @param childPrice Price per child
 * @param familyPrice Family package price
 * @returns Best price and type
 */
export function calculateFamilyPrice(
  adultPrice?: number,
  childPrice?: number,
  familyPrice?: number
): { total: number; type: 'individual' | 'family'; savings?: number } {
  // Assume toddler under 3 is free
  const individualTotal = (adultPrice || 0) * 2 + (childPrice || 0) * 1;

  if (familyPrice && familyPrice < individualTotal) {
    return {
      total: familyPrice,
      type: 'family',
      savings: individualTotal - familyPrice,
    };
  }

  return {
    total: individualTotal,
    type: 'individual',
  };
}
