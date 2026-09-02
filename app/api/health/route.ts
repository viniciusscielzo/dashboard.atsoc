export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      service: "atsoc-control",
      ready: true,
      storage: "local-browser",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
