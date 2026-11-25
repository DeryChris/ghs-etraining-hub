import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton label="Programme fields" rows={5} showStats={true} />;
}
