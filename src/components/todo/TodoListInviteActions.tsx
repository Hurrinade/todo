import { Link2 } from "lucide-react";
import type { TodoListWithStats } from "@/types";
import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { todoApi } from "@/config/convex-api";

export function TodoListInviteActions({ list }: { list: TodoListWithStats }) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const createInvite = useMutation(todoApi.mutations.todoInvites.create);

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    setErrorMessage(null);

    try {
      const invite = await createInvite({ listId: list._id });
      const nextInviteLink = new URL(
        `/invite/${invite.token}`,
        window.location.origin,
      ).toString();

      setInviteLink(nextInviteLink);
      try {
        await navigator.clipboard.writeText(nextInviteLink);
      } catch {
        setErrorMessage("Invite created. Copy the link from the field.");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  return (
    <section className="rounded-2xl bg-card/80 p-3 flex flex-wrap md:flex-nowrap">
      <Button
        type="button"
        variant="ghost"
        disabled={isGeneratingInvite}
        onClick={handleGenerateInvite}
        className="h-11 md:min-w-44"
      >
        <Link2 data-icon="inline-start" />
        {isGeneratingInvite ? "Generating..." : "Copy invite link"}
      </Button>

      <Input
        readOnly
        value={inviteLink ?? ""}
        className="h-11 bg-background/75 border-none focus:outline-none focus-visible:ring-0 cursor-default text-sm md:mt-0 md:ml-4 flex-1 truncate"
      />
      {errorMessage && (
        <div className="mt-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
    </section>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
