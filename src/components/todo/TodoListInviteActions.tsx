import { Link2 } from "lucide-react";
import type { TodoListWithStats } from "@/types";
import { useMutation } from "convex/react";
import { useState } from "react";

import { todoApi } from "@/config/convex-api";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TodoListInviteActions({ list }: { list: TodoListWithStats }) {
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const createInvite = useMutation(todoApi.mutations.todoInvites.create);

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);

    try {
      const invite = await createInvite({ listId: list._id });
      const nextInviteLink = new URL(
        `/invite/${invite.token}`,
        window.location.origin,
      ).toString();

      try {
        await navigator.clipboard.writeText(nextInviteLink);
      } catch {
        // Do nothing
      }
    } catch {
      // Do nothing
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={isGeneratingInvite}
          onClick={() => {
            void handleGenerateInvite();
          }}
          aria-label={
            isGeneratingInvite ? "Generating invite link" : "Copy invite link"
          }
          className="shrink-0"
        >
          <Link2 className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>
        {isGeneratingInvite ? "Generating invite link" : "Copy invite link"}
      </TooltipContent>
    </Tooltip>
  );
}
