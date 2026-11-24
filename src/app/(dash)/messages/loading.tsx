import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="Messages" rows={6} showStats={false} />;
}
