import { createInterface } from 'node:readline';

const reader = createInterface({ input: process.stdin });
const lines = reader[Symbol.asyncIterator]();

export async function ask(question: string, fallback = '') {
  process.stdout.write(`${question} `);
  const { value, done } = await lines.next();
  return (done ? '' : String(value).trim()) || fallback;
}

export const closePrompt = () => reader.close();
