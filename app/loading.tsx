import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="content-page">
      <Skeleton className="h-16 w-2/3 mb-5" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
