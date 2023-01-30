export function todaysDate() {
  return new Date().toISOString().split('T')[0];
}