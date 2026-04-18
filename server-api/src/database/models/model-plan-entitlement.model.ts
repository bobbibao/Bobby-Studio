import {
  Table,
  Column,
  DataType,
  Model as SequelizeModel,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  Index,
  Unique,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { PlanType } from '@prisma/client';
import { Model } from './model.model';

export interface ModelPlanEntitlementAttributes {
  id: string;
  modelId: string;
  plan: PlanType;
  enabled: boolean;
  allowedResolutions: string[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ModelPlanEntitlementCreationAttributes = Optional<
  ModelPlanEntitlementAttributes,
  'id' | 'enabled' | 'allowedResolutions' | 'metadata' | 'createdAt' | 'updatedAt'
>;

@Table({
  tableName: 'ModelPlanEntitlement',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class ModelPlanEntitlement extends SequelizeModel<
  ModelPlanEntitlementAttributes,
  ModelPlanEntitlementCreationAttributes
> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @ForeignKey(() => Model)
  @Unique('uq_model_plan_entitlement')
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  modelId!: string;

  @Unique('uq_model_plan_entitlement')
  @Index('model_plan_entitlement_plan_idx')
  @Column({
    type: DataType.ENUM(...Object.values(PlanType)),
    allowNull: false,
  })
  plan!: PlanType;

  @Index('model_plan_entitlement_enabled_idx')
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  enabled!: boolean;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: false,
    defaultValue: [],
  })
  allowedResolutions!: string[];

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata?: Record<string, unknown> | null;

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

  @BelongsTo(() => Model, { onDelete: 'CASCADE' })
  model?: Model;
}
