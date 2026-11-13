import { getSession } from "@/lib/server/session";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { ListEmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const session = await getSession();
  if (!session) {
    notFound();
  }
  return {
    user: session,
    cpdCredits: 28,
    cpdRequired: 30,
    mandatoryModules: 2,
    inProgress: 3,
    completed: 5,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-ink-muted text-sm">
            Welcome back, {data.user.name}. Here is your CPD progress for this renewal cycle.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CPD Credits</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-ink">{data.cpdCredits} / {data.cpdRequired}</div>
            <p className="text-ink-muted text-xs">Credits accrued this cycle</p>
          </CardContent>
          <CardFooter>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-ghs-green/10 border-ghs-green/30 text-ghs-green">
                {(data.cpdCredits / data.cpdRequired) * 100 >= 90 ? "On Track" : "Due Soon"}
              </Badge>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mandatory Modules</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-ink">{data.mandatoryModules}</div>
            <p className="text-ink-muted text-xs">Require acknowledgement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-ink">{data.inProgress}</div>
            <p className="text-ink-muted text-xs">Modules started</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-ink">Continue where you left off</h2>
        <ListEmptyState
          title="No in-progress modules"
          description="Browse the library to find modules relevant to your role."
          actionText="Browse Library"
          actionHref="/library"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-ink">Announcements</h2>
        <ListEmptyState
          title="No announcements"
          description="Check back later for updates from your directorate."
        />
      </div>
    </div>
  );
}
