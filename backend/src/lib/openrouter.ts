import OpenAI from 'openai';
import type { ModelId } from '@calmvest/shared';
import { config } from '../config.js';

export const DEFAULT_MODEL: ModelId = 'openai/gpt-5.4-mini';

export function createOpenRouterClient(): OpenAI | null {
  if (!config.OPENROUTER_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: config.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': config.OPENROUTER_SITE_URL,
      'X-OpenRouter-Title': config.OPENROUTER_SITE_NAME,
    },
  });
}

export function getOpenRouterRequestDefaults(model: ModelId = DEFAULT_MODEL) {
  return {
    model,
    reasoning: {
      effort: config.OPENROUTER_REASONING_EFFORT,
      exclude: true,
    },
  };
}
