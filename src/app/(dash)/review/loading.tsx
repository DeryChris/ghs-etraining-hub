import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="Review queue" rows={5} showStats={false} />;
}
