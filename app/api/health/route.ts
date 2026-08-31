import { databaseConfigurationStatus } from "@/lib/server/runtime-env";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = databaseConfigurationStatus();
  const ready = Object.values(status).every(Boolean);
  return Response.json(
    {
      service: "atsoc-control",
      ready,
      database: status,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
