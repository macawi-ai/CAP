/**
 * Geographic utilities for aircraft position calculations
 */

const EARTH_RADIUS_MILES = 3959;

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in miles
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
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculate bearing from point 1 to point 2
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = toDegrees(Math.atan2(y, x));
  
  // Normalize to 0-360
  return (bearing + 360) % 360;
}

/**
 * Convert bearing to compass direction
 */
export function bearingToCompass(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Calculate ETA based on distance and ground speed
 * @param distance Distance in miles
 * @param groundSpeed Ground speed in knots
 * @returns ETA in seconds, or null if aircraft is moving away
 */
export function calculateETA(
  distance: number, 
  groundSpeed: number | undefined,
  bearing: number,
  track: number | undefined
): number | null {
  if (!groundSpeed || groundSpeed < 1) return null;
  if (!track) return null;
  
  // Calculate closing angle
  const closingAngle = Math.abs(bearing - (track + 180) % 360);
  
  // If aircraft is moving away (angle > 90 degrees), no ETA
  if (closingAngle > 90 && closingAngle < 270) return null;
  
  // Simple ETA calculation (could be refined with closing speed)
  const timeHours = distance / groundSpeed;
  return Math.round(timeHours * 3600); // Convert to seconds
}

/**
 * Format altitude with flight level notation
 */
export function formatAltitude(altitude: number | undefined): string {
  if (!altitude) return 'GND';
  
  if (altitude >= 18000) {
    return `FL${Math.round(altitude / 100).toString().padStart(3, '0')}`;
  }
  
  return `${altitude.toLocaleString()}ft`;
}

/**
 * Check if aircraft is in pattern around a point
 */
export function isInPattern(
  positions: Array<{lat: number, lon: number, time: number}>,
  centerLat: number,
  centerLon: number,
  radiusMiles: number = 5
): boolean {
  if (positions.length < 4) return false;
  
  // Check if all positions are within radius
  const allWithinRadius = positions.every(pos => 
    calculateDistance(centerLat, centerLon, pos.lat, pos.lon) <= radiusMiles
  );
  
  if (!allWithinRadius) return false;
  
  // Check for turning behavior (simplified)
  let turns = 0;
  for (let i = 2; i < positions.length; i++) {
    const bearing1 = calculateBearing(
      positions[i-2].lat, positions[i-2].lon,
      positions[i-1].lat, positions[i-1].lon
    );
    const bearing2 = calculateBearing(
      positions[i-1].lat, positions[i-1].lon,
      positions[i].lat, positions[i].lon
    );
    
    const turn = Math.abs(bearing2 - bearing1);
    if (turn > 30 && turn < 330) turns++;
  }
  
  return turns >= 2; // At least 2 significant turns
}