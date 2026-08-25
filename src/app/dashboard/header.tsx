"use client";

import { User, Hexagon, LogOut } from "lucide-react";
import { authClient } from "@/features/auth/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncButton } from "./sync-button";
import { RunAgentXButton } from "./run-agentx-button";

export function Header({ user }: { user: { name?: string | null } }) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {/* Mobile Menu - Simplified for now */}
      <div className="flex flex-1 items-center gap-4 sm:hidden">
        <Hexagon className="h-6 w-6" />
        <span className="font-semibold">AgentX</span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 sm:ml-auto sm:gap-2 lg:gap-4">
        <RunAgentXButton />
        <SyncButton />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-secondary text-secondary-foreground hover:bg-secondary/80">
            <User className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>@{user.name || "User"}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
