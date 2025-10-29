/**
 * Weather service using OpenWeatherMap API
 */

import axios from 'axios';
import { WeatherData } from '../types';
import { addDays, format } from 'date-fns';

const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5/forecast';
const PRAGUE_LAT = 50.0755;
const PRAGUE_LON = 14.4378;

// Cache for weather data
let weatherCache: WeatherData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Fetch weather forecast for Prague
 * @returns Array of weather data for next 7 days
 */
export async function fetchWeatherForecast(): Promise<WeatherData[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.warn('OpenWeatherMap API key not configured');
    return [];
  }

  // Check cache
  const now = Date.now();
  if (weatherCache && now - cacheTimestamp < CACHE_DURATION) {
    return weatherCache;
  }

  try {
    const response = await axios.get(OPENWEATHER_API, {
      params: {
        lat: PRAGUE_LAT,
        lon: PRAGUE_LON,
        appid: apiKey,
        units: 'metric',
        cnt: 40, // 5-day forecast (8 per day)
      },
      timeout: 10000,
    });

    const weatherData: WeatherData[] = [];
    const processedDates = new Set<string>();

    if (response.data && response.data.list) {
      for (const item of response.data.list) {
        const date = new Date(item.dt * 1000);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Only keep one entry per day (use midday forecast)
        if (processedDates.has(dateStr)) continue;

        const hour = date.getHours();
        if (hour < 10 || hour > 16) continue; // Skip early morning and evening

        processedDates.add(dateStr);

        const condition = item.weather[0]?.main.toLowerCase() || 'unknown';
        const temperature = item.main.temp;

        // Determine if weather is good for outdoor activities
        const isGoodForOutdoor =
          temperature >= 15 &&
          temperature <= 30 &&
          !condition.includes('rain') &&
          !condition.includes('storm') &&
          !condition.includes('snow');

        weatherData.push({
          date: dateStr,
          temperature,
          condition,
          isGoodForOutdoor,
        });

        if (weatherData.length >= 7) break;
      }
    }

    // Update cache
    weatherCache = weatherData;
    cacheTimestamp = now;

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return weatherCache || [];
  }
}

/**
 * Get weather for a specific date
 * @param date Date to get weather for
 * @returns Weather data or null if not available
 */
export async function getWeatherForDate(date: Date): Promise<WeatherData | null> {
  const forecast = await fetchWeatherForecast();
  const dateStr = format(date, 'yyyy-MM-dd');

  return forecast.find((w) => w.date === dateStr) || null;
}

/**
 * Clear weather cache (useful for testing)
 */
export function clearWeatherCache(): void {
  weatherCache = null;
  cacheTimestamp = 0;
}
