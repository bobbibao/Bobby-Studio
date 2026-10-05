import { Global, Module } from '@nestjs/common';
import { loadRuntimeConfig, RUNTIME_CONFIG } from './runtime-config';

@Global()
@Module({
  providers: [{ provide: RUNTIME_CONFIG, useFactory: () => loadRuntimeConfig() }],
  exports: [RUNTIME_CONFIG],
})
export class RuntimeConfigModule {}
