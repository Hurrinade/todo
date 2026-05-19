import { Users } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { TodoListMember } from "@/types";

type TodoListMembersHoverCardProps = {
  members: TodoListMember[];
};

export function TodoListMembersHoverCard({
  members,
}: TodoListMembersHoverCardProps) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-2.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent/60"
          aria-label={`Show ${members.length} list members`}
        >
          <Users className="size-4 text-primary" />
          <span>{members.length}</span>
        </button>
      </HoverCardTrigger>

      <HoverCardContent
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
      </HoverCardContent>
    </HoverCard>
  );
}

function formatMemberName(member: TodoListMember) {
  const fullName = [member.firstName, member.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");

  return fullName || member.firstName || member.lastName || "-";
}
