import { DemoCenter } from "@/components/demo-center";
import { currentActor } from "@/server/auth";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  let session = null;
  let sessionError = false;
  try {
    session = await currentActor();
  } catch {
    sessionError = true;
  }
  return (
    <DemoCenter
      activeRole={session?.role ?? null}
      returnTo={
        typeof params.returnTo === "string" ? params.returnTo : undefined
      }
      sessionError={sessionError}
    />
  );
}
