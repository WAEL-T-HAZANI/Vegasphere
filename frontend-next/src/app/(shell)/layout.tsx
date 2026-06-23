import DashboardLayout from "@/components/layout/DashboardLayout";

/** Layout for logged-in routes — wraps `DashboardLayout`. */
export default function DashboardRouteLayout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
