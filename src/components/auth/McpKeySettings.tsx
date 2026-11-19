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
import { useT } from "@/hooks";
import { translateServerMessage } from "@/i18n";
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
  const t = useT();
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
        throw new Error(
          translateServerMessage(t, result.error.message, t.mcp.loadFailed),
        );
      }
      return result.data;
    },
  });
  const create = useMutation({
    mutationFn: async (keyName: string) => {
      const result = await authClient.apiKey.create({ name: keyName });
      if (result.error) {
        throw new Error(
          translateServerMessage(t, result.error.message, t.mcp.createFailed),
        );
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
        throw new Error(
          translateServerMessage(t, result.error.message, t.mcp.revokeFailed),
        );
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
            <p role="status">{t.mcp.offline}</p>
          ) : keys.isPending ? (
            <p role="status" className="text-muted-foreground">
              {t.mcp.loading}
            </p>
          ) : keys.isError ? (
            <p role="alert" className="text-destructive">
              {keys.error.message}
            </p>
          ) : total === 0 ? (
            <p className="text-muted-foreground">{t.mcp.empty}</p>
          ) : (
            <p>{t.mcp.count(total)}</p>
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
            {t.common.retry}
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
            {t.mcp.newKey}
          </Button>
        )}
      </div>

      {keys.data && keys.data.apiKeys.length > 0 && (
        <ul className="divide-y divide-border/50">
          {keys.data.apiKeys.map((key) => {
            const label = key.name || t.mcp.defaultName;
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
                        ? t.mcp.expired
                        : key.expiresAt
                          ? new Date(key.expiresAt).toLocaleDateString(
                              t.language,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : t.mcp.noExpiration}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="mobile"
                  aria-label={t.mcp.revokeLabel(label)}
                  disabled={!isOnline}
                  onClick={() => {
                    revoke.reset();
                    setRevokeTarget({ id: key.id, name: label });
                  }}
                >
                  {t.mcp.revoke}
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
            {t.mcp.previous}
          </Button>
          <span className="text-xs">{t.mcp.page(page + 1)}</span>
          <Button
            type="button"
            variant="outline"
            size="mobile"
            disabled={(page + 1) * PAGE_SIZE >= total || keys.isFetching}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            {t.mcp.next}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border/50 pt-3">
        <label
          htmlFor={`${id}-endpoint`}
          className="text-muted-foreground max-md:sr-only"
        >
          {t.mcp.endpoint}
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
        <CopyButton value={endpoint} label={t.mcp.copyEndpoint} />
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
              <DialogTitle>{t.mcp.newKeyTitle}</DialogTitle>
              <DialogDescription>{t.mcp.newKeyDescription}</DialogDescription>
              <div className="space-y-2">
                <label htmlFor={`${id}-name`}>{t.auth.name}</label>
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
              {!isOnline && <p role="status">{t.common.offline}</p>}
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
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  className="h-11"
                  disabled={!isOnline || create.isPending || !name.trim()}
                >
                  {create.isPending ? t.common.creating : t.common.create}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <DialogTitle>{t.mcp.copyKeyTitle}</DialogTitle>
              <DialogDescription>{t.mcp.copyKeyDescription}</DialogDescription>
              <Input
                aria-label={t.mcp.newKeyTitle}
                readOnly
                value={createdKey}
                autoComplete="off"
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
                className="h-11 font-mono text-xs"
              />
              <DialogFooter>
                <CopyButton
                  value={createdKey}
                  label={t.mcp.copy}
                  className="h-11"
                />
                <Button type="button" className="h-11" onClick={closeCreate}>
                  {t.common.done}
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
            {t.mcp.revokeTitle(revokeTarget?.name ?? "")}
          </DialogTitle>
          <DialogDescription>{t.mcp.revokeDescription}</DialogDescription>
          {!isOnline && <p role="status">{t.common.offline}</p>}
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
              {t.common.cancel}
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
              {revoke.isPending ? t.mcp.revoking : t.mcp.revoke}
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
  const t = useT();

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
          ? t.mcp.copied
          : state === "failed"
            ? t.mcp.copyFailed
            : t.mcp.copy}
      </span>
    </Button>
  );
}
