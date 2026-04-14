import { getHistoryJobModelLabels, mapModelIdsToLabels } from './modelLabels';

type UnknownRecord = Record<string, any>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const toRecord = (value: unknown): UnknownRecord | undefined => {
  if (!value) {
    return undefined;
  }

  if (isRecord(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(trimmed);
      return toRecord(parsed);
    } catch {
      return undefined;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const record = toRecord(entry);
      if (record) {
        return record;
      }
    }
  }

  return undefined;
};

const pickString = (value?: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
};

const readFields = (source: UnknownRecord | undefined, fields: string[]): string | undefined => {
  if (!source) return undefined;
  for (const field of fields) {
    const value = pickString(source[field]);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const PROMPT_FIELDS = ['prompt', 'enhancedPrompt', 'template', 'description', 'summary'];
const DATA_PROMPT_FIELDS = [...PROMPT_FIELDS, 'promptKeywords', 'title', 'details', 'story', 'narrative', 'notes'];

const PARAM_CANDIDATE_KEYS = [
  'generateImageParams',
  'editImageParams',
  'paintedImageParams',
  'inPaintingParams',
  'outPaintingParams',
  'inPaintingImageParams',
  'outPaintingImageParams',
];

const collectParamRecords = (actions?: UnknownRecord | null): UnknownRecord[] => {
  if (!actions) return [];
  const records: UnknownRecord[] = [];
  PARAM_CANDIDATE_KEYS.forEach((key) => {
    const record = toRecord(actions[key]);
    if (record) {
      records.push(record);
    }
  });
  return records;
};

export const extractPromptFromSources = ({
  jobData,
  matchedAttribute,
}: {
  jobData?: UnknownRecord | null;
  matchedAttribute?: UnknownRecord | null;
}): string | undefined => {
  const jobPrompt =
    readFields(jobData ?? undefined, PROMPT_FIELDS) ||
    readFields(toRecord(jobData?.metadata), PROMPT_FIELDS) ||
    readFields(toRecord(jobData?.generatedImage), DATA_PROMPT_FIELDS);
  if (jobPrompt) return jobPrompt;

  const attributeValue = toRecord(matchedAttribute?.value);
  const attributePrompt =
    readFields(attributeValue, PROMPT_FIELDS) ||
    readFields(toRecord(attributeValue?.metadata), PROMPT_FIELDS) ||
    readFields(toRecord(attributeValue?.generatedImage), DATA_PROMPT_FIELDS);
  if (attributePrompt) return attributePrompt;

  const attributeMetadataPrompt = readFields(toRecord(matchedAttribute?.metadata), PROMPT_FIELDS);
  if (attributeMetadataPrompt) return attributeMetadataPrompt;

  const actions = toRecord(matchedAttribute?.actions);
  const actionPrompt = readFields(actions, PROMPT_FIELDS) || readFields(toRecord(actions?.metadata), PROMPT_FIELDS);
  if (actionPrompt) return actionPrompt;

  const paramRecords = collectParamRecords(actions);
  for (const param of paramRecords) {
    const paramPrompt = readFields(param, PROMPT_FIELDS) || readFields(toRecord(param.metadata), PROMPT_FIELDS);
    if (paramPrompt) return paramPrompt;

    const dataSources = [
      toRecord(param.data),
      ...(Array.isArray(param.steps) ? param.steps.map(toRecord) : []),
      toRecord(param.generateImageParams),
      toRecord(param.editImageParams),
    ];

    for (const data of dataSources) {
      const dataPrompt = readFields(data, DATA_PROMPT_FIELDS);
      if (dataPrompt) return dataPrompt;
    }
  }

  const actionDataPrompt = readFields(toRecord(actions?.data), DATA_PROMPT_FIELDS);
  if (actionDataPrompt) return actionDataPrompt;

  return undefined;
};

const addModelCandidates = (ids: Set<string>, value?: unknown) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => addModelCandidates(ids, entry));
    return;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) ids.add(trimmed);
    return;
  }
  if (typeof value === 'number') {
    ids.add(String(value));
  }
};

const MODEL_VALUE_KEYS = [
  'selectedModels',
  'selectedEditingModels',
  'usedModels',
  'modelId',
  'editingModels',
  'editingModel',
  'baseModel',
  'primaryModel',
  'models',
];

const collectModelsFromRecord = (ids: Set<string>, record?: UnknownRecord) => {
  if (!record) return;
  MODEL_VALUE_KEYS.forEach((key) => addModelCandidates(ids, record[key]));

  if (Array.isArray(record.modelHistory)) {
    record.modelHistory.forEach((entry: unknown) => collectModelsFromRecord(ids, toRecord(entry)));
  }

  const metadata = toRecord(record.metadata);
  if (metadata) {
    collectModelsFromRecord(ids, metadata);
  }
};

export const collectModelLabelsFromAttribute = ({ matchedAttribute }: { matchedAttribute?: UnknownRecord | null }): string[] => {
  const ids = new Set<string>();

  collectModelsFromRecord(ids, toRecord(matchedAttribute?.value));

  const actions = toRecord(matchedAttribute?.actions);
  collectModelsFromRecord(ids, actions);

  const paramRecords = collectParamRecords(actions);
  paramRecords.forEach((param) => {
    collectModelsFromRecord(ids, param);
    const dataSources = [
      toRecord(param.data),
      ...(Array.isArray(param.steps) ? param.steps.map(toRecord) : []),
      toRecord(param.metadata),
    ];
    dataSources.forEach((data) => collectModelsFromRecord(ids, data));
  });

  const dataSources = [toRecord(actions?.data), toRecord(actions?.metadata)];
  dataSources.forEach((data) => collectModelsFromRecord(ids, data));

  return mapModelIdsToLabels(Array.from(ids));
};

export const collectModelLabels = ({
  jobData,
  matchedAttribute,
}: {
  jobData?: UnknownRecord | null;
  matchedAttribute?: UnknownRecord | null;
}): string[] => {
  const jobLabels = jobData ? getHistoryJobModelLabels(jobData) : [];
  if (jobLabels.length > 0) {
    return jobLabels;
  }

  return collectModelLabelsFromAttribute({ matchedAttribute });
};

export const resolveCreatedAt = ({
  jobData,
  matchedAttribute,
}: {
  jobData?: UnknownRecord | null;
  matchedAttribute?: UnknownRecord | null;
}): string | undefined => {
  return jobData?.createdAt ?? matchedAttribute?.createdAt;
};

/**
 * Gets the edit version number from editVersionNumber field.
 * Returns the 0-based version number (editVersionNumber - 1) since the original is version 0.
 * @param editVersionNumber - The 1-based edit version number from the backend
 * @returns The 0-based version number or null if not available
 */
export const getEditVersionNumber = (editVersionNumber?: unknown): number | null => {
  if (editVersionNumber === null || editVersionNumber === undefined) return null;
  if (typeof editVersionNumber === 'number' && Number.isFinite(editVersionNumber)) {
    // editVersionNumber from backend is 1-based, convert to 0-based for display
    // version 1 (original) -> v0, version 2 (first edit) -> v1, etc.
    return Math.max(editVersionNumber - 1, 0);
  }
  if (typeof editVersionNumber === 'string') {
    const parsed = Number(editVersionNumber);
    if (Number.isFinite(parsed)) {
      return Math.max(Math.floor(parsed) - 1, 0);
    }
  }
  return null;
};

/**
 * Gets the edit version label (e.g., "v0", "v1", "v2") from editVersionNumber.
 * @param editVersionNumber - The 1-based edit version number from the backend
 * @returns The version label string or null if not available
 */
export const getEditVersionLabel = (editVersionNumber?: unknown): string | null => {
  const versionNumber = getEditVersionNumber(editVersionNumber);
  if (versionNumber === null) return null;
  return `v${versionNumber}`;
};

