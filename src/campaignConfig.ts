export interface CampaignWeek {
  number: number;
  label: string;
  range: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CampaignMonth {
  number: number;
  label: string;
  shortLabel: string;
  weeks: CampaignWeek[];
}

export const CAMPAIGN_MONTHS: CampaignMonth[] = [
  {
    number: 1,
    label: 'กรกฎาคม 2026',
    shortLabel: 'ก.ค. 2026',
    weeks: [
      { number: 1, label: 'สัปดาห์ที่ 1', range: '1 ก.ค. - 10 ก.ค. 2026', startDate: '2026-07-01', endDate: '2026-07-10' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '11 ก.ค. - 17 ก.ค. 2026', startDate: '2026-07-11', endDate: '2026-07-17' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '18 ก.ค. - 24 ก.ค. 2026', startDate: '2026-07-18', endDate: '2026-07-24' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '25 ก.ค. - 31 ก.ค. 2026', startDate: '2026-07-25', endDate: '2026-07-31' }
    ]
  },
  {
    number: 2,
    label: 'สิงหาคม 2026',
    shortLabel: 'ส.ค. 2026',
    weeks: [
      { number: 1, label: 'สัปดาห์ที่ 1', range: '1 ส.ค. - 7 ส.ค. 2026', startDate: '2026-08-01', endDate: '2026-08-07' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '8 ส.ค. - 14 ส.ค. 2026', startDate: '2026-08-08', endDate: '2026-08-14' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '15 ส.ค. - 21 ส.ค. 2026', startDate: '2026-08-15', endDate: '2026-08-21' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '22 ส.ค. - 28 ส.ค. 2026', startDate: '2026-08-22', endDate: '2026-08-28' }
    ]
  },
  {
    number: 3,
    label: 'กันยายน 2026',
    shortLabel: 'ก.ย. 2026',
    weeks: [
      { number: 1, label: 'สัปดาห์ที่ 1', range: '29 ส.ค. - 4 ก.ย. 2026', startDate: '2026-08-29', endDate: '2026-09-04' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '5 ก.ย. - 11 ก.ย. 2026', startDate: '2026-09-05', endDate: '2026-09-11' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '12 ก.ย. - 18 ก.ย. 2026', startDate: '2026-09-12', endDate: '2026-09-18' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '19 ก.ย. - 25 ก.ย. 2026', startDate: '2026-09-19', endDate: '2026-09-25' }
    ]
  },
  {
    number: 4,
    label: 'ตุลาคม 2026',
    shortLabel: 'ต.ค. 2026',
    weeks: [
      { number: 1, label: 'สัปดาห์ที่ 1', range: '26 ก.ย. - 2 ต.ค. 2026', startDate: '2026-09-26', endDate: '2026-10-02' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '3 ต.ค. - 9 ต.ค. 2026', startDate: '2026-10-03', endDate: '2026-10-09' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '10 ต.ค. - 16 ต.ค. 2026', startDate: '2026-10-10', endDate: '2026-10-16' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '17 ต.ค. - 23 ต.ค. 2026', startDate: '2026-10-17', endDate: '2026-10-23' },
      { number: 5, label: 'สัปดาห์ที่ 5', range: '24 ต.ค. - 30 ต.ค. 2026', startDate: '2026-10-24', endDate: '2026-10-30' }
    ]
  },
  {
    number: 5,
    label: 'พฤศจิกายน 2026',
    shortLabel: 'พ.ย. 2026',
    weeks: [
      { number: 1, label: 'สัปดาห์ที่ 1', range: '31 ต.ค. - 6 พ.ย. 2026', startDate: '2026-10-31', endDate: '2026-11-06' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '7 พ.ย. - 13 พ.ย. 2026', startDate: '2026-11-07', endDate: '2026-11-13' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '14 พ.ย. - 20 พ.ย. 2026', startDate: '2026-11-14', endDate: '2026-11-20' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '21 พ.ย. - 27 พ.ย. 2026', startDate: '2026-11-21', endDate: '2026-11-27' }
    ]
  },
  {
    number: 6,
    label: 'ธันวาคม 2026',
    shortLabel: 'ธ.ค. 2026',
    weeks: [
      { number: 1, label: 'สัปดาห์ที่ 1', range: '28 พ.ย. - 4 ธ.ค. 2026', startDate: '2026-11-28', endDate: '2026-12-04' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '5 ธ.ค. - 11 ธ.ค. 2026', startDate: '2026-12-05', endDate: '2026-12-11' }
    ]
  }
];

export const TOTAL_CAMPAIGN_WEEKS = CAMPAIGN_MONTHS.reduce((sum, month) => sum + month.weeks.length, 0);

export function getCampaignMonth(monthNumber: number): CampaignMonth {
  return CAMPAIGN_MONTHS.find((month) => month.number === monthNumber) || CAMPAIGN_MONTHS[0];
}

export function getCampaignWeek(monthNumber: number, weekNumber?: number): CampaignWeek | undefined {
  if (!weekNumber) return undefined;
  return getCampaignMonth(monthNumber).weeks.find((week) => week.number === weekNumber);
}

export function countDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00+07:00`);
  const end = new Date(`${endDate}T00:00:00+07:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function getOpenedCampaignWeeks(asOf = new Date()): Array<{ monthNumber: number; week: CampaignWeek }> {
  const asOfTime = asOf.getTime();
  return CAMPAIGN_MONTHS.flatMap((month) =>
    month.weeks
      .filter((week) => new Date(`${week.startDate}T00:00:00+07:00`).getTime() <= asOfTime)
      .map((week) => ({ monthNumber: month.number, week }))
  );
}

export function getDefaultCampaignMonth(asOf = new Date()): number {
  const current = CAMPAIGN_MONTHS.find((month) => {
    const first = month.weeks[0];
    const last = month.weeks[month.weeks.length - 1];
    const time = asOf.getTime();
    return time >= new Date(`${first.startDate}T00:00:00+07:00`).getTime() &&
      time <= new Date(`${last.endDate}T23:59:59+07:00`).getTime();
  });

  if (current) return current.number;
  if (asOf < new Date(`${CAMPAIGN_MONTHS[0].weeks[0].startDate}T00:00:00+07:00`)) return 1;
  return CAMPAIGN_MONTHS[CAMPAIGN_MONTHS.length - 1].number;
}

export function periodKey(monthNumber: number, weekNumber?: number): string {
  return `${monthNumber}-${weekNumber || 0}`;
}
