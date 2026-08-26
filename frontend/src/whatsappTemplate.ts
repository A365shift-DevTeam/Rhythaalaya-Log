import { Student } from './types';

export const DEFAULT_WHATSAPP_TEMPLATE = `Dear {parentName} / {studentName},
This is a friendly reminder from {orgName} that the academy fee for {studentName} ({course} · {batch}) is currently due ({amount} outstanding). Please complete the payment at your earliest convenience.
Thank you!`;

export const WHATSAPP_TEMPLATE_VARIABLES = [
  { token: '{studentName}', label: 'Student name' },
  { token: '{parentName}', label: 'Parent name' },
  { token: '{studentId}', label: 'Student ID' },
  { token: '{course}', label: 'Course' },
  { token: '{batch}', label: 'Batch' },
  { token: '{orgName}', label: 'Academy name' },
  { token: '{amount}', label: 'Outstanding amount' },
] as const;

export function renderWhatsAppTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function whatsAppValuesForStudent(student: Student, orgName: string): Record<string, string> {
  const enrollments = student.enrollments.filter((e) => e.status === 'Active');
  return {
    studentName: student.name,
    parentName: student.parentName || student.name,
    studentId: student.studentNumber,
    course: enrollments.map((e) => e.courseName).join(', ') || 'the academy',
    batch: enrollments.map((e) => e.batchName).join(', ') || '—',
    orgName,
    amount: `₹${student.outstandingBalance.toLocaleString('en-IN')}`,
  };
}
