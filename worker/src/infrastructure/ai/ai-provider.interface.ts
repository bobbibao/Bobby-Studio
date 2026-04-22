import { ProcessingResult } from '@/shared/interfaces/api-response.interface';
import { ProgressCallback } from '@/shared/interfaces/image-generation.interface';
import {
  PythonModelEditParams,
  PythonModelGenerateParams,
  PythonModelResponse,
} from '@/services/connectors/python-model.connector';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface IAIProvider {
  generateImage(
    params: PythonModelGenerateParams,
    progressCallback: ProgressCallback,
  ): Promise<ProcessingResult<PythonModelResponse>>;
  editImage(
    params: PythonModelEditParams,
    progressCallback: ProgressCallback,
  ): Promise<ProcessingResult<PythonModelResponse>>;
}
