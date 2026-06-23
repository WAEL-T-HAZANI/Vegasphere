import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage({ searchParams }) {
  const raw = searchParams?.token;
  const initialToken = typeof raw === "string" ? raw : "";
  return <ResetPasswordClient initialToken={initialToken} />;
}
