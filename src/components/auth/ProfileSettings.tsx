import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useNetworkStore } from "@/stores";

export default function ProfileSettings({
  name,
  email,
}: {
  name: string;
  email: string;
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
    <form onSubmit={submit} className="space-y-5" aria-busy={save.isPending}>
      <h2 className="font-semibold">Profile</h2>
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
          className="h-11 bg-background"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm">Email</p>
        <p className="break-all">{email}</p>
      </div>
      {!isOnline && (
        <p role="status">Connect to the internet to save changes.</p>
      )}
      {save.isError && (
        <p role="alert" className="text-destructive">
          {save.error.message}
        </p>
      )}
      {save.isSuccess && <p role="status">Profile saved.</p>}
      <Button
        type="submit"
        className="h-11"
        disabled={
          !isOnline ||
          save.isPending ||
          !draftName.trim() ||
          draftName.trim() === name
        }
      >
        {save.isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
