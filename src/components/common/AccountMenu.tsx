import { UserButton } from "@clerk/react";

export default function AccountMenu() {
  return (
    <div className="flex items-center justify-center gap-2">
      <UserButton
        showName
        userProfileMode="modal"
        userProfileProps={{
          apiKeysProps: {
            hide: false,
            showDescription: true,
          },
        }}
      />
    </div>
  );
}
