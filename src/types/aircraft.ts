/**
 * Cyber Air Patrol - Aircraft Types
 * Defining the data structures for aircraft tracking
 */

export interface Aircraft {
  // Identification
  hex: string;          // ICAO 24-bit address
  flight?: string;      // Callsign
  registration?: string; // Tail number
  
  // Aircraft Info
  type?: string;        // Aircraft type (e.g., "B737", "C172")
  category?: string;    // A0-A7 categories
  description?: string; // Human-readable description
  
  // Position
  lat: number;          // Latitude
  lon: number;          // Longitude
  alt_baro?: number;    // Barometric altitude (feet)
  alt_geom?: number;    // Geometric altitude (feet)
  
  // Movement
  gs?: number;          // Ground speed (knots)
  tas?: number;         // True air speed (knots)
  track?: number;       // Track angle (degrees)
  track_rate?: number;  // Rate of change of track
  roll?: number;        // Roll angle (degrees)
  
  // Vertical Movement
  baro_rate?: number;   // Barometric altitude rate (feet/min)
  geom_rate?: number;   // Geometric altitude rate (feet/min)
  
  // Status
  emergency?: string;   // Emergency status
  nav_altitude_mcp?: number; // Selected altitude
  nav_heading?: number; // Selected heading
  squawk?: string;      // Transponder code
  
  // Timing
  seen: number;         // Seconds since last message
  seen_pos?: number;    // Seconds since last position
  
  // Calculated fields (we add these)
  distance?: number;    // Distance from observer (miles)
  bearing?: number;     // Bearing from observer (degrees)
  eta?: number;         // Estimated seconds to overhead
}

export interface TrackingConfig {
  lat: number;          // Observer latitude
  lon: number;          // Observer longitude
  range: number;        // Search radius (miles)
  minAltitude?: number; // Minimum altitude filter
  maxAltitude?: number; // Maximum altitude filter
}

export interface AlertCriteria {
  maxAltitude?: number;     // Alert if below this altitude
  minDistance?: number;     // Alert if closer than this
  aircraftTypes?: string[]; // Alert only for these types
  callsignPatterns?: RegExp[]; // Alert for matching callsigns
}

export enum OutputFormat {
  TEXT = 'text',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  YAML = 'yaml'
}

// Known military/interesting callsigns
export const INTERESTING_CALLSIGNS = {
  STRATCOM: /^(DOOM|KING|ATOM|JAKE)\d+$/,  // E-4B, RC-135, etc
  TANKER: /^(GOLD|BLUE|RED)\d+$/,
  FIGHTER: /^(VIPER|EAGLE|RAPTOR)\d+$/,
  TRAINER: /^(TORCH|TEXAN)\d+$/,
  MEDICAL: /^(LIFE|ANGEL|STAR)\w+$/,
  AGRICULTURAL: /^N\d+AG$/  // Common ag aircraft pattern
};

// Aircraft categories
export const AIRCRAFT_CATEGORIES = {
  HEAVY: ['A124', 'A225', 'A388', 'B744', 'B748', 'B752', 'B763', 'B772', 'B773', 'B77W', 'B788', 'B789'],
  MILITARY: ['C130', 'C17', 'K35R', 'E3', 'E4', 'R135', 'B52', 'F15', 'F16', 'F18', 'F22', 'F35'],
  AGRICULTURAL: ['AT8T', 'AT5T', 'AT4T', 'AT3T', 'M18', 'PA18'],
  HELICOPTER: ['R44', 'R22', 'R66', 'EC30', 'EC35', 'EC45', 'B407', 'UH60', 'AH64'],
  LIGHT: ['C172', 'C152', 'C182', 'PA28', 'PA32', 'BE36', 'SR22']
};