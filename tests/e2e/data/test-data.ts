export const invalidEmails = [
  'plainaddress',
  '@missing-user.com',
  'user@',
  'user domain@example.com'
] as const;

export const invalidPasswords = [
  { description: 'without uppercase letter', value: 'example@123' },
  { description: 'without lowercase letter', value: 'EXAMPLE@123' },
  { description: 'without number', value: 'Example@Test' },
  { description: 'without special character', value: 'Example123' }
] as const;

export function uniqueEmail(): string {
  return `qa.automation+${Date.now()}@example.com`;
}
