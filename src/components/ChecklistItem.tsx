import { useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ChecklistItemData {
  id: string;
  text: string;
  required: boolean;
  checked?: boolean;
  notes?: string;
}

interface ChecklistItemProps {
  item: ChecklistItemData;
  onToggle: (id: string, checked: boolean) => void;
  onNotesChange: (id: string, notes: string) => void;
  disabled?: boolean;
}

export const ChecklistItem = ({
  item,
  onToggle,
  onNotesChange,
  disabled,
}: ChecklistItemProps) => {
  const [showNotes, setShowNotes] = useState(!!item.notes);

  return (
    <div
      className={cn(
        "group rounded-xl border bg-background p-4 transition-all",
        "hover:border-slate-300/70 hover:bg-slate-50/60 dark:hover:bg-slate-900/30",
        item.checked
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/25"
          : "border-slate-200/80",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={item.id}
          checked={item.checked || false}
          onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={item.id}
              className={cn(
                "text-sm font-medium cursor-pointer",
                item.checked && "line-through text-muted-foreground",
              )}
            >
              {item.text}
            </Label>
            {item.required && (
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Required
              </Badge>
            )}
          </div>

          {(showNotes || item.notes) && (
            <div className="mt-2">
              <Textarea
                placeholder="Add notes for this item..."
                value={item.notes || ""}
                onChange={(e) => onNotesChange(item.id, e.target.value)}
                disabled={disabled}
                className="min-h-[72px] text-sm"
              />
            </div>
          )}

          {!showNotes && !item.notes && (
            <button
              onClick={() => setShowNotes(true)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              disabled={disabled}
            >
              Add notes...
            </button>
          )}
        </div>

        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border",
            item.checked && "border-amber-200 bg-amber-50",
            !item.checked && item.required && "border-amber-200 bg-amber-50",
            !item.checked && !item.required && "border-slate-200 bg-slate-50",
          )}
        >
          {item.checked ? (
            <Check className="h-4 w-4 text-amber-600" />
          ) : item.required ? (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          ) : (
            <X className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </div>
    </div>
  );
};
