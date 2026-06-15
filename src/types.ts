export type CycleKey = `${number}-${string}`;

export interface StatementCycle {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

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
