export interface StepLog {
  id: string;
  date: string; // YYYY-MM-DD
  steps: number;
  week: number; // represents Month index (1 to 6) or historical week sequence
  weekOfMonth?: number; // 1 to 4 inside those months
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
  weekTarget: number; // e.g. 60000
  totalTickets: number; // cumulative tickets across weeks
  email?: string;
  employeeId?: string;
  age?: number;
  dateOfBirth?: string; // YYYY-MM-DD, used by Google Sheets backend to calculate age and birthdate password
}


export interface WeekConfig {
  number: number;
  startDate: string;
  endDate: string;
}
