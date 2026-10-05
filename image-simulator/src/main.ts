import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { loadConfig, readEnv } from './config';
import { createSimulatorServer } from './server';

function main(): void {
  const config = loadConfig(readEnv(join(__dirname, '..')));
  const { server } = createSimulatorServer(config);
  server.listen(config.port, config.host, () => {
    // Never print the key. The banner states what this process is.
    const { port } = server.address() as AddressInfo;
    console.log(`bobby image simulator (simulated inference, not a real provider) listening on http://${config.host}:${port}`);
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'simulator failed to start');
  process.exit(1);
}
