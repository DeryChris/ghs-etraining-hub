import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="Programme catalogue" rows={5} showStats={false} />;
}
