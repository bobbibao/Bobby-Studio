import {
  Table,
  Column,
  DataType,
  Model as SequelizeModel,
  HasMany,
  CreatedAt,
  UpdatedAt,
  Index,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { ModelStatus } from '@prisma/client';
import { ModelPlanEntitlement } from './model-plan-entitlement.model';

export interface ModelAttributes {
  id: string;
  provider: string;
  displayName: string;
  connectorFunction?: string | null;
  description?: string | null;
  status: ModelStatus;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  pricing?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ModelCreationAttributes = Optional<
  ModelAttributes,
  | 'connectorFunction'
  | 'description'
  | 'status'
  | 'sortOrder'
  | 'metadata'
  | 'pricing'
  | 'createdAt'
  | 'updatedAt'
>;

@Table({
  tableName: 'Model',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Model extends SequelizeModel<ModelAttributes, ModelCreationAttributes> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  provider!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  displayName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  connectorFunction?: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string | null;

  @Index('model_status_idx')
  @Column({
    type: DataType.ENUM(...Object.values(ModelStatus)),
    allowNull: false,
    defaultValue: ModelStatus.active,
  })
  status!: ModelStatus;

  @Index('model_sort_order_idx')
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sortOrder!: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata?: Record<string, unknown> | null;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  pricing?: Record<string, unknown> | null;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updatedAt!: Date;

  @HasMany(() => ModelPlanEntitlement)
  entitlements?: ModelPlanEntitlement[];
}
