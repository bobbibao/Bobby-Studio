import { SUBSCRIPTION_TYPE_BASIC, SUBSCRIPTION_TYPE_PRO, TAB_TYPE_EDIT, TAB_TYPE_GENERATE } from '../constants';

export interface RouteConfig {
  name: string;
  layout: string;
  path: string;
  component: any;
  position: 'top' | 'bottom';
  icon?: any;
  group?: '' | 'tools' | 'workspace' | 'manage';
  navbarHeading?: string;
  extraComponent?: string;
  isLinkDisabled?: boolean;
  isDisabled?: boolean;
  disabledRedirectPath?: string;
  isPublic?: boolean;
  adminOnly?: boolean;
  hideFromSidebar?: boolean;
  children?: RouteConfig[];
  externalUrl?: string;
}

export enum SUBSCRIPTION_TYPE_ENUM {
  BASIC = SUBSCRIPTION_TYPE_BASIC,
  PRO = SUBSCRIPTION_TYPE_PRO,
  GENERATE = TAB_TYPE_GENERATE,
  EDIT = TAB_TYPE_EDIT,
}

export enum PRICING_PLAN_ENUM {
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly',
}

export type OptionType = {
  value: string;
  label: string;
};

export interface IDesignItemResponse {
  path: string;
  title: string;
  subtitle: string;
}

export interface ImageData {
  id?: string;
  key?: string;
  path?: string;
  dimensions?: string;
  folderName?: string;
  projectId?: string;
  thumbnail?: string;
}

export interface CreateProjectParams {
  selectedProjectId?: string;
  projectName: string;
  projectDescription: string;
}

