/**
 * ADSBexchange API Client
 * Handles communication with ADSBexchange for aircraft data
 */

import axios, { AxiosInstance } from 'axios';
import { Aircraft, TrackingConfig } from '../types/aircraft';
import { calculateDistance, calculateBearing, calculateETA } from '../utils/geo';

export class ADSBClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = 'https://adsbexchange.com/api/aircraft/v2/') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      headers: {
        'api-auth': apiKey,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Fetch aircraft within range of a point
   */
  async getAircraftInRange(config: TrackingConfig): Promise<Aircraft[]> {
    try {
      // ADSBexchange API endpoint for area search
      const response = await this.client.get('/lat/' + config.lat + '/lon/' + config.lon + '/dist/' + config.range + '/');
      
      if (!response.data || !response.data.aircraft) {
        console.error('No aircraft data in response');
        return [];
      }

      // Process and enhance aircraft data
      const aircraft: Aircraft[] = response.data.aircraft.map((ac: any) => {
        const processed: Aircraft = {
          hex: ac.hex,
          flight: ac.flight?.trim(),
          registration: ac.r,
          type: ac.t,
          category: ac.category,
          description: ac.desc,
          lat: ac.lat,
          lon: ac.lon,
          alt_baro: ac.alt_baro,
          alt_geom: ac.alt_geom,
          gs: ac.gs,
          tas: ac.tas,
          track: ac.track,
          track_rate: ac.track_rate,
          roll: ac.roll,
          baro_rate: ac.baro_rate,
          geom_rate: ac.geom_rate,
          emergency: ac.emergency,
          nav_altitude_mcp: ac.nav_altitude_mcp,
          nav_heading: ac.nav_heading,
          squawk: ac.squawk,
          seen: ac.seen,
          seen_pos: ac.seen_pos
        };

        // Calculate distance and bearing from observer
        if (processed.lat && processed.lon) {
          processed.distance = calculateDistance(
            config.lat, 
            config.lon, 
            processed.lat, 
            processed.lon
          );
          
          processed.bearing = calculateBearing(
            config.lat,
            config.lon,
            processed.lat,
            processed.lon
          );

          // Calculate ETA if aircraft is approaching
          processed.eta = calculateETA(
            processed.distance,
            processed.gs,
            processed.bearing,
            processed.track
          );
        }

        return processed;
      });

      // Filter by altitude if specified
      let filtered = aircraft;
      
      if (config.minAltitude !== undefined) {
        filtered = filtered.filter(ac => 
          (ac.alt_baro || ac.alt_geom || 0) >= config.minAltitude!
        );
      }
      
      if (config.maxAltitude !== undefined) {
        filtered = filtered.filter(ac => 
          (ac.alt_baro || ac.alt_geom || 0) <= config.maxAltitude!
        );
      }

      // Sort by distance
      filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));

      return filtered;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your ADSBexchange credentials.');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a single aircraft by hex code
   */
  async getAircraftByHex(hex: string): Promise<Aircraft | null> {
    try {
      const response = await this.client.get(`/hex/${hex}/`);
      
      if (!response.data || !response.data.aircraft || response.data.aircraft.length === 0) {
        return null;
      }

      const ac = response.data.aircraft[0];
      
      return {
        hex: ac.hex,
        flight: ac.flight?.trim(),
        registration: ac.r,
        type: ac.t,
        category: ac.category,
        description: ac.desc,
        lat: ac.lat,
        lon: ac.lon,
        alt_baro: ac.alt_baro,
        alt_geom: ac.alt_geom,
        gs: ac.gs,
        tas: ac.tas,
        track: ac.track,
        track_rate: ac.track_rate,
        roll: ac.roll,
        baro_rate: ac.baro_rate,
        geom_rate: ac.geom_rate,
        emergency: ac.emergency,
        nav_altitude_mcp: ac.nav_altitude_mcp,
        nav_heading: ac.nav_heading,
        squawk: ac.squawk,
        seen: ac.seen,
        seen_pos: ac.seen_pos
      };

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a minimal request
      await this.client.get('/lat/0/lon/0/dist/1/');
      return true;
    } catch (error) {
      return false;
    }
  }
}