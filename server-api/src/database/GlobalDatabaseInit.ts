import DatabaseManager from './DatabaseManager';
import { Logger, ValidationPipe } from '@nestjs/common';
let globalInitPromise: Promise<void> | null = null;

export async function ensureGlobalDatabaseInit(): Promise<void> {
  const manager = DatabaseManager.getInstance();

  // Check if already initialized
  if (manager.initialized) {
    return;
  }

  // Return existing promise if initialization is already in progress
  if (globalInitPromise) {
    return globalInitPromise;
  }

  // Start initialization
  globalInitPromise = initializeGlobalDatabase();

  try {
    await globalInitPromise;
  } catch (error) {
    // Reset promise on error to allow retry
    globalInitPromise = null;
    throw error;
  }
}

async function initializeGlobalDatabase(): Promise<void> {
  try {
    Logger.log('Starting global database initialization');

    const manager = DatabaseManager.getInstance();
    await manager.ensureInitialized();

    Logger.log('Global database initialization completed');
  } catch (error) {
    Logger.error('Failed to initialize global database:', error);
    throw error;
  }
}