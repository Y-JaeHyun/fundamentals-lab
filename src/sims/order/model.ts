export interface OrderSimData {
  prompt: string;
  items: string[];
}

export function validateOrderSim(d: unknown): string[] {
  const x = d as Partial<OrderSimData> | null;
  const errs: string[] = [];
  if (!x || typeof x.prompt !== 'string') errs.push('order: prompt 누락');
  if (!x || !Array.isArray(x.items) || x.items.length < 2) errs.push('order: items 2개 이상');
  else if (new Set(x.items).size !== x.items.length) errs.push('order: items 중복');
  return errs;
}

export const orderQuoted = (): string[] => [];
