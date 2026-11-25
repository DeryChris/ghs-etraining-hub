import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="New training" rows={4} showStats={false} />;
}
