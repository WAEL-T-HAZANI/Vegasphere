import AuthMarketingLayout from "@/components/marketing/AuthMarketingLayout";
import GuestRouteGuard from "@/components/auth/GuestRouteGuard";

export default function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthMarketingLayout>
      <GuestRouteGuard>{children}</GuestRouteGuard>
    </AuthMarketingLayout>
  );
}
