import ProfileSettings from "@/components/profile-settings";
import { TutorialProvider } from "@/components/dashboard-tutorial";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <TutorialProvider><ProfileSettings />{children}</TutorialProvider>;
}
