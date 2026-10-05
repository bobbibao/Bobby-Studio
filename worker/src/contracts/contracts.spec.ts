import { readFileSync } from 'fs';
import * as path from 'path';
import { parseQueueMessage, UnsupportedQueueMessageError } from './queue-message';

const fixture = (name: string): Record<string, any> =>
  JSON.parse(readFileSync(path.resolve(__dirname, '../../../contracts/v1', name), 'utf8'));

describe('queue message contract', () => {
  it('accepts the shared fixture', () => {
    expect(parseQueueMessage(fixture('queue-message.json')).jobId).toBe('4e0f6a1b-2c3d-4e5f-8a9b-0c1d2e3f4a5b');
  });

  it.each([
    ['an unknown schema version', (m: Record<string, any>) => (m.schemaVersion = 2)],
    ['a missing job id', (m: Record<string, any>) => delete m.jobId],
    ['an invalid mode', (m: Record<string, any>) => (m.mode = 'video')],
    ['an invalid size', (m: Record<string, any>) => (m.size = { width: 'x' })],
    ['embedded image data', (m: Record<string, any>) => (m.imageBase64 = 'AAAA')],
  ])('rejects %s before any provider call', (_name, mutate) => {
    const message = fixture('queue-message.json');
    mutate(message);
    expect(() => parseQueueMessage(message)).toThrow(UnsupportedQueueMessageError);
  });
});
