type ClerkLikeError = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
  message?: string;
};

export function clerkErrorMessage(err: unknown): string {
  const e = err as ClerkLikeError;
  const first = e?.errors?.[0];
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  if (typeof e?.message === 'string' && e.message) return e.message;
  return 'Unknown error';
}
