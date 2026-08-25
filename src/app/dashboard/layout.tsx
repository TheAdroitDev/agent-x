import { redirect } from "next/navigation";
import { getCachedSession } from "@/features/auth/lib/session";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64">
        <Header user={session.user} />
        <main className="flex-1 items-start p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
