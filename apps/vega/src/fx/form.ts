function fxLots(form: FormData): string {
  const value = form.get('lots');
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,29}$/u.test(value)) {
    throw new Error('Choose positive whole lots');
  }
  return value;
}
export { fxLots };
