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
  averageStepsPerPerson: number; // average of each participant's verified weekly averages
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
