import type {
  CatalogResponse,
  CreditBalance,
  GenerationSnapshot,
  UploadResponse,
} from '../contracts';
import type { SchedulerApi } from '../scheduler/types';

/** Everything the studio hooks need from the network, so tests can substitute the boundary. */
export interface StudioApi extends SchedulerApi {
  getCatalog(): Promise<CatalogResponse>;
  getCreditBalance(): Promise<CreditBalance>;
  uploadImage(file: File, signal?: AbortSignal): Promise<UploadResponse>;
  getAssetBlob(assetId: string, signal?: AbortSignal): Promise<Blob>;
}

export type { GenerationSnapshot };
