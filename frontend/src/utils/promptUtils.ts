// Shared prompt utility for AI Style editing
export const extractUserPrompt = (fullPrompt: string): string => {
  const seasonPromptPattern = new RegExp(`Change season to (spring|summer|autumn|winter)\\.?`, 'gi');
  const daytimePromptPattern = new RegExp(`Change daytime to (day|night|morning|evening)\\.?`, 'gi');

  // Remove all auto-generated prompts and clean up
  let cleaned = fullPrompt.replace(seasonPromptPattern, '').replace(daytimePromptPattern, '').trim();

  // Remove any leading periods and spaces
  cleaned = cleaned.replace(/^[\.\s]+/, '');

  // Remove any trailing periods and spaces
  cleaned = cleaned.replace(/[\.\s]+$/, '');

  // Remove multiple consecutive periods with spaces
  cleaned = cleaned.replace(/\.\s*\.\s*/g, '. ');

  // Remove standalone periods at the beginning or end
  cleaned = cleaned.replace(/^\.\s*|\s*\.$/g, '');

  return cleaned.trim();
};

export const buildCompletePrompt = (userPrompt: string, season: string | null, daytime: string | null): string => {
  const autoParts: string[] = [];

  if (season) {
    autoParts.push(`Change season to ${season}`);
  }

  if (daytime) {
    autoParts.push(`Change daytime to ${daytime}`);
  }

  const autoPrompt = autoParts.join('. ');

  // Place auto-generated prompts on top, followed by user's custom prompt
  if (autoPrompt && userPrompt) {
    return `${autoPrompt}. ${userPrompt}`;
  } else if (autoPrompt) {
    return autoPrompt;
  } else {
    return userPrompt;
  }
};


