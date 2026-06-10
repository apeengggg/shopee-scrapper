import { getCurrentUser } from "@/lib/auth";
import { ConsoleDashboard } from "@/components/console-dashboard";
import { LoginForm } from "@/components/login-form";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <LoginForm />;

  return (
    <ConsoleDashboard
      user={{
        email: user.email,
        name: user.name,
        role: user.role
      }}
    />
  );
}
