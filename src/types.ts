import type { StatementCycle } from '@/lib/cycle'

export type { StatementCycle }

export type CycleKey = `${number}-${string}`;

export interface SummaryBucket {
  name: string;
  total: number;
  count: number;
}

export interface CycleSummary {
  cycle: StatementCycle;
  total: number;
  byCategory: SummaryBucket[];
  byMerchant: SummaryBucket[];
  byCard?: { cardId: string; name: string; total: number }[];
}
