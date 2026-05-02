import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContextPacket, DemoSeed } from '@calmvest/shared';

const currentDir = dirname(fileURLToPath(import.meta.url));
const mirrorDir = join(currentDir, '..', 'data', 'mirrors');
const authUsersPath = join(currentDir, '..', 'data', 'auth-users.json');

export type LocalAuthUser = {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
};

async function writeMirror(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
}

export async function mirrorDemoSeed(seed: DemoSeed) {
  await writeMirror(join(mirrorDir, seed.user.id, 'demo-seed.json'), JSON.stringify(seed, null, 2));
}

export async function mirrorMemory(userId: string, memoryMarkdown: string, contextPacket: ContextPacket) {
  const userDir = join(mirrorDir, userId);
  await writeMirror(join(userDir, 'memory.md'), memoryMarkdown);
  await writeMirror(join(userDir, 'context_packet.json'), JSON.stringify(contextPacket, null, 2));
}

export async function readLocalAuthUsers(): Promise<LocalAuthUser[]> {
  try {
    const raw = await readFile(authUsersPath, 'utf-8');
    return JSON.parse(raw) as LocalAuthUser[];
  } catch {
    return [];
  }
}

export async function upsertLocalAuthUser(user: LocalAuthUser) {
  const users = await readLocalAuthUsers();
  const nextUsers = users.filter((candidate) => candidate.email !== user.email);
  nextUsers.push(user);
  nextUsers.sort((a, b) => a.email.localeCompare(b.email));
  await writeMirror(authUsersPath, JSON.stringify(nextUsers, null, 2));
}
