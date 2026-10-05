import { describe, expect, it } from 'vitest';
import type { RootState } from '@/store';
import { projectImagesSelector } from './project';

const stateWith = (projects: unknown[]) =>
  ({ projectManagement: { projects, assignedAttributes: [] } }) as unknown as RootState;

describe('projectImagesSelector', () => {
  it('shows an empty project as empty instead of borrowing fabricated imagery', () => {
    const [card] = projectImagesSelector(
      stateWith([{ attributeId: 'p1', createdAt: '2026-01-01T00:00:00Z', value: { title: 'Empty', description: '', folders: [] } }]),
    );
    expect(card).toMatchObject({ projectAttributeId: 'p1', projectTitle: 'Empty', imageId: '', imagePath: '', numberOfImages: 0 });
  });

  it('uses the first real image of a project as its cover', () => {
    const [card] = projectImagesSelector(
      stateWith([
        {
          attributeId: 'p2',
          value: { title: 'With image', folders: [{ name: 'f', images: [{ id: 'img-1', path: '/real/path.png' }] }] },
        },
      ]),
    );
    expect(card).toMatchObject({ imageId: 'img-1', imagePath: '/real/path.png', numberOfImages: 1 });
  });
});
