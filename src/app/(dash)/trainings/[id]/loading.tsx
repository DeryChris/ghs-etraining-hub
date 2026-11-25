import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="Training" rows={4} showStats={false} />;
}
