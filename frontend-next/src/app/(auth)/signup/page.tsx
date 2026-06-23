import SignupClient from "./SignupClient";
import { getSafeNextPath } from "@/lib/authRedirect";

export default function SignupPage({ searchParams }) {
  const safeNext = getSafeNextPath(searchParams?.next);
  return <SignupClient safeNext={safeNext} />;
}
