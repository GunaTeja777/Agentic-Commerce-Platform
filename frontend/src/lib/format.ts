/**
 * Formats a number as Indian Rupee formatted currency string (e.g. 1,26,500).
 * Uses explicit 'en-IN' locale to prevent SSR/Client hydration mismatch.
 */
export function formatINR(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
}
