export type OverdueDateSummaryItem = {
  date: string;
  count: number;
};

export type OverdueDateSummaryResponse = {
  firstDueDates: OverdueDateSummaryItem[];
  secondDueDates: OverdueDateSummaryItem[];
};
