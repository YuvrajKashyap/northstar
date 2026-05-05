export function extractGoalActionInstruction(message: string) {
  const actionPrefix = message
    .split(/\b(?:and\s+)?(?:i asked|i ask|is it smart|should i|can i|could i|would it be smart|what do you think|is this smart)\b/i)[0]
    ?.trim();
  const source = actionPrefix && goalActionScore(actionPrefix) > 0 ? actionPrefix : message;
  const clauses = source
    .replace(/\?/g, '.')
    .split(/(?:\.\s+)|(?:;\s+)|(?:\s+and\s+(?=(?:also\s+)?(?:i\s+)?(?:want|need|would like|set|change|update|add|create|track|save|remove|delete|drop|cancel|stop tracking)))/i)
    .map((part) => part.trim().replace(/[,.?!]+$/, ''))
    .filter(Boolean);

  const candidates = clauses
    .map((clause) => ({ clause, score: goalActionScore(clause) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.clause ?? '';
}

function goalActionScore(value: string) {
  const clean = value.toLowerCase();
  if (/\b(vacation|trip|holiday)\b/.test(clean) && !/\b(goal|save|saving|fund|porsche|911|car|purchase)\b/.test(clean)) return 0;
  let score = 0;
  if (/\b(add|create|save|set|update|change|make|track|remove|delete|drop|cancel|stop tracking|stop showing)\b/.test(clean)) score += 4;
  if (/\b(i want|i need|i would like|i actually do know|should be|want it to be)\b/.test(clean)) score += 3;
  if (/\b(goal|target date|timeline|deadline|emergency fund|purchase|save for|saving for)\b/.test(clean)) score += 4;
  if (/\b(porsche|911|car|home|house|retirement|travel|wedding|education|college|business|startup)\b/.test(clean)) score += 2;
  if (/\b(next|this|in \d+|within \d+|by|before|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d{2})\b/.test(clean)) score += 2;
  if (/\b(is it smart|should i|can i|what|why|how)\b/.test(clean) && score < 7) return 0;
  return score >= 6 ? score : 0;
}
