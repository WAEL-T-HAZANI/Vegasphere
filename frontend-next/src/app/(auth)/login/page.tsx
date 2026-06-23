import LoginClient from "./LoginClient";
import { getSafeNextPath } from "@/lib/authRedirect";

export default function LoginPage({ searchParams }) {
  const safeNext = getSafeNextPath(searchParams?.next);
  return <LoginClient safeNext={safeNext} />;
}
