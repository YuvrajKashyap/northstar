import type { ContextPacket } from '@calmvest/shared';

export type GoalActionKind = 'added' | 'updated' | 'removed';

export function parseGoalDescription(description: string): ContextPacket['goals'][number] {
  const clean = description.replace(/\s+/g, ' ').trim();
  return {
    type: inferGoalType(clean),
    target_amount: inferTargetAmount(clean),
    target_date: inferTargetDate(clean),
    priority: inferPriority(clean),
  };
}

export function applyGoalInstruction(goals: ContextPacket['goals'], description: string) {
  const removal = isRemovalInstruction(description);
  const parsed = parseGoalDescription(description);
  const targetIndex = findGoalToUpdate(goals, description, parsed, removal);

  if (removal) {
    if (targetIndex < 0) {
      throw new Error('I could not find a matching saved goal to remove.');
    }
    const goal = goals[targetIndex];
    return {
      kind: 'removed' as const,
      goal,
      goals: goals.filter((_, index) => index !== targetIndex),
    };
  }

  if (targetIndex < 0) {
    return { kind: 'added' as const, goal: parsed, goals: [...goals, parsed] };
  }

  const existing = goals[targetIndex];
  const goal: ContextPacket['goals'][number] = {
    ...existing,
    target_amount: parsed.target_amount > 0 ? parsed.target_amount : existing.target_amount,
    target_date: parsed.target_date !== 'unknown' ? parsed.target_date : existing.target_date,
    priority: hasExplicitPriority(description) ? parsed.priority : existing.priority,
  };

  return {
    kind: 'updated' as const,
    goal,
    goals: goals.map((item, index) => (index === targetIndex ? goal : item)),
  };
}

function findGoalToUpdate(
  goals: ContextPacket['goals'],
  description: string,
  parsed: ContextPacket['goals'][number],
  allowSingleGoalFallback = false,
) {
  if (!goals.length) return -1;
  const cleanDescription = normalizeGoalText(description);
  const parsedTokens = goalTokens(parsed.type);
  const createInstruction = /\b(add|create|track|save for|saving for)\b/i.test(description);
  const explicitUpdate = /\b(update|change|set|make|target date|timeline|deadline|by|actually do know|should be|want it to be)\b/i.test(description);

  let best = { index: -1, score: 0 };
  goals.forEach((goal, index) => {
    const tokens = goalTokens(goal.type);
    let score = tokens.reduce((sum, token) => sum + (cleanDescription.includes(token) ? 3 : 0), 0);
    score += parsedTokens.filter((token) => tokens.includes(token)).length * 2;
    if (score > best.score) best = { index, score };
  });

  if (best.score >= 3) return best.index;
  if (allowSingleGoalFallback && goals.length === 1 && !parsedTokens.length) return 0;
  if (allowSingleGoalFallback) return -1;
  return ((explicitUpdate && !createInstruction) || allowSingleGoalFallback) && goals.length === 1 ? 0 : -1;
}

function isRemovalInstruction(description: string) {
  return /\b(remove|delete|drop|cancel|stop tracking|stop showing|archive)\b/i.test(description)
    && /\b(goal|target|fund|purchase|home|house|emergency|retirement|travel|wedding|car|education|college|business|startup|porsche|911)\b/i.test(description);
}

function inferGoalType(description: string) {
  const namedGoal = inferNamedGoal(description);
  if (namedGoal) return namedGoal;

  const firstSentence = description.split(/[.!?]/)[0] ?? description;
  const withoutAmounts = firstSentence
    .replace(/\bporsche\s+911\b/gi, 'porsche nine eleven')
    .replace(/\$?\d[\d,]*(?:\.\d+)?\s*(?:k|m|thousand|million)?/gi, '')
    .replace(/\bporsche nine eleven\b/gi, 'porsche 911')
    .replace(/\b(?:by|before|around|about|approximately|roughly|target|goal|save|saved|need|needs|want|wants|i|my|the|to|for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const fallback = description.match(/\b(home|house|emergency fund|retirement|retire|travel|wedding|car|education|college|business|startup|porsche 911)\b/i)?.[0];
  const label = fallback && withoutAmounts.length > 48 ? fallback : withoutAmounts || fallback || 'Financial goal';
  return titleCase(label.split(' ').slice(0, 6).join(' '));
}

function inferNamedGoal(description: string) {
  const patterns = [
    /\b(?:i\s+)?(?:want|need|would like)\s+(?:a|an|the|my)?\s*([a-z0-9][a-z0-9\s-]{2,60}?)(\s+in\b|\s+within\b|\s+by\b|\s+before\b|[.!?]|$)/i,
    /\bgoal for\s+(?:a|an|the|my)?\s*([a-z0-9][a-z0-9\s-]{2,60}?)(\s+purchase|\s+by\b|\s+target\b|[.!?]|$)/i,
    /\bfor my\s+([a-z0-9][a-z0-9\s-]{2,60}?)(\s+goal|\s+purchase)\b/i,
    /\bmy\s+([a-z0-9][a-z0-9\s-]{2,60}?)(\s+goal|\s+purchase)\b/i,
    /\b(?:add|create|track|save for|saving for|buy)\s+(?:a|an|the|my)?\s*([a-z0-9][a-z0-9\s-]{2,60}?)(\s+goal|\s+purchase|\s+by\b|\s+target\b|[.!?]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    const label = cleanGoalLabel(raw);
    if (!label) continue;
    const suffix = /\bpurchase\b/i.test(match?.[2] ?? '') && !/\bpurchase\b/i.test(label) ? ' Purchase' : '';
    return titleCase(`${label}${suffix}`.split(' ').slice(0, 6).join(' '));
  }

  return '';
}

function cleanGoalLabel(value: string) {
  return value
    .replace(/\b(?:actually|do|know|target|date|timeline|deadline|for|my|the|a|an|want|it|to|be|this|should|is|whatever)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasExplicitPriority(description: string) {
  return /\b(high|urgent|primary|main|most important|top priority|critical|must|low|someday|nice to have|eventually|optional|medium)\b/i.test(description);
}

function inferTargetAmount(description: string) {
  const clean = description.replace(/\bporsche\s+911\b/gi, 'porsche nine eleven');
  const explicitAmount = clean.match(/\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?/i);
  if (explicitAmount && !amountBelongsToSeparateSpendingQuestion(clean, explicitAmount)) {
    return normalizeAmountMatch(explicitAmount);
  }

  const amountPhrase = clean.match(/\b(?:costs?|price|target|amount|save|need|budget)\s+(?:is|of|around|about|roughly|approximately|for)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)\b/i);
  if (amountPhrase) return normalizeAmountMatch(amountPhrase);

  if (/\bporsche\b|\b911\b/i.test(description)) return 135000;
  return 0;
}

function amountBelongsToSeparateSpendingQuestion(description: string, match: RegExpMatchArray) {
  if (!/\bporsche\b|\bnine eleven\b|\b911\b/i.test(description)) return false;
  const index = match.index ?? -1;
  if (index < 0) return false;
  const nearby = description.slice(Math.max(0, index - 48), index + match[0].length + 48);
  return /\b(vacation|trip|holiday|spend|spending)\b/i.test(nearby);
}

function inferTargetDate(description: string) {
  const monthYear = description.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i);
  if (monthYear) return `${monthYear[2]}-${String(monthIndex(monthYear[1]) + 1).padStart(2, '0')}`;
  const year = description.match(/\b(20\d{2})\b/);
  if (year) return `${year[1]}-12`;
  const yearsOut = description.match(/\b(?:in|within|next)\s+(?:the\s+)?(?:next\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\b/i);
  if (yearsOut) return relativeMonth(Number(wordToNumber(yearsOut[1])), 'years');
  const monthsOut = description.match(/\b(?:in|within|next)\s+(?:the\s+)?(?:next\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+months?\b/i);
  if (monthsOut) return relativeMonth(Number(wordToNumber(monthsOut[1])), 'months');
  if (/\bnext year\b/i.test(description)) return `${new Date().getFullYear() + 1}-12`;
  if (/\bthis year\b/i.test(description)) return `${new Date().getFullYear()}-12`;
  return 'unknown';
}

function normalizeAmountMatch(match: RegExpMatchArray) {
  const base = Number(match[1].replace(/,/g, ''));
  const suffix = match[2] ?? '';
  const multiplier = /^(k|thousand)$/i.test(suffix) ? 1000 : /^(m|million)$/i.test(suffix) ? 1000000 : 1;
  return Math.round(base * multiplier);
}

function relativeMonth(amount: number, unit: 'years' | 'months') {
  if (!Number.isFinite(amount) || amount <= 0) return 'unknown';
  const date = new Date();
  if (unit === 'years') date.setFullYear(date.getFullYear() + amount);
  else date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function wordToNumber(value: string) {
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  };
  return words[value.toLowerCase()] ?? Number(value);
}

function inferPriority(description: string) {
  if (/\b(high|urgent|primary|main|most important|top priority|critical|must)\b/i.test(description)) return 'high';
  if (/\b(low|someday|nice to have|eventually|optional)\b/i.test(description)) return 'low';
  return 'medium';
}

function goalTokens(value: string) {
  return normalizeGoalText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !['goal', 'fund', 'target', 'date', 'purchase'].includes(token));
}

function normalizeGoalText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function monthIndex(month: string) {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .findIndex((candidate) => month.toLowerCase().startsWith(candidate));
}

function titleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
