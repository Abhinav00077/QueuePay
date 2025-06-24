import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// SQLite database for offline storage
let sqliteDb: any;

export async function setupDatabase() {
  try {
    // Initialize SQLite database
    sqliteDb = await open({
      filename: './offline_payments.db',
      driver: sqlite3.Database
    });

    // Create offline payments table
    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS offline_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount DECIMAL NOT NULL,
        currency TEXT NOT NULL,
        merchant_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0
      )
    `);

    // Create network status table
    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS network_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        is_online BOOLEAN NOT NULL,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add description column if it doesn't exist (for existing databases)
    try {
      await sqliteDb.exec('ALTER TABLE offline_payments ADD COLUMN description TEXT');
    } catch (error) {
      // Column already exists, ignore error
      console.log('Description column already exists or error adding it:', error);
    }

    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

export function getSqliteDb() {
  if (!sqliteDb) {
    throw new Error('Database not initialized');
  }
  return sqliteDb;
} 