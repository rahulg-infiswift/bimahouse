// frontend/app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { UserRole } from "./lib/roles";
import LoggedOutHome from "./components/LoggedOutHome";
import CustomerHome from "./components/CustomerHome";
import PartnerDashboard from "./components/PartnerDashboard";
import HomePageWrapper from "./components/HomePageWrapper";

async function getUserRole(): Promise<UserRole | null> {
  const { userId, getToken } = await auth();
  if (!userId) return null;
  const token = await getToken();
  if (!token) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const res = await fetch(`${apiBase}/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { role?: UserRole };
  return data.role ?? null;
}

export default async function HomePage() {
  const { userId } = await auth();
  
  // Get user role for Clerk-authenticated users
  const role = userId ? await getUserRole() : null;

  // Use client-side wrapper to handle partner token detection
  // Server can only detect Clerk sessions, not partner localStorage tokens
  return (
    <HomePageWrapper
      clerkUserId={userId ?? null}
      clerkRole={role}
      LoggedOutHome={<LoggedOutHome />}
      CustomerHome={<CustomerHome />}
      PartnerDashboard={<PartnerDashboard />}
    />
  );
}
