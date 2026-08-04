import { Users } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TodoListMember } from "@/types";

type TodoListMembersPopoverProps = {
  members: TodoListMember[];
};

export function TodoListMembersPopover({
  members,
}: TodoListMembersPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3 text-xs font-medium text-foreground shadow-sm transition-colors pointer-fine:h-6 pointer-fine:px-2.5 hover:bg-accent/60"
          aria-label={`Show ${members.length} list members`}
        >
          <Users className="size-4 text-primary" />
          <span>{members.length}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-72 rounded-md border border-border/80 bg-card/98 p-0 text-card-foreground shadow-[0_18px_50px_rgba(31,26,23,0.16)]"
      >
        {members.length === 0 ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">
            No members found
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-3 py-3">
            {members.map((member) => (
              <div key={member.userId} className="rounded-2xl px-3">
                <p className="text-sm font-medium text-foreground">
                  {formatMemberName(member)}
                </p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function formatMemberName(member: TodoListMember) {
  const fullName = [member.firstName, member.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");

  return fullName || member.firstName || member.lastName || "-";
}
