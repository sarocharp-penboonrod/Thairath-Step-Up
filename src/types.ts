export interface StepLog {
  id: string;
  date: string; // YYYY-MM-DD
  steps: number;
  week: number; // campaign month index (1 to 6)
  weekOfMonth?: number; // submission week within the selected month (1 to 5)
  imageName: string;
  imagePreview?: string;
  submittedAt: string;
}

export interface DepartmentInfo {
  id: string;
  nameTh: string;
  nameEn: string;
  participationRate: number; // percentage (e.g. 95)
  averageStepsPerPerson: number; // steps/day
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
  totalTickets: number; // cumulative tickets across weeks
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
