/**
 * Output formatters for different display modes
 */

import chalk from 'chalk';
import { Aircraft, OutputFormat, AIRCRAFT_CATEGORIES, INTERESTING_CALLSIGNS } from '../types/aircraft';
import { bearingToCompass, formatAltitude } from '../utils/geo';
import { checkSpecialFlight, formatFirstLight } from '../utils/special-flights';

export class Formatter {
  /**
   * Format aircraft data based on requested format
   */
  static format(aircraft: Aircraft[], format: OutputFormat, observerLat: number, observerLon: number): string {
    switch (format) {
      case OutputFormat.JSON:
        return JSON.stringify(aircraft, null, 2);
      
      case OutputFormat.TEXT:
        return this.formatText(aircraft);
      
      case OutputFormat.HTML:
        return this.formatHTML(aircraft, observerLat, observerLon);
      
      case OutputFormat.XML:
        return this.formatXML(aircraft);
      
      case OutputFormat.YAML:
        return this.formatYAML(aircraft);
      
      default:
        return this.formatText(aircraft);
    }
  }

  /**
   * Format as human-readable text with colors
   */
  private static formatText(aircraft: Aircraft[]): string {
    if (aircraft.length === 0) {
      return chalk.yellow('No aircraft detected in range\n');
    }

    let output = chalk.bold.cyan(`\n✈️  CYBER AIR PATROL - ${aircraft.length} aircraft in range\n`);
    output += chalk.gray('═'.repeat(80)) + '\n\n';

    for (const ac of aircraft) {
      // Determine aircraft category and apply appropriate styling
      const isHeavy = AIRCRAFT_CATEGORIES.HEAVY.includes(ac.type || '');
      const isMilitary = AIRCRAFT_CATEGORIES.MILITARY.includes(ac.type || '');
      const isAgricultural = AIRCRAFT_CATEGORIES.AGRICULTURAL.includes(ac.type || '');
      const isHelicopter = AIRCRAFT_CATEGORIES.HELICOPTER.includes(ac.type || '');
      
      let callsignColor = chalk.white;
      let icon = '✈️';
      
      if (isMilitary) {
        callsignColor = chalk.green;
        icon = '🛩️';
      } else if (isHeavy) {
        callsignColor = chalk.magenta;
        icon = '🛫';
      } else if (isAgricultural) {
        callsignColor = chalk.yellow;
        icon = '🚁';
      } else if (isHelicopter) {
        callsignColor = chalk.cyan;
        icon = '🚁';
      }

      // Check for interesting callsigns
      let specialNote = '';
      const specialFlight = checkSpecialFlight(ac.flight);
      
      if (specialFlight) {
        // AAL3283 gets rainbow treatment!
        if (specialFlight.color === 'rainbow') {
          const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];
          const text = specialFlight.message;
          specialNote = '\n   ' + text.split('').map((char, i) => colors[i % colors.length](char)).join('');
        } else {
          specialNote = chalk.bgMagenta.white(` ${specialFlight.message} `);
        }
      } else if (ac.flight) {
        for (const [type, pattern] of Object.entries(INTERESTING_CALLSIGNS)) {
          if (pattern.test(ac.flight)) {
            specialNote = chalk.bgRed.white(` ${type} `);
            break;
          }
        }
      }

      // Main info line
      output += `${icon} ${callsignColor.bold(ac.flight || 'NO CALLSIGN')} ${specialNote}\n`;
      
      // Aircraft details
      if (ac.registration) {
        output += chalk.gray(`   Reg: ${ac.registration}`);
      }
      if (ac.type) {
        output += chalk.gray(` | Type: ${ac.type}`);
      }
      if (ac.description) {
        output += chalk.gray(` (${ac.description})`);
      }
      output += '\n';

      // Position and movement
      output += `   ${chalk.yellow(formatAltitude(ac.alt_baro || ac.alt_geom))}`;
      
      if (ac.gs) {
        output += chalk.gray(` | ${ac.gs}kts`);
      }
      
      if (ac.track !== undefined) {
        output += chalk.gray(` | HDG ${Math.round(ac.track)}°`);
      }
      
      if (ac.baro_rate) {
        const rateSymbol = ac.baro_rate > 0 ? '↑' : '↓';
        output += chalk.gray(` | ${rateSymbol}${Math.abs(ac.baro_rate)}fpm`);
      }
      output += '\n';

      // Distance and bearing
      if (ac.distance !== undefined && ac.bearing !== undefined) {
        output += `   ${chalk.blue(`${ac.distance.toFixed(1)}mi`)} `;
        output += chalk.gray(`${bearingToCompass(ac.bearing)} (${Math.round(ac.bearing)}°)`);
        
        if (ac.eta) {
          const minutes = Math.floor(ac.eta / 60);
          const seconds = ac.eta % 60;
          output += chalk.red(` | ETA ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }
      output += '\n';

      // Special status
      if (ac.emergency) {
        output += chalk.bgRed.white(`   ⚠️  EMERGENCY: ${ac.emergency}`) + '\n';
      }
      if (ac.squawk === '7700') {
        output += chalk.bgRed.white('   ⚠️  SQUAWK 7700 - EMERGENCY') + '\n';
      }
      if (ac.squawk === '7600') {
        output += chalk.bgYellow.black('   ⚠️  SQUAWK 7600 - RADIO FAILURE') + '\n';
      }
      if (ac.squawk === '7500') {
        output += chalk.bgRed.white('   ⚠️  SQUAWK 7500 - HIJACK') + '\n';
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Format as HTML
   */
  private static formatHTML(aircraft: Aircraft[], observerLat: number, observerLon: number): string {
    const timestamp = new Date().toISOString();
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Cyber Air Patrol - Aircraft Report</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; }
    .aircraft { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .military { border-left: 5px solid #27ae60; }
    .heavy { border-left: 5px solid #9b59b6; }
    .agricultural { border-left: 5px solid #f39c12; }
    .emergency { background: #e74c3c; color: white; }
    .callsign { font-size: 1.2em; font-weight: bold; }
    .details { color: #7f8c8d; margin: 5px 0; }
    .position { color: #3498db; }
    .eta { color: #e74c3c; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛩️ Cyber Air Patrol</h1>
    <p>Aircraft Report - ${timestamp}</p>
    <p>Observer: ${observerLat.toFixed(4)}°, ${observerLon.toFixed(4)}°</p>
    <p>Total Aircraft: ${aircraft.length}</p>
  </div>`;

    for (const ac of aircraft) {
      const classes = ['aircraft'];
      if (AIRCRAFT_CATEGORIES.MILITARY.includes(ac.type || '')) classes.push('military');
      if (AIRCRAFT_CATEGORIES.HEAVY.includes(ac.type || '')) classes.push('heavy');
      if (AIRCRAFT_CATEGORIES.AGRICULTURAL.includes(ac.type || '')) classes.push('agricultural');
      if (ac.emergency || ['7700', '7600', '7500'].includes(ac.squawk || '')) classes.push('emergency');

      html += `
  <div class="${classes.join(' ')}">
    <div class="callsign">${ac.flight || 'NO CALLSIGN'} ${ac.registration ? `(${ac.registration})` : ''}</div>
    <div class="details">Type: ${ac.type || 'Unknown'} ${ac.description ? `- ${ac.description}` : ''}</div>
    <div class="position">
      ${formatAltitude(ac.alt_baro || ac.alt_geom)} | 
      ${ac.gs || 0}kts | 
      HDG ${ac.track || 0}° | 
      ${ac.distance?.toFixed(1) || '?'}mi ${bearingToCompass(ac.bearing || 0)}
      ${ac.eta ? `<span class="eta">ETA ${Math.floor(ac.eta/60)}:${(ac.eta%60).toString().padStart(2,'0')}</span>` : ''}
    </div>
  </div>`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Format as XML
   */
  private static formatXML(aircraft: Aircraft[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<aircraft_report>\n';
    xml += `  <timestamp>${new Date().toISOString()}</timestamp>\n`;
    xml += `  <aircraft_count>${aircraft.length}</aircraft_count>\n`;
    xml += '  <aircraft>\n';

    for (const ac of aircraft) {
      xml += '    <plane>\n';
      xml += `      <hex>${ac.hex}</hex>\n`;
      if (ac.flight) xml += `      <callsign>${ac.flight}</callsign>\n`;
      if (ac.registration) xml += `      <registration>${ac.registration}</registration>\n`;
      if (ac.type) xml += `      <type>${ac.type}</type>\n`;
      xml += `      <position lat="${ac.lat}" lon="${ac.lon}"/>\n`;
      if (ac.alt_baro) xml += `      <altitude>${ac.alt_baro}</altitude>\n`;
      if (ac.gs) xml += `      <ground_speed>${ac.gs}</ground_speed>\n`;
      if (ac.distance) xml += `      <distance>${ac.distance.toFixed(2)}</distance>\n`;
      xml += '    </plane>\n';
    }

    xml += '  </aircraft>\n</aircraft_report>';
    return xml;
  }

  /**
   * Format as YAML
   */
  private static formatYAML(aircraft: Aircraft[]): string {
    let yaml = `# Cyber Air Patrol Aircraft Report
# Generated: ${new Date().toISOString()}
aircraft_count: ${aircraft.length}
aircraft:`;

    for (const ac of aircraft) {
      yaml += `
  - hex: "${ac.hex}"`;
      if (ac.flight) yaml += `\n    callsign: "${ac.flight}"`;
      if (ac.registration) yaml += `\n    registration: "${ac.registration}"`;
      if (ac.type) yaml += `\n    type: "${ac.type}"`;
      yaml += `\n    position:
      lat: ${ac.lat}
      lon: ${ac.lon}`;
      if (ac.alt_baro) yaml += `\n    altitude: ${ac.alt_baro}`;
      if (ac.gs) yaml += `\n    ground_speed: ${ac.gs}`;
      if (ac.distance) yaml += `\n    distance_miles: ${ac.distance.toFixed(2)}`;
    }

    return yaml;
  }
}