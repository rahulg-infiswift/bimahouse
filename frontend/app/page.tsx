// frontend/app/page.tsx
import { auth } from "@clerk/nextjs/server";
import LoggedOutHome from "./components/LoggedOutHome";
import CustomerHome from "./components/CustomerHome";
import PartnerHome from "./components/PartnerHome";
import EmployeeHome from "./components/EmployeeHome";
import HomePageWrapper from "./components/HomePageWrapper";

export default async function HomePage() {
  const { userId } = await auth();

  // Use client-side wrapper to handle partner token detection
  // Server can only detect Clerk sessions, not partner localStorage tokens
  return (
    <HomePageWrapper
      clerkUserId={userId ?? null}
      LoggedOutHome={<LoggedOutHome />}
      CustomerHome={<CustomerHome />}
      PartnerHome={<PartnerHome />}
      EmployeeHome={<EmployeeHome role={null} />}
    />
  );
}
