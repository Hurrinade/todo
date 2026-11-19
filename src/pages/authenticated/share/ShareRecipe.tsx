import { api } from "@convex/_generated/api";
import { getAppErrorMessage } from "@convex/shared/errors";
import { getRecipeLinkLabel, normalizeRecipeUrl } from "@convex/shared/recipe";
import { useMutation, useQuery } from "convex/react";
import { ChefHat } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/stores";
import type { TodoListSummary } from "@/types";
import { OFFLINE_ACTION_MESSAGE } from "@/utils";

/**
 * Where the installed app lands when a page is shared to RiTodo (Android).
 * The manifest's share_target sends the link as `url`, or inside `text`.
 * The family picks a recipe list and the recipe saves like a pasted link.
 */
export default function ShareRecipe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const lists = useQuery(api.queries.todoLists.list);
  const createRecipe = useMutation(api.mutations.recipes.create);
  const [savingListId, setSavingListId] = useState<
    TodoListSummary["_id"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const sharedUrl = getSharedUrl(searchParams);
  const recipeLists = lists?.filter((list) => list.kind === "recipe");

  const openList = (listId?: TodoListSummary["_id"]) => {
    void navigate("/home", {
      replace: true,
      state: listId ? { selectedListId: listId } : undefined,
    });
  };

  const handleSave = async (listId: TodoListSummary["_id"]) => {
    if (!sharedUrl) {
      return;
    }

    if (!isOnline) {
      setError(OFFLINE_ACTION_MESSAGE);
      return;
    }

    setError(null);
    setSavingListId(listId);

    try {
      await createRecipe({ listId, text: sharedUrl });
      openList(listId);
    } catch (saveError) {
      setError(getAppErrorMessage(saveError) ?? "Couldn't save recipe.");
      setSavingListId(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Save recipe</h1>
        {sharedUrl ? (
          <p className="text-sm break-all text-muted-foreground">
            {getRecipeLinkLabel(sharedUrl)}
          </p>
        ) : null}
      </header>

      {!sharedUrl ? (
        <p className="text-sm text-muted-foreground">
          No link came with this share. Open the recipe page and share it again.
        </p>
      ) : recipeLists === undefined ? (
        <p className="text-sm text-muted-foreground">Loading lists</p>
      ) : recipeLists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Make a recipe list in RiTodo first, then share the page again.
        </p>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Save to
          </h2>
          <ul className="flex flex-col gap-2">
            {recipeLists.map((list) => (
              <li key={list._id}>
                <button
                  type="button"
                  disabled={savingListId != null}
                  onClick={() => {
                    void handleSave(list._id);
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-card px-4 text-left font-semibold text-card-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    {list.emoji ?? <ChefHat className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{list.title}</span>
                  {savingListId === list._id ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      Saving
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        variant="ghost"
        className="self-start"
        onClick={() => {
          openList();
        }}
      >
        Open RiTodo
      </Button>
    </div>
  );
}

// Android apps put the link in `url`, `text` or both, sometimes after the
// page title ("Šnenokle https://..."), so take the first link found.
function getSharedUrl(searchParams: URLSearchParams) {
  const candidates = [searchParams.get("url"), searchParams.get("text")];

  for (const candidate of candidates) {
    const link = candidate?.match(/https?:\/\/\S+/i)?.[0];

    if (link) {
      try {
        return normalizeRecipeUrl(link);
      } catch {
        // Not a usable link; try the next field.
      }
    }
  }

  return null;
}
