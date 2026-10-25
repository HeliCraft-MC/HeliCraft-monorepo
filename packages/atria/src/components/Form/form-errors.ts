function formErrorMessages(error: unknown): string[] {
  if (typeof error === 'string') {
    return error === '' ? [] : [error];
  }
  if (Array.isArray(error)) {
    return error.flatMap((item: unknown) => formErrorMessages(item));
  }
  if (typeof error !== 'object' || error === null) {
    return [];
  }
  if ('message' in error && typeof error.message === 'string') {
    return [error.message];
  }
  return Object.values(error).flatMap((item: unknown) => formErrorMessages(item));
}
function focusInvalidField(element: HTMLFormElement): void {
  const field = element.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (field !== null) {
    let parent = field.parentElement;
    while (parent !== null && parent !== element) {
      if (parent instanceof HTMLDetailsElement) {
        parent.open = true;
      }
      parent = parent.parentElement;
    }
    field.focus();
  }
}
export { formErrorMessages, focusInvalidField };
