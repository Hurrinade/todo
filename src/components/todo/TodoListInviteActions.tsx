import { api } from "@convex/_generated/api";
import { Link2 } from "lucide-react";
import type { TodoListSummary } from "@/types";
import { useMutation } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNetworkStore } from "@/stores";

export function TodoListInviteActions({ list }: { list: TodoListSummary }) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const createInvite = useMutation(api.mutations.todoInvites.create);

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
          size="icon-mobile-lg"
          disabled={!isOnline || isGeneratingInvite}
          onClick={() => {
            void handleGenerateInvite();
          }}
          aria-label={
            isGeneratingInvite ? "Generating invite link" : "Copy invite link"
          }
          className="shrink-0 bg-card"
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
