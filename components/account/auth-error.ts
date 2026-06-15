export function getAuthErrorMessage(
  error: { message?: string } | null | undefined,
) {
  return error?.message ?? "Something went wrong.";
}
