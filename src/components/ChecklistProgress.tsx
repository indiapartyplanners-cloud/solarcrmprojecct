import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistProgressProps {
  totalItems: number;
  completedItems: number;
  requiredItems: number;
  completedRequiredItems: number;
  className?: string;
}

export const ChecklistProgress = ({
  totalItems,
  completedItems,
  requiredItems,
  completedRequiredItems,
  className,
}: ChecklistProgressProps) => {
  const totalProgress =
    totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const requiredProgress =
    requiredItems > 0 ? (completedRequiredItems / requiredItems) * 100 : 0;
  const allRequiredComplete = requiredItems === completedRequiredItems;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
          <Circle className="h-3 w-3" />
          <span>{totalItems - completedItems} remaining</span>
        </div>
        <div className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
          <CheckCircle2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>{completedItems} completed</span>
        </div>
        {!allRequiredComplete && requiredItems > 0 && (
          <div className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
            <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>
              {requiredItems - completedRequiredItems} required pending
            </span>
          </div>
        )}
      </div>

      {/* Overall Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {completedItems} / {totalItems} items
          </span>
        </div>
        <Progress value={totalProgress} className="h-2.5" />
      </div>

      {/* Required Items Progress */}
      {requiredItems > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Required Items</span>
              {allRequiredComplete ? (
                <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <span className="text-muted-foreground">
              {completedRequiredItems} / {requiredItems} required
            </span>
          </div>
          <Progress
            value={requiredProgress}
            className={cn(
              "h-2.5",
              allRequiredComplete && "bg-amber-200 dark:bg-amber-900",
            )}
          />
        </div>
      )}
    </div>
  );
};
