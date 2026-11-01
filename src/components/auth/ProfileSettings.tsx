import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useNetworkStore } from "@/stores";

/** Name editing for account settings. `onSaved` runs only after a successful save. */
export default function ProfileSettings({
  name,
  email,
  onSaved,
}: {
  name: string;
  email: string;
  onSaved: () => void;
}) {
  const id = useId();
  const [draftName, setDraftName] = useState(name);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const save = useMutation({
    mutationFn: async (nextName: string) => {
      const result = await authClient.updateUser({ name: nextName });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not save your profile.");
      }
    },
    onSuccess: onSaved,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline || save.isPending || !draftName.trim()) {
      return;
    }
    const nextName = draftName.trim();
    setDraftName(nextName);
    save.mutate(nextName);
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={save.isPending}>
      <div className="space-y-2">
        <label htmlFor={`${id}-name`}>Name</label>
        <Input
          id={`${id}-name`}
          autoComplete="name"
          value={draftName}
          maxLength={100}
          required
          disabled={save.isPending}
          onChange={(event) => {
            setDraftName(event.target.value);
            save.reset();
          }}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <p>Email</p>
        <p className="break-all text-muted-foreground">{email}</p>
      </div>
      {!isOnline && <p role="status">You are offline.</p>}
      {save.isError && (
        <p role="alert" className="text-destructive">
          {save.error.message}
        </p>
      )}
      <Button
        type="submit"
        className="h-11 w-full px-5 md:w-auto"
        disabled={
          !isOnline ||
          save.isPending ||
          !draftName.trim() ||
          draftName.trim() === name
        }
      >
        {save.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
