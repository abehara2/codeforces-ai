import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="border border-border">
        <SignIn
          forceRedirectUrl="/chat"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-0 rounded-none",
              headerTitle: "font-bold",
              headerSubtitle: "text-muted-foreground",
              formButtonPrimary:
                "bg-black hover:bg-black/90 text-white rounded-none",
              formFieldInput: "rounded-none border-border",
              footerActionLink: "text-black hover:text-black/80",
              identityPreviewEditButton: "text-black",
              formFieldAction: "text-black",
            },
          }}
        />
      </div>
    </main>
  );
}

