"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Trash2, LogOut, CreditCard, Settings, Search, Plus, PanelLeftClose } from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NewProblemModal } from "@/components/new-problem-modal";
import { useSidebar } from "@/lib/sidebar-context";

interface Chat {
  id: string;
  problemId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

export function ChatSidebar() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string } | null>(null);
  const [newProblemOpen, setNewProblemOpen] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  // Cmd+K keyboard shortcut and close context menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearchQuery("");
        setContextMenu(null);
      }
    };

    const handleClick = () => setContextMenu(null);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.problemId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const fetchChats = async () => {
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/subscription");
      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.isSubscribed);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  useEffect(() => {
    fetchChats();
    fetchSubscription();
  }, []);

  // Refresh chats when navigating to a new chat (e.g., after creating from welcome screen)
  useEffect(() => {
    if (pathname.startsWith("/chat/") && pathname !== "/chat/new") {
      fetchChats();
    }
  }, [pathname]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Delete this chat?")) return;

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

        if (response.ok) {
          setChats(chats.filter((c) => c.id !== chatId));
          if (pathname === `/chat/${chatId}`) {
            router.push("/chat");
          }
        }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (collapsed) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      style={{ width }}
      className="h-full flex flex-col border-r border-border bg-sidebar relative transition-all duration-200 ease-in-out"
    >
      {/* Toggle button inside sidebar */}
      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-3 right-3 z-10 p-1 hover:bg-accent transition-colors"
        title="Close sidebar (⌘B)"
      >
        <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* User Avatar & Menu */}
        <div className="p-3 border-b border-border relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-stretch gap-3 w-full p-2 hover:bg-accent transition-colors"
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || "User"}
              className="w-8 h-8 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.firstName?.[0] || user?.username?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left flex flex-col justify-between">
            <p className="text-sm font-medium truncate leading-none">
              {(user?.fullName || user?.username || "User").trim().replace(/\s+/g, '\u2009')}
            </p>
            {isSubscribed ? (
              <span className="px-1 py-px text-[9px] font-semibold bg-blue-500 text-white uppercase tracking-wide self-start">
                Pro
              </span>
            ) : (
              <span className="px-1 py-px text-[9px] font-semibold bg-neutral-400 text-white uppercase tracking-wide self-start">
                Basic
              </span>
            )}
          </div>
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-popover border border-border shadow-lg z-50">
            <button
              onClick={() => {
                setShowUserMenu(false);
                router.push("/billing");
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </button>
            <button
              onClick={() => {
                setShowUserMenu(false);
                router.push("/settings");
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <Separator />
            <button
              onClick={() => {
                setShowUserMenu(false);
                handleSignOut();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/50 border border-border hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none h-5 select-none items-center gap-1 border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3">
        <div className="py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
            RECENT PROBLEMS
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground px-2">Loading...</p>
          ) : chats.length > 0 && (
            <div className="space-y-0.5">
              {chats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                return (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, chatId: chat.id });
                    }}
                    className={`block px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-white font-medium shadow-sm"
                        : "hover:bg-white/50"
                    }`}
                  >
                    <span className="truncate block">
                      {chat.title.includes('. ') ? chat.title.split('. ').slice(1).join('. ') : chat.title}
                      {' '}
                      <span className="text-muted-foreground">[{chat.problemId}]</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* New Problem Card */}
      <div className="p-3 border-t border-border">
        <button 
          onClick={() => setNewProblemOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Problem
        </button>
        <NewProblemModal
          open={newProblemOpen}
          onOpenChange={setNewProblemOpen}
          onChatCreated={fetchChats}
        />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
          isDragging ? "bg-primary/30" : ""
        }`}
      />

      {/* Spotlight Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => {
            setShowSearch(false);
            setSearchQuery("");
          }}
        >
          <div
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-popover border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search problems..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="pointer-events-none h-5 select-none items-center gap-1 border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
                  ESC
                </kbd>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredChats.length > 0 ? (
                  <div className="py-2">
                    {filteredChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => {
                          router.push(`/chat/${chat.id}`);
                          setShowSearch(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate">{chat.title.includes('. ') ? chat.title.split('. ').slice(1).join('. ') : chat.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{chat.problemId}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No problems found
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Start typing to search...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleDelete({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent, contextMenu.chatId);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

