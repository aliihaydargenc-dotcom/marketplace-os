import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { currentActor } from "@/server/auth";
import { resolveSection } from "@/domain/navigation";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const session = await currentActor();
  if (!session) redirect("/");
  const params = await searchParams;
  return (
    <Workspace initialSection={resolveSection(params.section, session.role)} />
  );
}
