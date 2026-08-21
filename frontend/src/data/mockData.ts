import { Student, Batch, Transaction, OrgSettings } from '../types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'STU-001',
    name: 'Jane Doe',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNFs-NDGTPnmkyWvBzFOvamg0O_J1Ajyy_15cNX-uhMIHndpxvFCBlraJ_CH_z-YO84NhS_tqTMzuLKajqReJ344dM6pG8Fv_JkUdkYCPpnxtQll5eis06QiWibKAb6vqlfTC46HvuZ6m6naDT-Dlt6DP-o8xSAFZHJUD6hWmDhdJy23nRBkDSP-Oe7NjvBvuXxMsNX_FoU1b8E5hDwBWmEGKFEg7Gog1pXcifbUwPI-0iwx3eZN7tSQ',
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 95,
    phone: '+1 (555) 019-2834',
    email: 'jane.doe@example.com',
    joinDate: '2023-01-15'
  },
  {
    id: 'STU-002',
    name: 'John Smith',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyhjTHhMw6etvAZqXc5W5YAwxabQPXS8WIw2pcCNc1rp1cJDyeLi3uq9ctNAsrerktnewCtlbeVDkL3H16i93tIrC_F4y6_E-VrP2nvRAvakE35eJZ_B_jrYo7znKkaAdaqM37SAkJTsKmuCHH276p5G4EbK0TWnw0BM3QZDCWRUXYA-itrbMmrTa7_fS8JuQIzYIxCuSEvuZTrsoGNIT21Y9ySptnmTNPMjuKx7TNFlnfc21fFiFD1g',
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Pending',
    feeAmount: 150,
    overallAttendance: 88,
    phone: '+1 (555) 018-4921',
    email: 'john.smith@example.com',
    joinDate: '2023-02-10',
    overdueDays: 4
  },
  {
    id: 'STU-003',
    name: 'Emily Wong',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3QZPSCi3H7pgl6eAZ-IS3Tb9q08ezs6OXlbFkEGmgmW5H5vNaPmtS74slqEhlXwjLc6xjY0kfqZEbbOIpIg9gt4Q6D8xy56miS9S_ifA8Gcr8RS5JsER7_tcjMIf0GpPeCgPSKqoCnbcD_a5YrABvyegw8WBsQeUmsV14iPR9VzOOI3pj8vo-SFp-kmeDaAPjaHx8WGGU09k7xoBwQIjtdMfy78HQ2AFlb_PdH_EGaCeNr4YHzPECEg',
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 92,
    phone: '+1 (555) 017-3829',
    email: 'emily.wong@example.com',
    joinDate: '2023-03-01'
  },
  {
    id: 'STU-004',
    name: 'Aria Smith',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1GvOc10bvFzLrh2yzBJSkVHM8EPq_Eg2Gy5uQiuS7qlOHbcsoELfbh2g13svtBJJhrIQnhDuP4CU-cT3hamoJyejHPbWWBh3GgP4e3Qw53G_D4acdT49tX3G_C7X8Po636rlIWlEUkgqFliABSVZ-hDRFthlAvyxaoTwYw_QcKJzbFLq1ArgvVgwrVjJAvOkFHMtZFX74EjK9acH3HnhaqTye0WYpizCQ-iQVKcUChoDCJLF_DCnrNw',
    course: 'Western Dance',
    batch: 'Mon/Wed 5pm',
    feeStatus: 'Paid',
    feeAmount: 160,
    overallAttendance: 98,
    phone: '+1 (555) 012-9988',
    email: 'aria.smith@example.com',
    joinDate: '2023-04-12'
  },
  {
    id: 'STU-005',
    name: 'Julian Rossi',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyhjTHhMw6etvAZqXc5W5YAwxabQPXS8WIw2pcCNc1rp1cJDyeLi3uq9ctNAsrerktnewCtlbeVDkL3H16i93tIrC_F4y6_E-VrP2nvRAvakE35eJZ_B_jrYo7znKkaAdaqM37SAkJTsKmuCHH276p5G4EbK0TWnw0BM3QZDCWRUXYA-itrbMmrTa7_fS8JuQIzYIxCuSEvuZTrsoGNIT21Y9ySptnmTNPMjuKx7TNFlnfc21fFiFD1g',
    course: 'Contemporary',
    batch: 'Tue/Thu 6pm',
    feeStatus: 'Pending',
    feeAmount: 175,
    overallAttendance: 85,
    phone: '+1 (555) 014-7722',
    email: 'julian.rossi@example.com',
    joinDate: '2023-05-20',
    overdueDays: 5
  },
  {
    id: 'STU-006',
    name: 'Maya Patel',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPgnaVDuDFbL-mE4U6PvDycvNQ_macNFMCaib01Xc-iskIjpdR9IQY4yCxZ_YofzVhn4IguN6Fg3CohZnsiXZlLNcU3_HXVKG3AZGm1cEow2OZLckwgypSdKoNmuPx9oi3BCzo9LMq-4L5K0OS3nVk4hoRE8UkuArhaN8TfWQceOJHUiodEX5EaDOD9ByBLRijG1yfnbRf3VzupUb5LbKa5akIcDQ8R3i2jLDhRQshT7u1TaTGceOrPw',
    course: 'Classical Ballet',
    batch: 'Sat/Sun 10am',
    feeStatus: 'Paid',
    feeAmount: 180,
    overallAttendance: 100,
    phone: '+1 (555) 013-4411',
    email: 'maya.patel@example.com',
    joinDate: '2023-01-08'
  },
  {
    id: 'STU-007',
    name: 'Elena Rodriguez',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNFs-NDGTPnmkyWvBzFOvamg0O_J1Ajyy_15cNX-uhMIHndpxvFCBlraJ_CH_z-YO84NhS_tqTMzuLKajqReJ344dM6pG8Fv_JkUdkYCPpnxtQll5eis06QiWibKAb6vqlfTC46HvuZ6m6naDT-Dlt6DP-o8xSAFZHJUD6hWmDhdJy23nRBkDSP-Oe7NjvBvuXxMsNX_FoU1b8E5hDwBWmEGKFEg7Gog1pXcifbUwPI-0iwx3eZN7tSQ',
    course: 'Pilates',
    batch: 'Afternoon Batch - Pilates',
    feeStatus: 'Pending',
    feeAmount: 150,
    overallAttendance: 91,
    phone: '+1 (555) 019-3388',
    email: 'elena.r@example.com',
    joinDate: '2023-06-01',
    overdueDays: 3
  },
  {
    id: 'STU-008',
    name: 'Michael Johnson',
    avatar: undefined,
    course: 'Advanced HIIT',
    batch: 'Evening Batch - Advanced HIIT',
    feeStatus: 'Pending',
    feeAmount: 200,
    overallAttendance: 87,
    phone: '+1 (555) 016-2299',
    email: 'michael.j@example.com',
    joinDate: '2023-07-15',
    overdueDays: 5
  },
  {
    id: 'STU-009',
    name: 'Chloe Smith',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3QZPSCi3H7pgl6eAZ-IS3Tb9q08ezs6OXlbFkEGmgmW5H5vNaPmtS74slqEhlXwjLc6xjY0kfqZEbbOIpIg9gt4Q6D8xy56miS9S_ifA8Gcr8RS5JsER7_tcjMIf0GpPeCgPSKqoCnbcD_a5YrABvyegw8WBsQeUmsV14iPR9VzOOI3pj8vo-SFp-kmeDaAPjaHx8WGGU09k7xoBwQIjtdMfy78HQ2AFlb_PdH_EGaCeNr4YHzPECEg',
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Pending',
    feeAmount: 150,
    overallAttendance: 94,
    phone: '+1 (555) 011-8844',
    email: 'chloe.s@example.com',
    joinDate: '2023-08-01',
    overdueDays: 1
  },
  {
    id: 'STU-010',
    name: 'David Chen',
    avatar: undefined,
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 96,
    phone: '+1 (555) 015-7766',
    email: 'david.chen@example.com',
    joinDate: '2023-02-28'
  },
  {
    id: 'STU-011',
    name: 'Sophia Martinez',
    avatar: undefined,
    course: 'Western Dance',
    batch: 'Mon/Wed 5pm',
    feeStatus: 'Paid',
    feeAmount: 160,
    overallAttendance: 90,
    phone: '+1 (555) 017-1122',
    email: 'sophia.m@example.com',
    joinDate: '2023-03-18'
  },
  {
    id: 'STU-012',
    name: 'Lucas Brown',
    avatar: undefined,
    course: 'Pilates',
    batch: 'Afternoon Batch - Pilates',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 93,
    phone: '+1 (555) 018-3344',
    email: 'lucas.b@example.com',
    joinDate: '2023-04-05'
  },
  {
    id: 'STU-013',
    name: 'Olivia Taylor',
    avatar: undefined,
    course: 'Classical Ballet',
    batch: 'Sat/Sun 10am',
    feeStatus: 'Paid',
    feeAmount: 180,
    overallAttendance: 97,
    phone: '+1 (555) 012-4455',
    email: 'olivia.t@example.com',
    joinDate: '2023-05-11'
  },
  {
    id: 'STU-014',
    name: 'Ethan Davis',
    avatar: undefined,
    course: 'Advanced HIIT',
    batch: 'Evening Batch - Advanced HIIT',
    feeStatus: 'Paid',
    feeAmount: 200,
    overallAttendance: 89,
    phone: '+1 (555) 019-5566',
    email: 'ethan.d@example.com',
    joinDate: '2023-06-22'
  },
  {
    id: 'STU-015',
    name: 'Ava Wilson',
    avatar: undefined,
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 96,
    phone: '+1 (555) 013-6677',
    email: 'ava.w@example.com',
    joinDate: '2023-07-01'
  },
  {
    id: 'STU-016',
    name: 'Noah Jackson',
    avatar: undefined,
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 94,
    phone: '+1 (555) 014-8899',
    email: 'noah.j@example.com',
    joinDate: '2023-07-10'
  },
  {
    id: 'STU-017',
    name: 'Isabella White',
    avatar: undefined,
    course: 'Contemporary',
    batch: 'Tue/Thu 6pm',
    feeStatus: 'Paid',
    feeAmount: 175,
    overallAttendance: 91,
    phone: '+1 (555) 015-9900',
    email: 'isabella.w@example.com',
    joinDate: '2023-08-05'
  },
  {
    id: 'STU-018',
    name: 'Liam Harris',
    avatar: undefined,
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 95,
    phone: '+1 (555) 016-1133',
    email: 'liam.h@example.com',
    joinDate: '2023-08-15'
  },
  {
    id: 'STU-019',
    name: 'Mia Martin',
    avatar: undefined,
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 98,
    phone: '+1 (555) 017-2244',
    email: 'mia.m@example.com',
    joinDate: '2023-09-01'
  },
  {
    id: 'STU-020',
    name: 'Benjamin Clark',
    avatar: undefined,
    course: 'Yoga 101',
    batch: 'Morning Batch - Yoga 101',
    feeStatus: 'Paid',
    feeAmount: 150,
    overallAttendance: 92,
    phone: '+1 (555) 018-5577',
    email: 'ben.c@example.com',
    joinDate: '2023-09-10'
  }
];

export const INITIAL_BATCHES: Batch[] = [
  {
    id: 'b1',
    name: 'Morning Batch - Yoga 101',
    course: 'Yoga 101',
    schedule: 'Mon, Wed, Fri 7:00 AM',
    instructor: 'Sarah Connor',
    monthlyFee: 1500,
    enrolledCount: 20
  },
  {
    id: 'b2',
    name: 'Afternoon Batch - Pilates',
    course: 'Pilates',
    schedule: 'Tue, Thu 2:00 PM',
    instructor: 'Mark Taylor',
    monthlyFee: 1500,
    enrolledCount: 15
  },
  {
    id: 'b3',
    name: 'Evening Batch - Advanced HIIT',
    course: 'Advanced HIIT',
    schedule: 'Mon, Wed 6:30 PM',
    instructor: 'Mark Taylor',
    monthlyFee: 2000,
    enrolledCount: 18
  },
  {
    id: 'b4',
    name: 'Mon/Wed 5pm - Western Dance',
    course: 'Western Dance',
    schedule: 'Mon, Wed 5:00 PM',
    instructor: 'Alex Rivera',
    monthlyFee: 1600,
    enrolledCount: 22
  },
  {
    id: 'b5',
    name: 'Tue/Thu 6pm - Contemporary',
    course: 'Contemporary',
    schedule: 'Tue, Thu 6:00 PM',
    instructor: 'Elena Vance',
    monthlyFee: 1750,
    enrolledCount: 16
  },
  {
    id: 'b6',
    name: 'Sat/Sun 10am - Classical Ballet',
    course: 'Classical Ballet',
    schedule: 'Sat, Sun 10:00 AM',
    instructor: 'Clara Oswald',
    monthlyFee: 1800,
    enrolledCount: 14
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Studio Rent',
    type: 'expense',
    amount: 1200,
    category: 'Rent',
    date: 'Today',
    time: '10:00 AM'
  },
  {
    id: 'tx-2',
    title: 'New Enrollment - Sarah J.',
    type: 'income',
    amount: 450,
    category: 'Fees',
    date: 'Yesterday',
    time: '3:30 PM'
  },
  {
    id: 'tx-3',
    title: 'Instructor Salary - Mark T.',
    type: 'expense',
    amount: 850,
    category: 'Salary',
    date: 'Oct 28',
    time: '9:00 AM'
  },
  {
    id: 'tx-4',
    title: 'Monthly Fee - Group A',
    type: 'income',
    amount: 1150,
    category: 'Fees',
    date: 'Oct 27',
    time: '2:15 PM'
  },
  {
    id: 'tx-5',
    title: 'Equipment Maintenance',
    type: 'expense',
    amount: 250,
    category: 'Misc',
    date: 'Oct 25',
    time: '11:00 AM'
  },
  {
    id: 'tx-6',
    title: 'Bulk Fee Collection - Yoga 101',
    type: 'income',
    amount: 2100,
    category: 'Fees',
    date: 'Oct 24',
    time: '4:00 PM'
  }
];

export const INITIAL_SETTINGS: OrgSettings = {
  name: 'Zenith Yoga Studio',
  type: 'Yoga Studio',
  logoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQL9asqXV93yEWj-ucmlhvasXw8IIEPIXUks0bLMXKnXC7nWGWTkWPUS8iFaGWKHnx_gEHi2TCmAfj00i0LcVfSnVVEis4Jgf2g1TOopmp_u8hJYfpsoSTBZQjxIeyTOdmAhbLALrMKcm_dvDLjCaDioI3cvoY7VnTm2wh8miFe_oyaI4gfzM_UE7hW2R7fo3HINvHIH0TCpGM7AoyHymD25wbb_u98giQLmLx0IjLCaLaGsg5XI1SrQ',
  themeColor: 'purple',
  darkMode: false,
  defaultMonthlyFee: 150,
  feeDueDate: '5th of Month'
};
