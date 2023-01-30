
export function todaysDate() {
  const date = new Date();
  const options: any = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}