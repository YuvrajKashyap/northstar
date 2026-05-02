import type { ModelId } from '@calmvest/shared';

export const appConfig = {
  openRouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    siteURL: 'http://localhost:5173',
    siteName: 'CalmVest Agent OS',
    models: {
      default: 'openai/gpt-5.4-mini' satisfies ModelId,
      premium: 'openai/gpt-5.4' satisfies ModelId,
      frontier: 'openai/gpt-5.5' satisfies ModelId,
    },
    reasoning: {
      effort: 'medium',
      exclude: true,
    },
  },
} as const;
