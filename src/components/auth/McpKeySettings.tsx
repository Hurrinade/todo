import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { envConfig } from "@/config/env";
import { authClient } from "@/lib/auth-client";
import { useNetworkStore } from "@/stores";

const PAGE_SIZE = 20;

export default function McpKeySettings({ userId }: { userId: string }) {
  const id = useId();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<{
    id: string;
    key: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const queryKey = ["mcp-keys", userId];
  const keys = useQuery({
    queryKey: [...queryKey, page],
    enabled: isOnline,
    queryFn: async ({ signal }) => {
      const result = await authClient.apiKey.list({
        query: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
        fetchOptions: { signal },
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not load MCP keys.");
      }
      return result.data;
    },
  });
  const create = useMutation({
    mutationFn: async (keyName: string) => {
      const result = await authClient.apiKey.create({ name: keyName });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not create a key.");
      }
      // Keep the secret in this component only, never in the query cache or storage.
      setCreatedKey({ id: result.data.id, key: result.data.key });
    },
    onSuccess: () => {
      setShowCreate(false);
      setName("");
      setPage(0);
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const revoke = useMutation({
    mutationFn: async (keyId: string) => {
      const result = await authClient.apiKey.delete({ keyId });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not revoke this key.");
      }
    },
    onSuccess: (_, keyId) => {
      setRevokeTarget(null);
      setCreatedKey((current) => (current?.id === keyId ? null : current));
      if (keys.data?.apiKeys.length === 1 && page > 0) {
        setPage(page - 1);
      }
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline || create.isPending || !name.trim()) {
      return;
    }
    create.mutate(name.trim());
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">MCP keys</h2>
        <Button
          type="button"
          className="h-11"
          disabled={
            !isOnline || showCreate || create.isPending || createdKey != null
          }
          onClick={() => {
            create.reset();
            setShowCreate(true);
          }}
        >
          Create key
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={submit}
          className="space-y-3 border-b pb-5"
          aria-busy={create.isPending}
        >
          <label htmlFor={`${id}-name`}>Key name</label>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            placeholder="e.g. Claude Desktop"
            maxLength={32}
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            disabled={create.isPending}
            className="h-11 bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Expires after 90 days.
          </p>
          {create.isError && (
            <p role="alert" className="text-destructive">
              {create.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="h-11"
              disabled={!isOnline || create.isPending || !name.trim()}
            >
              {create.isPending ? "Creating..." : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={create.isPending}
              onClick={() => {
                setShowCreate(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {createdKey && (
        <div className="space-y-3 border-b pb-5" role="status">
          <p>Copy this key now. It will not be shown again.</p>
          <Input
            aria-label="New MCP key"
            readOnly
            value={createdKey.key}
            autoComplete="off"
            className="h-11 bg-background font-mono"
          />
          <div className="flex gap-2">
            <CopyButton
              key={createdKey.id}
              value={createdKey.key}
              label="Copy key"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setCreatedKey(null);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {!isOnline && (
        <p role="status">Connect to the internet to manage keys.</p>
      )}
      {isOnline && keys.isPending && <p role="status">Loading keys...</p>}
      {keys.isError && (
        <div className="space-y-2">
          <p role="alert" className="text-destructive">
            {keys.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!isOnline || keys.isFetching}
            onClick={() => void keys.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {keys.data && (
        <>
          {keys.data.apiKeys.length === 0 && <p>No MCP keys yet.</p>}
          <ul className="divide-y">
            {keys.data.apiKeys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div className="min-w-0 space-y-1">
                  <p className="break-words">{key.name || "MCP key"}</p>
                  <p className="text-xs text-muted-foreground">
                    {key.start ? `${key.start}… · ` : ""}
                    {key.expiresAt
                      ? `${new Date(key.expiresAt).getTime() <= keys.dataUpdatedAt ? "Expired" : "Expires"} ${new Date(key.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                      : "No expiration"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  aria-label={`Revoke ${key.name || "MCP key"}`}
                  disabled={!isOnline || revoke.isPending}
                  onClick={() => {
                    revoke.reset();
                    setRevokeTarget({
                      id: key.id,
                      name: key.name || "MCP key",
                    });
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
          {keys.data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={page === 0 || keys.isFetching}
                onClick={() => {
                  setPage(page - 1);
                }}
              >
                Previous
              </Button>
              <span className="text-xs">Page {page + 1}</span>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={
                  (page + 1) * PAGE_SIZE >= keys.data.total || keys.isFetching
                }
                onClick={() => {
                  setPage(page + 1);
                }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <div className="space-y-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Keys can access your lists and shared lists.
        </p>
        <label htmlFor={`${id}-endpoint`}>MCP endpoint</label>
        <Input
          id={`${id}-endpoint`}
          readOnly
          value={`${envConfig.convexSiteUrl}/mcp`}
          className="h-11 bg-background font-mono text-xs"
        />
        <CopyButton
          value={`${envConfig.convexSiteUrl}/mcp`}
          label="Copy endpoint"
        />
      </div>

      <Dialog
        open={revokeTarget != null}
        onOpenChange={(open) => {
          if (!open && !revoke.isPending) {
            setRevokeTarget(null);
          }
        }}
      >
        <DialogContent
          className="auth-theme dark max-w-sm rounded-lg bg-background text-foreground"
          showCloseButton={false}
        >
          <DialogTitle className="break-words">
            Revoke {revokeTarget?.name}?
          </DialogTitle>
          <DialogDescription>
            Clients using this key will lose access immediately.
          </DialogDescription>
          {revoke.isError && (
            <p role="alert" className="text-destructive">
              {revoke.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={revoke.isPending}
              onClick={() => {
                setRevokeTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={!isOnline || revoke.isPending}
              onClick={() => {
                if (revokeTarget) {
                  revoke.mutate(revokeTarget.id);
                }
              }}
            >
              {revoke.isPending ? "Revoking..." : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copy() {
    setError(false);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => void copy()}
      >
        {copied ? "Copied" : label}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Could not copy. Select the field and copy it manually.
        </p>
      )}
    </div>
  );
}
