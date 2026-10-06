import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import UsersPanel from "./users-panel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <UsersPanel />;
}
