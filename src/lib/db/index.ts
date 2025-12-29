// Database connection

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '@/lib/utils/logger';

// TODO: Get from environment variables
const connectionString = process.env.DATABASE_URL || '';

// Only create connection if DATABASE_URL is set and not a placeholder
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

const isValidConnectionString = connectionString && 
  connectionString.trim() !== '' && 
  !connectionString.includes('[YOUR-PASSWORD]') &&
  !connectionString.startsWith('https://');

if (isValidConnectionString) {
  try {
    client = postgres(connectionString);
    dbInstance = drizzle(client, { schema });
  } catch (error) {
    logger.error('Failed to create database connection', error);
  }
} else {
  logger.warn('DATABASE_URL not set. Database operations will fail.');
}

// Export db - will be null if not configured, but typed as drizzle instance
// This allows imports to work, but will fail at runtime if used without connection
export const db = dbInstance as ReturnType<typeof drizzle> | null;

// Export client for raw SQL queries when needed
export const dbClient = client;

// Export schema for use in migrations
export { schema };

