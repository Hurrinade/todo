import { SignOutButton } from "@clerk/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useHome } from "@/hooks/home/use-home";
import { useModal } from "@/hooks/modals/use-modal";

export default function Home() {
  const { openModal } = useModal();
  const { title, description, previewMessage } = useHome();

  return (
    <main className="flex h-full w-full items-center justify-center overflow-y-auto p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Button
          onClick={() => {
            openModal("confirm", {
              title: "Preview confirmation modal",
              message: previewMessage,
              confirmText: "Looks good",
              cancelText: "Close",
              variant: "primary",
              onConfirm: () => undefined,
            });
          }}
        >
          Open confirm modal
        </Button>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <SignOutButton>
            <Button variant="outline" className="w-full sm:w-auto">
              Log out
            </Button>
          </SignOutButton>

          <Button variant="ghost" asChild className="w-full sm:w-auto">
            <Link to="/public">Open public route example</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
