"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowLeft, AlertTriangle, Loader2, Trash2, Code2, Check, Github, Keyboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Language {
  id: number;
  name: string;
  extension: string;
}

export default function SettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  // Get GitHub account info from Clerk
  const githubAccount = user?.externalAccounts?.find(
    (account) => account.provider === "github"
  );
  const githubUsername = githubAccount?.username || user?.username;

  // Language settings
  const [languages, setLanguages] = useState<Language[]>([]);
  const [defaultLanguageId, setDefaultLanguageId] = useState<number | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageSaved, setLanguageSaved] = useState(false);

  useEffect(() => {
    // Fetch available languages
    const fetchLanguages = async () => {
      try {
        const response = await fetch("/api/execute");
        if (response.ok) {
          const data = await response.json();
          setLanguages(data.languages);
        }
      } catch (error) {
        console.error("Failed to fetch languages:", error);
      }
    };

    // Fetch user settings
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/account/settings");
        if (response.ok) {
          const data = await response.json();
          setDefaultLanguageId(data.defaultLanguageId);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchLanguages();
    fetchSettings();
  }, []);

  const handleLanguageChange = async (languageId: string) => {
    const newLanguageId = parseInt(languageId, 10);
    setDefaultLanguageId(newLanguageId);
    setSavingLanguage(true);
    setLanguageSaved(false);

    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguageId: newLanguageId }),
      });

      if (response.ok) {
        setLanguageSaved(true);
        setTimeout(() => setLanguageSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save language:", error);
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Sign out and redirect to home
      await signOut();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12 pb-24">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </Link>

        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Manage your account settings.
        </p>

        {/* GitHub Account Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Account
            </CardTitle>
            <CardDescription>
              Your connected GitHub account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isLoaded ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {user?.imageUrl && (
                  <img
                    src={user.imageUrl}
                    alt="GitHub avatar"
                    className="w-10 h-10 rounded-full border border-black"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {githubUsername || user?.primaryEmailAddress?.emailAddress || "Unknown"}
                  </p>
                  {user?.primaryEmailAddress?.emailAddress && githubUsername && (
                    <p className="text-sm text-muted-foreground">
                      {user.primaryEmailAddress.emailAddress}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Default Language Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Default Language
            </CardTitle>
            <CardDescription>
              Choose your preferred programming language for new problems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Select
                value={defaultLanguageId?.toString() || ""}
                onValueChange={handleLanguageChange}
                disabled={savingLanguage}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id.toString()}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingLanguage && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {languageSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>
              Quick actions to speed up your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Run code</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Submit solution</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + Shift + Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toggle sidebar</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + B</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Search</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + K</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New chat</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + J</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toggle code editor</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + \</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toggle problem panel</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + '</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus chat input</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">⌘ + /</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Close modal / panel</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-black rounded">Escape</kbd>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              On Windows/Linux, use Ctrl instead of ⌘
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showConfirm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  will:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Delete all your chat history and messages</li>
                  <li>Cancel any active subscription</li>
                  <li>Remove your Stripe customer data</li>
                  <li>Delete your Clerk authentication account</li>
                </ul>
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirm(true)}
                  className="mt-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-destructive">
                  Are you absolutely sure? This action cannot be undone.
                </p>
                <p className="text-sm text-muted-foreground">
                  Type <span className="font-mono font-bold">DELETE</span> to
                  confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                  disabled={deleting}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirm(false);
                      setConfirmText("");
                      setError(null);
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== "DELETE" || deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      "Permanently Delete Account"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
