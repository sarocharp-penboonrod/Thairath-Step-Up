import { LeaderboardPeriod, StepLog, isVerifiedStatus } from './types';

export interface PersonalRankingSummary {
  totalSteps: number;
  submittedWeeks: number;
  averagePerWeek: number;
}

export function rankingLogTimestamp(log: StepLog): number {
  const value = log.updatedAt || log.reviewedAt || log.submittedAt || log.createdAt || '';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Return one latest verified result per campaign month + week-of-month.
 * This mirrors the contribution rule used by Department Ranking:
 * AUTO_VERIFIED/APPROVED only, then sum each weekly-average value directly.
 */
export function getLatestVerifiedWeeklyLogs(
  stepLogs: StepLog[],
  period: LeaderboardPeriod = 'all'
): StepLog[] {
  const latestByWeek = new Map<string, StepLog>();

  stepLogs
    .filter((log) => isVerifiedStatus(log.verificationStatus))
    .filter((log) => period === 'all' || Number(log.week) === Number(period))
    .forEach((log) => {
      const monthKey = Number(log.week) || 0;
      const weekKey = Number(log.weekOfMonth) || 0;
      // Legacy rows without weekOfMonth stay independent instead of being merged accidentally.
      const slotKey = weekKey > 0 ? `${monthKey}::${weekKey}` : `${monthKey}::${log.id}`;
      const current = latestByWeek.get(slotKey);
      if (!current || rankingLogTimestamp(log) >= rankingLogTimestamp(current)) {
        latestByWeek.set(slotKey, log);
      }
    });

  return Array.from(latestByWeek.values()).sort((a, b) => {
    const monthDiff = (Number(a.week) || 0) - (Number(b.week) || 0);
    if (monthDiff !== 0) return monthDiff;
    const weekDiff = (Number(a.weekOfMonth) || 0) - (Number(b.weekOfMonth) || 0);
    if (weekDiff !== 0) return weekDiff;
    return rankingLogTimestamp(a) - rankingLogTimestamp(b);
  });
}

export function calculatePersonalRankingSummary(
  stepLogs: StepLog[],
  period: LeaderboardPeriod = 'all'
): PersonalRankingSummary {
  const countedLogs = getLatestVerifiedWeeklyLogs(stepLogs, period);
  const totalSteps = countedLogs.reduce((sum, log) => sum + (Number(log.steps) || 0), 0);
  return {
    totalSteps,
    submittedWeeks: countedLogs.length,
    averagePerWeek: countedLogs.length ? Math.round(totalSteps / countedLogs.length) : 0
  };
}
