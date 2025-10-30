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
  // Map categories to Unsplash search terms
  const categoryImageMap: Record<string, string> = {
    museum: 'museum-children',
    theater: 'puppet-theater',
    workshop: 'kids-workshop-art',
    sport: 'children-playing-sports',
    outdoor: 'children-playground',
    music: 'children-music',
    exhibition: 'art-exhibition',
    festival: 'family-festival',
    cinema: 'movie-theater',
    park: 'children-park',
    zoo: 'zoo-animals',
    playground: 'playground',
    educational: 'children-learning',
    interactive: 'kids-interactive',
    nature: 'children-nature',
    adventure: 'kids-adventure',
    craft: 'kids-crafts',
    science: 'science-kids',
    reading: 'children-books',
    default: 'happy-children-family',
  };

  const cat = category?.toLowerCase() || 'default';

  // Find the best matching category
  let searchTerm = categoryImageMap.default;
  for (const [key, value] of Object.entries(categoryImageMap)) {
    if (cat.includes(key)) {
      searchTerm = value;
      break;
    }
  }

  // Use Unsplash Source API for random images
  // Size: 800x600 for good quality
  return `https://source.unsplash.com/800x600/?${searchTerm}`;
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
