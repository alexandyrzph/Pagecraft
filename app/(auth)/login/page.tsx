import { AuthScreen } from "@/components/auth/AuthScreen";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return <AuthScreen mode="login" next={next} errorCode={error} />;
}
