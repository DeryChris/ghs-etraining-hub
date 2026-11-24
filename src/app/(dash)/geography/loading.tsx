import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="Geography and facilities" rows={4} showStats={false} />;
}
