import DatabaseProvider from './DatabaseProvider';
import { Logger, ValidationPipe } from '@nestjs/common';
import { isDatabaseConfigured } from 'src/shared/utils/env.utils';
class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }

    return DatabaseManager.instance;
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    try {
      Logger.log('Initializing Sequelize database');

      if (!isDatabaseConfigured()) {
        Logger.warn('DATABASE_URL is missing or placeholder. Skipping Sequelize initialization.');
        this.isInitialized = false;
        return;
      }

      await DatabaseProvider.initialize();

      this.isInitialized = true;
      Logger.log('Sequelize database initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize database:', error);
      this.initializationPromise = null; // Reset to allow retry
      throw error;
    }
  }

  // Optional: Method to clear instance (useful for testing/cleanup)
  public static clearInstance(): void {
    DatabaseManager.instance = null;
  }
}

export default DatabaseManager;
