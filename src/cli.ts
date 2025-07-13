#!/usr/bin/env node

/**
 * Cyber Air Patrol CLI
 * SEE MY PLANES! - Real-time aircraft tracking
 */

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { ADSBClient } from './lib/adsbClient';
import { Formatter } from './lib/formatter';
import { OutputFormat, TrackingConfig } from './types/aircraft';

// Load environment variables
dotenv.config();

const program = new Command();

// ASCII art banner
const banner = chalk.cyan(`
  ____      _               _   _       ____       _             _ 
 / ___|   _| |__   ___ _ __| | / \\  (_)_ __ |  _ \\ __ _| |_ _ __ ___ | |
| |  | | | | '_ \\ / _ \\ '__| |/ _ \\ | | '__|| |_) / _\` | __| '__/ _ \\| |
| |__| |_| | |_) |  __/ |  |_/ ___ \\| | |   |  __/ (_| | |_| | | (_) | |
 \\____\\__, |_.__/ \\___|_|  /_/   \\_\\_|_|   |_|   \\__,_|\\__|_|  \\___/|_|
      |___/                                                             
`);

program
  .name('cap')
  .description('Cyber Air Patrol - Real-time aircraft tracking for aviation awareness')
  .version('0.1.0')
  .option('-l, --lat <latitude>', 'Observer latitude', parseFloat, parseFloat(process.env.DEFAULT_LAT || '41.0'))
  .option('-n, --lon <longitude>', 'Observer longitude', parseFloat, parseFloat(process.env.DEFAULT_LON || '-95.0'))
  .option('-r, --range <miles>', 'Search radius in miles (5-50)', parseFloat, parseFloat(process.env.DEFAULT_RANGE || '10'))
  .option('-f, --format <format>', 'Output format: text, json, xml, html, yaml', 'text')
  .option('--min-alt <feet>', 'Minimum altitude filter', parseInt)
  .option('--max-alt <feet>', 'Maximum altitude filter', parseInt)
  .option('--api-key <key>', 'ADSBexchange API key (or set ADSB_API_KEY env var)')
  .option('--no-banner', 'Suppress banner display')
  .option('--watch', 'Continuous monitoring mode (updates every 30 seconds)')
  .action(async (options) => {
    // Show banner unless suppressed
    if (!options.noBanner && options.format === 'text') {
      console.log(banner);
    }

    // Validate inputs
    if (options.range < 1 || options.range > 50) {
      console.error(chalk.red('Error: Range must be between 1 and 50 miles'));
      process.exit(1);
    }

    // Get API key
    const apiKey = options.apiKey || process.env.ADSB_API_KEY;
    if (!apiKey) {
      console.error(chalk.red('Error: ADSBexchange API key required. Set ADSB_API_KEY environment variable or use --api-key'));
      process.exit(1);
    }

    // Create tracking configuration
    const config: TrackingConfig = {
      lat: options.lat,
      lon: options.lon,
      range: options.range,
      minAltitude: options.minAlt,
      maxAltitude: options.maxAlt
    };

    // Create API client
    const client = new ADSBClient(apiKey, process.env.ADSB_API_URL);

    // Test connection
    if (options.format === 'text') {
      process.stdout.write(chalk.gray('Testing API connection... '));
    }
    
    const connected = await client.testConnection();
    if (!connected) {
      if (options.format === 'text') {
        console.log(chalk.red('FAILED'));
      }
      console.error(chalk.red('Error: Could not connect to ADSBexchange API. Check your API key and network connection.'));
      process.exit(1);
    }
    
    if (options.format === 'text') {
      console.log(chalk.green('OK'));
    }

    // Function to fetch and display aircraft
    const fetchAndDisplay = async () => {
      try {
        if (options.format === 'text') {
          process.stdout.write(chalk.gray(`\nScanning airspace within ${config.range} miles of ${config.lat.toFixed(4)}°, ${config.lon.toFixed(4)}°... `));
        }

        const aircraft = await client.getAircraftInRange(config);
        
        if (options.format === 'text') {
          console.log(chalk.green('DONE'));
        }

        // Format and display output
        const output = Formatter.format(
          aircraft, 
          options.format as OutputFormat,
          config.lat,
          config.lon
        );
        
        console.log(output);

        // Show summary in text mode
        if (options.format === 'text' && aircraft.length > 0) {
          const lowAlt = aircraft.filter(ac => (ac.alt_baro || ac.alt_geom || 0) < 5000);
          const military = aircraft.filter(ac => 
            ac.flight && /^(DOOM|KING|ATOM|JAKE|GOLD|BLUE|RED)\d+$/.test(ac.flight)
          );
          
          if (lowAlt.length > 0) {
            console.log(chalk.yellow(`\n⚠️  ${lowAlt.length} aircraft below 5000ft detected!`));
          }
          
          if (military.length > 0) {
            console.log(chalk.green(`\n🛩️  ${military.length} military aircraft in range`));
          }
        }

      } catch (error) {
        console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`));
        if (!options.watch) {
          process.exit(1);
        }
      }
    };

    // Initial fetch
    await fetchAndDisplay();

    // Watch mode
    if (options.watch) {
      console.log(chalk.cyan('\n👁️  Watch mode enabled. Updates every 30 seconds. Press Ctrl+C to exit.\n'));
      
      setInterval(async () => {
        console.log(chalk.gray(`\n${'─'.repeat(80)}\n`));
        await fetchAndDisplay();
      }, 30000);
    }
  });

// Test command for checking setup
program
  .command('test')
  .description('Test ADSBexchange API connection')
  .option('--api-key <key>', 'ADSBexchange API key (or set ADSB_API_KEY env var)')
  .action(async (options) => {
    console.log(chalk.cyan('Testing Cyber Air Patrol setup...\n'));

    // Check API key
    const apiKey = options.apiKey || process.env.ADSB_API_KEY;
    if (!apiKey) {
      console.log(chalk.red('✗ API Key: NOT FOUND'));
      console.log(chalk.gray('  Set ADSB_API_KEY in .env file or use --api-key option'));
      process.exit(1);
    }
    console.log(chalk.green('✓ API Key: Found'));

    // Test API connection
    const client = new ADSBClient(apiKey);
    process.stdout.write(chalk.gray('Testing API connection... '));
    
    const connected = await client.testConnection();
    if (connected) {
      console.log(chalk.green('OK'));
      console.log(chalk.green('\n✓ All systems operational! Ready to track aircraft.'));
    } else {
      console.log(chalk.red('FAILED'));
      console.log(chalk.red('\n✗ Could not connect to ADSBexchange API.'));
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Display information about Cyber Air Patrol')
  .action(() => {
    console.log(banner);
    console.log(chalk.bold('\nCyber Air Patrol - Aviation Awareness for Everyone\n'));
    console.log('Named in honor of Grandpa Saker and his Civil Air Patrol service.');
    console.log('\nFeatures:');
    console.log('  • Real-time aircraft tracking within 5-50 mile radius');
    console.log('  • Early warning system for low-altitude aircraft');
    console.log('  • Multiple output formats (text, JSON, XML, HTML, YAML)');
    console.log('  • STRATCOM pattern recognition');
    console.log('  • Special highlighting for military and agricultural aircraft');
    console.log('\nFuture: Mobile app "SEE MY PLANES!" for instant aviation awareness');
    console.log('\nBuilt with love by Cy & Synth (Sy)');
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}