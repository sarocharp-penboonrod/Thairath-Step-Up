export type VerificationStatus = 'AUTO_VERIFIED' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';

export interface StepLog {
  id: string;
  date: string; // YYYY-MM-DD
  steps: number;
  week: number; // campaign month index (1 to 6)
  weekOfMonth?: number; // submission week within the selected month (1 to 5)
  imageName: string;
  imagePreview?: string; // local preview only; never stored in Google Sheets
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
  nameTh: string;
  nameEn: string;
  participationRate: number; // verified submission percentage
  averageStepsPerPerson: number; // verified steps per participating employee
  status: 'up' | 'down' | 'stable';
  statusText: string;
}

export interface ActiveUser {
  name: string;
  surname?: string;
  Surename?: string; // kept for Google Sheets header compatibility
  nickname: string;
  departmentId: string;
  weekTarget: number; // campaign standard: 7000
  totalTickets: number; // derived from verified logs that reach 7,000 steps
  email?: string;
  employeeId?: string;
  age?: number;
  dateOfBirth?: string; // YYYY-MM-DD, used by Google Sheets backend to calculate age and birthdate password
  lastLoginAt?: string; // ISO timestamp from Google Sheets backend
  lastSubmitAt?: string; // ISO timestamp of the latest successful step submission
}

export interface WeekConfig {
  number: number;
  startDate: string;
  endDate: string;
}

export function isVerifiedStatus(status?: VerificationStatus | string): boolean {
  return status === 'AUTO_VERIFIED' || status === 'APPROVED';
}
