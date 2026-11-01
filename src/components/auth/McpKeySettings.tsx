import { useId, useRef, useState, type FormEvent } from "react";
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
const endpoint = `${envConfig.convexSiteUrl}/mcp`;
// Same light backdrop as AccountSettingsDialog, which these dialogs open over.
const overlayClassName = "bg-black/20 backdrop-blur-none";
const dialogClassName = "max-w-sm rounded-lg";

/** MCP key list with create, one-time copy and confirmed revoke. */
export default function McpKeySettings({ userId }: { userId: string }) {
  const id = useId();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const newKeyRef = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  // Kept in this component only, never in the query cache or storage.
  const [createdKey, setCreatedKey] = useState<string | null>(null);
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
      // Keep the one-time secret out of TanStack Query's mutation cache.
      setCreatedKey(result.data.key);
    },
    onSuccess: () => {
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
    onSuccess: () => {
      setRevokeTarget(null);
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

  function closeCreate() {
    setCreateOpen(false);
    setCreatedKey(null);
  }

  const total = keys.data?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex min-h-11 items-center gap-3">
        <div className="min-w-0 flex-1">
          {!isOnline ? (
            <p role="status">You are offline. Keys load when you reconnect.</p>
          ) : keys.isPending ? (
            <p role="status" className="text-muted-foreground">
              Loading keys...
            </p>
          ) : keys.isError ? (
            <p role="alert" className="text-destructive">
              {keys.error.message}
            </p>
          ) : total === 0 ? (
            <p className="text-muted-foreground">No MCP keys yet.</p>
          ) : (
            <p>
              {total} {total === 1 ? "key" : "keys"}. Each expires after 90
              days.
            </p>
          )}
        </div>
        {isOnline && keys.isError ? (
          <Button
            type="button"
            variant="outline"
            size="mobile"
            disabled={keys.isFetching}
            onClick={() => void keys.refetch()}
          >
            Retry
          </Button>
        ) : (
          <Button
            ref={newKeyRef}
            type="button"
            size="mobile"
            disabled={!isOnline}
            onClick={() => {
              create.reset();
              setCreateOpen(true);
            }}
          >
            New key
          </Button>
        )}
      </div>

      {keys.data && keys.data.apiKeys.length > 0 && (
        <ul className="divide-y divide-border/50">
          {keys.data.apiKeys.map((key) => {
            const label = key.name || "MCP key";
            const expired =
              key.expiresAt != null &&
              new Date(key.expiresAt).getTime() <= keys.dataUpdatedAt;
            return (
              <li key={key.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
                  <p className="break-words md:min-w-0 md:flex-1">{label}</p>
                  <p className="flex gap-2 text-xs text-muted-foreground md:gap-3">
                    {key.start && (
                      <span className="font-mono">{key.start}…</span>
                    )}
                    <span
                      className={
                        expired
                          ? "text-destructive md:w-24 md:text-right"
                          : "md:w-24 md:text-right"
                      }
                    >
                      {expired
                        ? "Expired"
                        : key.expiresAt
                          ? new Date(key.expiresAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "No expiration"}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="mobile"
                  aria-label={`Revoke ${label}`}
                  disabled={!isOnline}
                  onClick={() => {
                    revoke.reset();
                    setRevokeTarget({ id: key.id, name: label });
                  }}
                >
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {keys.data && total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="mobile"
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
            size="mobile"
            disabled={(page + 1) * PAGE_SIZE >= total || keys.isFetching}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border/50 pt-3">
        <label
          htmlFor={`${id}-endpoint`}
          className="text-muted-foreground max-md:sr-only"
        >
          Endpoint
        </label>
        <Input
          id={`${id}-endpoint`}
          readOnly
          value={endpoint}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs dark:bg-transparent"
        />
        <CopyButton value={endpoint} label="Copy endpoint" />
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && !create.isPending) {
            closeCreate();
          }
        }}
      >
        <DialogContent
          className={dialogClassName}
          overlayClassName={overlayClassName}
          // The secret is shown once, so a stray click outside must not dismiss it.
          onInteractOutside={(event) => {
            if (createdKey != null) {
              event.preventDefault();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            newKeyRef.current?.focus();
          }}
        >
          {createdKey == null ? (
            <form
              onSubmit={submit}
              className="grid gap-4"
              aria-busy={create.isPending}
            >
              <DialogTitle>New MCP key</DialogTitle>
              <DialogDescription>
                Keys can access your lists and shared lists. They expire after
                90 days.
              </DialogDescription>
              <div className="space-y-2">
                <label htmlFor={`${id}-name`}>Name</label>
                <Input
                  id={`${id}-name`}
                  autoComplete="off"
                  placeholder="Claude Desktop"
                  maxLength={32}
                  required
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                  disabled={create.isPending}
                  className="h-11"
                />
              </div>
              {!isOnline && <p role="status">You are offline.</p>}
              {create.isError && (
                <p role="alert" className="text-destructive">
                  {create.error.message}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={create.isPending}
                  onClick={closeCreate}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11"
                  disabled={!isOnline || create.isPending || !name.trim()}
                >
                  {create.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <DialogTitle>Copy your key</DialogTitle>
              <DialogDescription>It will not be shown again.</DialogDescription>
              <Input
                aria-label="New MCP key"
                readOnly
                value={createdKey}
                autoComplete="off"
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
                className="h-11 font-mono text-xs"
              />
              <DialogFooter>
                <CopyButton value={createdKey} label="Copy" className="h-11" />
                <Button type="button" className="h-11" onClick={closeCreate}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={revokeTarget != null}
        onOpenChange={(open) => {
          if (!open && !revoke.isPending) {
            setRevokeTarget(null);
          }
        }}
      >
        <DialogContent
          className={dialogClassName}
          overlayClassName={overlayClassName}
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            // The revoked row is gone, so return focus to a stable control.
            if (revoke.isSuccess) {
              event.preventDefault();
              newKeyRef.current?.focus();
            }
          }}
        >
          <DialogTitle className="break-words">
            Revoke {revokeTarget?.name}?
          </DialogTitle>
          <DialogDescription>
            Clients using this key lose access immediately.
          </DialogDescription>
          {!isOnline && <p role="status">You are offline.</p>}
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
              {revoke.isPending ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Copies a value. On failure the label says so; the field next to it selects on focus for manual copy. */
function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="mobile"
      className={className}
      aria-label={state === "idle" ? label : undefined}
      onClick={() => void copy()}
    >
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed"
            : "Copy"}
      </span>
    </Button>
  );
}
