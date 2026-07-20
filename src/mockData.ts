import { DepartmentInfo, ActiveUser, StepLog, WeekConfig } from './types';
import { CAMPAIGN_MONTHS } from './campaignConfig';

export const INITIAL_DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'ceo',
    nameTh: 'สายงาน CEO',
    nameEn: 'CEO Office',
    participationRate: 92,
    averageStepsPerPerson: 8250,
    status: 'up',
    statusText: 'เพิ่มขึ้น 1 อันดับ'
  },
  {
    id: 'creative_digital',
    nameTh: 'ฝ่าย Creative Digital Studio',
    nameEn: 'Creative Digital Studio',
    participationRate: 85,
    averageStepsPerPerson: 7300,
    status: 'stable',
    statusText: 'คงที่'
  },
  {
    id: 'mirror',
    nameTh: 'ฝ่าย Mirror',
    nameEn: 'Mirror Editorial',
    participationRate: 80,
    averageStepsPerPerson: 6950,
    status: 'down',
    statusText: 'ลดลง 1 อันดับ'
  },
  {
    id: 'prod_tech_prod',
    nameTh: 'ฝ่าย Product & Technology (Product)',
    nameEn: 'Product & Tech (Product)',
    participationRate: 88,
    averageStepsPerPerson: 7850,
    status: 'up',
    statusText: 'เพิ่มขึ้น 2 อันดับ'
  },
  {
    id: 'prod_tech_tech',
    nameTh: 'ฝ่าย Product & Technology (Tech)',
    nameEn: 'Product & Tech (Tech)',
    participationRate: 90,
    averageStepsPerPerson: 8100,
    status: 'up',
    statusText: 'เพิ่มขึ้น 3 อันดับ'
  },
  {
    id: 'tr_creative',
    nameTh: 'ฝ่าย Thairath Creative',
    nameEn: 'Thairath Creative',
    participationRate: 84,
    averageStepsPerPerson: 7200,
    status: 'stable',
    statusText: 'คงที่'
  },
  {
    id: 'tr_money',
    nameTh: 'ฝ่าย Thairath Money',
    nameEn: 'Thairath Money',
    participationRate: 86,
    averageStepsPerPerson: 7420,
    status: 'stable',
    statusText: 'คงที่'
  },
  {
    id: 'marketing',
    nameTh: 'ฝ่ายการตลาด',
    nameEn: 'Marketing Department',
    participationRate: 78,
    averageStepsPerPerson: 6800,
    status: 'down',
    statusText: 'ลดลง 1 อันดับ'
  },
  {
    id: 'event',
    nameTh: 'ฝ่าย Event',
    nameEn: 'Event Department',
    participationRate: 82,
    averageStepsPerPerson: 7600,
    status: 'up',
    statusText: 'เพิ่มขึ้น 1 อันดับ'
  },
  {
    id: 'editorial_online',
    nameTh: 'ฝ่ายบรรณาธิการออนไลน์',
    nameEn: 'Online Editorial',
    participationRate: 89,
    averageStepsPerPerson: 7900,
    status: 'stable',
    statusText: 'คงที่'
  },
  {
    id: 'business_dev',
    nameTh: 'ฝ่ายพัฒนาธุรกิจ',
    nameEn: 'Business Development',
    participationRate: 75,
    averageStepsPerPerson: 6500,
    status: 'down',
    statusText: 'ลดลง 2 อันดับ'
  },
  {
    id: 'thairath_plus',
    nameTh: 'ฝ่ายไทยรัฐพลัส',
    nameEn: 'Thairath Plus',
    participationRate: 81,
    averageStepsPerPerson: 7120,
    status: 'stable',
    statusText: 'คงที่'
  },
  {
    id: 'sales_private_1',
    nameTh: 'ฝ่ายขายเอกชน 1',
    nameEn: 'Enterprise Sales 1',
    participationRate: 77,
    averageStepsPerPerson: 6700,
    status: 'down',
    statusText: 'ลดลง 1 อันดับ'
  },
  {
    id: 'sales_private_2',
    nameTh: 'ฝ่ายขายเอกชน 2',
    nameEn: 'Enterprise Sales 2',
    participationRate: 79,
    averageStepsPerPerson: 6920,
    status: 'up',
    statusText: 'เพิ่มขึ้น 1 อันดับ'
  },
  {
    id: 'sales_private_3',
    nameTh: 'ฝ่ายขายเอกชน 3',
    nameEn: 'Enterprise Sales 3',
    participationRate: 74,
    averageStepsPerPerson: 6450,
    status: 'stable',
    statusText: 'คงที่'
  },
  {
    id: 'sales_operation',
    nameTh: 'ส่วนงาน Sales Operation',
    nameEn: 'Sales Operations Group',
    participationRate: 83,
    averageStepsPerPerson: 7350,
    status: 'up',
    statusText: 'เพิ่มขึ้น 1 อันดับ'
  },
  {
    id: 'safety_she',
    nameTh: 'ฝ่ายความปลอดภัยอาชีวอนามัยและสภาพแวดล้อมในการทำงาน',
    nameEn: 'Safety & SHE Department',
    participationRate: 94,
    averageStepsPerPerson: 8950,
    status: 'stable',
    statusText: 'คงที่อันดับ 1'
  },
  {
    id: 'sales_gov',
    nameTh: 'ฝ่ายขายราชการ',
    nameEn: 'Government Sales',
    participationRate: 76,
    averageStepsPerPerson: 6600,
    status: 'down',
    statusText: 'ลดลง 1 อันดับ'
  }
];

export const INITIAL_USER: ActiveUser = {
  name: 'คุณวรพงษ์ (เบ)',
  nickname: 'เบ',
  departmentId: 'prod_tech_tech',
  weekTarget: 60000,
  totalTickets: 5
};

export const INITIAL_STEP_LOGS: StepLog[] = [
  // User submissions for Week 2 adding up to exactly 45,210
  {
    id: 'log-1',
    date: '2026-05-24', // Sunday of Week 2
    steps: 8420,
    week: 2,
    imageName: 'health_tracker_sunday.png',
    submittedAt: '2026-05-24T18:30:00Z'
  },
  {
    id: 'log-2',
    date: '2026-05-25', // Monday of Week 2
    steps: 7950,
    week: 2,
    imageName: 'apple_health_mon.png',
    submittedAt: '2026-05-25T19:15:00Z'
  },
  {
    id: 'log-3',
    date: '2026-05-26', // Tuesday of Week 2
    steps: 11200,
    week: 2,
    imageName: 'google_fit_tue.png',
    submittedAt: '2026-05-26T20:02:00Z'
  },
  {
    id: 'log-4',
    date: '2026-05-27', // Wednesday of Week 2
    steps: 9140,
    week: 2,
    imageName: 'screenshot_wed.png',
    submittedAt: '2026-05-27T17:45:00Z'
  },
  {
    id: 'log-5',
    date: '2026-05-28', // Thursday of Week 2 (Today)
    steps: 8500,
    week: 2,
    imageName: 'garmin_connect_thurs.png',
    submittedAt: '2026-05-28T15:00:00Z'
  },
  // Week 1 historic logs that brought 4 tickets
  {
    id: 'log-w1-total',
    date: '2026-05-21',
    steps: 62450, // Exceeded 60,000 steps!
    week: 1,
    imageName: 'week1_final_report.png',
    submittedAt: '2026-05-22T10:11:00Z'
  }
];

export const ACTIVE_WEEKS: WeekConfig[] = CAMPAIGN_MONTHS.map((month) => ({
  number: month.number,
  startDate: month.label,
  endDate: ''
}));
