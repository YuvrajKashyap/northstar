import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { AgentTraceEvent } from '@calmvest/shared';
import { supabase } from '../lib/supabase.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const traceDir = join(currentDir, '..', 'data', 'traces');

export async function appendTraceEvent(event: AgentTraceEvent): Promise<void> {
  await mkdir(traceDir, { recursive: true });
  const path = join(traceDir, `${event.runId}.jsonl`);
  let previous = '';
  try {
    previous = await readFile(path, 'utf-8');
  } catch {
    previous = '';
  }
  await writeFile(path, `${previous}${JSON.stringify(event)}\n`, 'utf-8');

  const { error } = await supabase
    .from('agent_traces')
    .insert({
      id: event.id,
      run_id: event.runId,
      user_id: typeof event.payload.userId === 'string' ? event.payload.userId : null,
      event_type: event.type,
      agent: event.agent,
      label: event.label,
      payload: event.payload,
      created_at: event.timestamp,
    });

  if (error) {
    return;
  }
}

export function createTraceEvent(
  runId: string,
  type: AgentTraceEvent['type'],
  agent: string,
  label: string,
  payload: Record<string, unknown> = {},
): AgentTraceEvent {
  return {
    id: randomUUID(),
    runId,
    type,
    agent,
    label,
    timestamp: new Date().toISOString(),
    payload,
  };
}
