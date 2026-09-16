export type VerificationStatus = 'AUTO_VERIFIED' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';

export interface StepLog {
  id: string;
  date: string;
  steps: number; // weekly average daily steps shown in the evidence
  week: number; // campaign month index (1 to 6)
  weekOfMonth?: number;
  imageName: string;
  imagePreview?: string;
  imageFileId?: string;
  imageUrl?: string;
  ocrText?: string;
  ocrSteps?: number;
  ocrConfidence?: number;
  verificationStatus: VerificationStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  createdAt?: string;
  updatedAt?: string;
  buIdAtSubmission?: string;
  departmentIdAtSubmission?: string;
}

export interface NewStepLogInput {
  steps: number;
  date: string;
  week: number;
  weekOfMonth: number;
  imageName: string;
  imageData: string;
  imageMimeType: string;
  ocrText?: string;
  ocrSteps?: number;
  ocrConfidence?: number;
}

export interface DepartmentInfo {
  id: string;
  buId: string;
  nameTh: string;
  nameEn: string;
  participationRate: number;
  averageStepsPerPerson: number; // transparency metric; department ranking uses totalSteps
  totalSteps: number; // sum of each participant's verified weekly-average results in the selected period
  memberCount?: number;
  participantCount?: number;
  submittedWeeks?: number;
  status: 'up' | 'down' | 'stable';
  statusText: string;
}

export interface BusinessUnitInfo {
  id: string;
  nameTh: string;
  nameEn: string;
  participationRate: number;
  averageStepsPerPerson: number;
  totalSteps?: number;
  memberCount: number;
  participantCount: number;
  submittedWeeks?: number;
  status: 'up' | 'down' | 'stable';
  statusText: string;
}

export interface LeaderboardData {
  departments: DepartmentInfo[];
  businessUnits: BusinessUnitInfo[];
  generatedAt: string;
}

export interface DepartmentMappingRule {
  sourceBU?: string;
  sourceDepartmentId: string;
  canonicalDepartmentId: string;
  canonicalBU: string;
  active: boolean;
  note?: string;
}


export interface EmployeeRankingOverride {
  employeeId: string;
  targetDepartmentId: string;
  targetBU?: string;
  active: boolean;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface RankingSnapshotRow {
  rankingType: 'BU' | 'DEPARTMENT';
  rank: number;
  buId: string;
  departmentId?: string;
  memberCount: number;
  participantCount: number;
  participationRate: number;
  totalSteps: number;
  averageStepsPerPerson: number;
  metricUsed: 'AVERAGE_STEPS_PER_PERSON' | 'TOTAL_STEPS';
}

export interface RankingSnapshotInput {
  periodLabel: string;
  monthFilter: string;
  weekFilter: string;
  rows: RankingSnapshotRow[];
}

export interface ActiveUser {
  name: string;
  surname?: string;
  Surename?: string;
  nickname: string;
  buId: string;
  departmentId: string;
  weekTarget: number;
  totalTickets: number;
  email?: string;
  employeeId?: string;
  age?: number;
  dateOfBirth?: string;
  lastLoginAt?: string;
  lastSubmitAt?: string;
}

export interface EmployeeLoginResult {
  profile: ActiveUser;
  requiresSetup: boolean;
  logs?: StepLog[];
  leaderboard?: LeaderboardData;
}

export interface AdminSession {
  authenticated: boolean;
  displayName: string;
  allowedBUIds: string[];
}

export interface WeekConfig {
  number: number;
  startDate: string;
  endDate: string;
}

export function isVerifiedStatus(status?: VerificationStatus | string): boolean {
  return status === 'AUTO_VERIFIED' || status === 'APPROVED';
}
