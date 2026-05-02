import OpenAI from 'openai';
import type { ModelId } from '@calmvest/shared';
import { config } from '../config.js';
import { appConfig } from './app-config.js';

export const DEFAULT_MODEL: ModelId = appConfig.openRouter.models.default;

export function createOpenRouterClient(): OpenAI | null {
  if (!config.OPENROUTER_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: config.OPENROUTER_API_KEY,
    baseURL: appConfig.openRouter.baseURL,
    defaultHeaders: {
      'HTTP-Referer': appConfig.openRouter.siteURL,
      'X-OpenRouter-Title': appConfig.openRouter.siteName,
    },
  });
}

export function getOpenRouterRequestDefaults(model: ModelId = DEFAULT_MODEL) {
  return {
    model,
    reasoning: {
      ...appConfig.openRouter.reasoning,
    },
  };
}
