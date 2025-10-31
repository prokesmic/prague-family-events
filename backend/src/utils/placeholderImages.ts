/**
 * Placeholder images for events without images
 * Uses free images from Unsplash with category-based queries
 */

/**
 * Get a placeholder image URL based on event category
 * Uses Unsplash's source API for free stock photos
 * @param category Event category
 * @param title Event title for better context
 * @returns Placeholder image URL
 */
export function getPlaceholderImage(category?: string, title?: string): string {
  // Map categories to seed numbers for consistent placeholder images
  const categoryImageMap: Record<string, number> = {
    museum: 101,
    theater: 102,
    workshop: 103,
    sport: 104,
    outdoor: 105,
    music: 106,
    exhibition: 107,
    festival: 108,
    cinema: 109,
    park: 110,
    zoo: 111,
    playground: 112,
    educational: 113,
    interactive: 114,
    nature: 115,
    adventure: 116,
    craft: 117,
    science: 118,
    reading: 119,
    default: 100,
  };

  const cat = category?.toLowerCase() || 'default';

  // Find the best matching category
  let seedNumber = categoryImageMap.default;
  for (const [key, value] of Object.entries(categoryImageMap)) {
    if (cat.includes(key)) {
      seedNumber = value;
      break;
    }
  }

  // Use Lorem Picsum for reliable placeholder images
  // Size: 800x600 for good quality, with seed for consistency
  return `https://picsum.photos/seed/${seedNumber}/800/600`;
}

/**
 * Placeholder images from Lorem Picsum (fallback if Unsplash is down)
 * @param seed Seed for consistent images per event
 * @returns Placeholder image URL
 */
export function getPlaceholderImageFallback(seed: string = 'default'): string {
  // Use Lorem Picsum with seed for consistent images
  const seedHash = hashString(seed);
  return `https://picsum.photos/seed/${seedHash}/800/600`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Local placeholder images (as ultimate fallback)
 * These should be stored in the frontend public folder
 */
export const LOCAL_PLACEHOLDER_IMAGES: Record<string, string> = {
  museum: '/placeholders/museum.jpg',
  theater: '/placeholders/theater.jpg',
  workshop: '/placeholders/workshop.jpg',
  sport: '/placeholders/sport.jpg',
  outdoor: '/placeholders/outdoor.jpg',
  default: '/placeholders/default.jpg',
};

export function getLocalPlaceholderImage(category?: string): string {
  const cat = category?.toLowerCase() || 'default';

  for (const [key, value] of Object.entries(LOCAL_PLACEHOLDER_IMAGES)) {
    if (cat.includes(key)) {
      return value;
    }
  }

  return LOCAL_PLACEHOLDER_IMAGES.default;
}
