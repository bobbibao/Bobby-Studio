import { HistoryJobDto } from '@/actions/history';
import { EDITING_MODELS, GENERATION_MODELS, ModelDefinition } from '@/constants/models';

type ModelAwareJob = Partial<HistoryJobDto> & { actions?: unknown };

const MODEL_LABEL_MAP = (() => {
  const map = new Map<string, string>();
  const register = (definitions: ModelDefinition[]) => {
    definitions.forEach((definition) => {
      map.set(definition.id, definition.label);
    });
  };

  register(GENERATION_MODELS);
  register(EDITING_MODELS);

  return map;
})();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const toIdArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry): entry is string => Boolean(entry));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

const parseActions = (actions: unknown): Record<string, unknown> | undefined => {
  if (!actions) {
    return undefined;
  }
  if (isRecord(actions)) {
    return actions;
  }
  if (typeof actions === 'string') {
    try {
      const parsed = JSON.parse(actions);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const formatFallbackLabel = (modelId: string): string => {
  if (!modelId) return '';
  const normalized = modelId.replace(/[_-]+/g, ' ').trim();
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export const getHistoryJobModelLabels = (job?: ModelAwareJob): string[] => {
  if (!job) {
    return [];
  }

  const resolvedActions = parseActions(job.actions);
  const ids = new Set<string>();
  const addIds = (value: unknown) => {
    toIdArray(value).forEach((id) => ids.add(id));
  };

  addIds(job.selectedModels);
  addIds(job.modelId);

  if (resolvedActions) {
    addIds(resolvedActions.selectedModels);

    const generateParams =
      resolvedActions.generateImageParams && isRecord(resolvedActions.generateImageParams)
        ? resolvedActions.generateImageParams
        : undefined;
    const generateData = generateParams?.data;
    const editParams =
      resolvedActions.editImageParams && isRecord(resolvedActions.editImageParams)
        ? resolvedActions.editImageParams
        : undefined;
    const editData = editParams?.data;

    addIds(generateParams?.selectedModels);
    addIds(isRecord(generateData) ? generateData.selectedModels : undefined);
    addIds(editParams?.selectedModels);
    addIds(isRecord(editData) ? editData.selectedModels : undefined);
    addIds(resolvedActions.data && isRecord(resolvedActions.data) ? resolvedActions.data.selectedModels : undefined);
  }

  return Array.from(ids)
    .map((id) => MODEL_LABEL_MAP.get(id) || formatFallbackLabel(id))
    .filter((label) => Boolean(label));
};

export const mapModelIdsToLabels = (modelIds?: string[]): string[] => {
  if (!modelIds || modelIds.length === 0) {
    return [];
  }

  return modelIds.map((id) => MODEL_LABEL_MAP.get(id) || formatFallbackLabel(id)).filter((label) => Boolean(label));
};


