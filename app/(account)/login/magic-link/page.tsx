import { MagicLinkForm } from "./magic-link-form";

export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const errorCode = Array.isArray(params.error)
    ? params.error[0]
    : params.error;

  return (
    <MagicLinkForm
      key={`${email ?? ""}:${errorCode ?? ""}`}
      initialEmail={email}
      errorCode={errorCode}
    />
  );
}
