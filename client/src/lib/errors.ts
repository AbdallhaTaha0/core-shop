export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
