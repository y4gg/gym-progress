import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    token?: string | string[];
  }>;
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <ResetPasswordForm
      errorCode={getSearchParam(params.error)}
      token={getSearchParam(params.token)}
    />
  );
}
