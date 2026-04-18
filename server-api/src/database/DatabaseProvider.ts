import { Sequelize } from 'sequelize-typescript';
import { Model, ModelPlanEntitlement } from './models';
import { Logger, ValidationPipe } from '@nestjs/common';
export default class DatabaseProvider {
  private static instance: Sequelize | null = null;

  private static readonly allModels = [Model, ModelPlanEntitlement];

  public static async initialize(): Promise<void> {
    try {
      Logger.log('Initializing Sequelize database connection');

      const sequelize = DatabaseProvider.createInstance();
      await sequelize.authenticate();
      Logger.log('Sequelize database connection authenticated');

      // Load models
      await DatabaseProvider.loadModels(sequelize);
      Logger.log('Sequelize models loaded successfully');

      DatabaseProvider.instance = sequelize;
    } catch (error) {
      Logger.error('Failed to initialize Sequelize database:', error);
      throw error;
    }
  }

  public static getInstance(): Sequelize {
    if (!DatabaseProvider.instance) {
      throw new Error(
        'DatabaseProvider not initialized. Call initialize() first.',
      );
    }
    return DatabaseProvider.instance;
  }

  private static createInstance(): Sequelize {
    const requiredVars = ['DATABASE_URL'];
    const missingVars: string[] = [];

    for (const v of requiredVars) {
      if (!process.env[v]) {
        missingVars.push(v);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      );
    }

    try {
      const useSsl = process.env.DB_SSL === 'true';
      const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
         dialectOptions: useSsl
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false,
              },
            }
          : {},
        ssl: useSsl,
      });

      // Add models after instance creation
      sequelize.addModels(DatabaseProvider.allModels);

      return sequelize;
    } catch (error) {
      console.error('Failed to create Sequelize instance:', error);
      throw error;
    }
  }

  private static async loadModels(sequelize: Sequelize): Promise<void> {
    try {
      // Models are registered in the Sequelize constructor via the models option
      Logger.log('Models registered with Sequelize');
    } catch (error) {
      Logger.error('Failed to load models:', error);
      throw error;
    }
  }
}
