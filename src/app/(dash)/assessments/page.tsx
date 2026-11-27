import Link from "next/link";
import { ClipboardCheck, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { formatDate, formatMinutes } from "@/lib/format";
import { isStaffRole } from "@/lib/viewer";
import { listTestsAndLabs, type AssessmentCard } from "@/lib/server/assessment-queries";
import { requireSession } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pre/Post test" };

function TestRow({ item }: { item: AssessmentCard }) {
  return (
    <li>
      <Link
        href={`/materials/${item.materialId}`}
        className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {item.fieldName} · {item.areaName}
          </p>
          <h3 className="text-base font-bold text-ink">{item.title}</h3>
          <p className="text-sm leading-relaxed text-ink-muted">
            {item.assessmentId
              ? [
                  `Pass mark ${item.passMarkPercent}%`,
                  `${item.attemptsUsed} of ${item.maxAttempts} attempts used`,
                  item.timeLimitMinutes ? `${formatMinutes(item.timeLimitMinutes)} limit` : null,
                  item.lastAttemptAt ? `last sat ${formatDate(item.lastAttemptAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "No question bank attached yet. Your facilitator runs this test with you."}
          </p>
          {item.assessmentId && item.bestScore !== null && (
            <p className="text-sm text-ink-muted">Best score so far: {item.bestScore}%.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.assessmentId ? (
            item.passed ? (
              <Badge variant="success">Passed</Badge>
            ) : item.attemptsUsed > 0 ? (
              <Badge variant="warn">Not passed yet</Badge>
            ) : (
              <Badge variant="outline">Not started</Badge>
            )
          ) : (
            <Badge variant="outline">Facilitator-led</Badge>
          )}
        </div>
      </Link>
    </li>
  );
}

function LabRow({ item }: { item: AssessmentCard }) {
  return (
    <li>
      <Link
        href={`/materials/${item.materialId}`}
        className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {item.fieldName} · {item.areaName}
          </p>
          <h3 className="flex items-center gap-2 text-base font-bold text-ink">
            <FlaskConical className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {item.title}
          </h3>
          <p className="text-sm text-ink-muted">
            Hands-on practical{item.estimatedMinutes ? ` · about ${formatMinutes(item.estimatedMinutes)}` : ""}
          </p>
        </div>
        <Badge variant={item.acknowledgedAt ? "success" : "outline"}>
          {item.acknowledgedAt ? "Acknowledged" : "Open"}
        </Badge>
      </Link>
    </li>
  );
}

export default async function AssessmentsPage() {
  const session = await requireSession();
  const items = await listTestsAndLabs(session);

  const tests = items.filter((item) => item.type === "ASSESSMENT_LINK");
  const labs = items.filter((item) => item.type === "LAB");
  const configured = tests.filter((item) => item.assessmentId !== null);
  const passed = configured.filter((item) => item.passed);
  const staff = isStaffRole(session.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pre/Post test"
        title="Pre/Post tests and labs"
        description={
          staff
            ? "Every pre-test, post-test and practical lab in the programmes you run, with each person's attempt history. Sitting a test is still facilitator-led on the material page."
            : "Every pre-test, post-test and practical lab attached to a material you can see. Your scores post to your transcript; labs count once you mark them complete."
        }
      />

      {!staff && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat value={String(tests.length)} label="Tests available" />
          <Stat value={String(passed.length)} label="Passed" />
          <Stat value={String(labs.length)} label="Practical labs" />
        </div>
      )}

      <section aria-labelledby="tests-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="tests-heading" className="flex items-center gap-2 text-lg font-bold text-ink">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
            Pre/Post tests
          </h2>
          <p className="text-sm text-ink-muted">
            {configured.length > 0
              ? `${configured.length} with a question bank attached, ${tests.length - configured.length} run by a facilitator.`
              : "Question banks are not attached yet, so every test listed here is run by a facilitator."}
          </p>
        </div>
        {tests.length === 0 ? (
          <ListEmptyState
            title="No tests published for you yet"
            description={
              staff
                ? "When a programme publishes an assessment material, it appears here."
                : "When a programme you can access publishes a pre-test or post-test, it appears here."
            }
            actionText="Browse programmes"
            actionHref="/catalogue"
            art="folder"
          />
        ) : (
          <ul className="space-y-3">
            {tests.map((item) => (
              <TestRow key={item.materialId} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="labs-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="labs-heading" className="flex items-center gap-2 text-lg font-bold text-ink">
            <FlaskConical className="h-5 w-5 text-primary" aria-hidden />
            Practical labs
          </h2>
          <p className="text-sm text-ink-muted">
            Hands-on sessions run at a facility or on the training day. They count as completed when you mark them so.
          </p>
        </div>
        {labs.length === 0 ? (
          <ListEmptyState
            title="No practical labs published yet"
            description="Programmes that include a hands-on component list it here once it is published."
            actionText="Browse programmes"
            actionHref="/catalogue"
            art="folder"
          />
        ) : (
          <ul className="space-y-3">
            {labs.map((item) => (
              <LabRow key={item.materialId} item={item} />
            ))}
          </ul>
        )}
      </section>

      {staff && (
        <p className="rounded-card border border-hairline bg-surface-2 p-5 text-sm leading-relaxed text-ink-muted">
          Editing a question bank is not built yet. Until it is, assessments are configured in the database by an
          administrator, and the material page tells staff what to expect.
        </p>
      )}
    </div>
  );
}
