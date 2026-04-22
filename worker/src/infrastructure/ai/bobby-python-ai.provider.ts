import { Injectable } from '@nestjs/common';
import { ProcessingResult } from '@/shared/interfaces/api-response.interface';
import { ProgressCallback } from '@/shared/interfaces/image-generation.interface';
import {
  PythonModelConnector,
  PythonModelEditParams,
  PythonModelGenerateParams,
  PythonModelResponse,
} from '@/services/connectors/python-model.connector';
import { IAIProvider } from './ai-provider.interface';

@Injectable()
export class BobbyPythonAIProvider implements IAIProvider {
  constructor(private readonly connector: PythonModelConnector) {}

  generateImage(
    params: PythonModelGenerateParams,
    progressCallback: ProgressCallback,
  ): Promise<ProcessingResult<PythonModelResponse>> {
    return this.connector.generateImage(params, progressCallback);
  }

  editImage(
    params: PythonModelEditParams,
    progressCallback: ProgressCallback,
  ): Promise<ProcessingResult<PythonModelResponse>> {
    return this.connector.editImage(params, progressCallback);
  }
}
