"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Telescope,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { CHAIN_COLORS, CHAIN_SHORT } from "@/lib/constants";
import type { ChainId } from "@/types";

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard",    icon: LayoutDashboard, badge: null },
  { href: "/positions", label: "My Positions", icon: Wallet,          badge: null },
  { href: "/discover",  label: "Discover",     icon: Telescope,       badge: "NEW" },
  { href: "/explorer",  label: "Pool Explorer",icon: BarChart3,       badge: null },
  { href: "/alerts",    label: "Alerts",       icon: Bell,            badge: null },
] as const;

const CHAINS: { id: ChainId; label: string }[] = [
  { id: 1,    label: "Ethereum" },
  { id: 8453, label: "Base"     },
  { id: 56,   label: "BNB"      },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 bg-card border-r border-border transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border">
        <Shield
          className="w-5 h-5 text-primary shrink-0"
          style={{ filter: "drop-shadow(0 0 5px #00ff41)" }}
        />
        {!sidebarCollapsed && (
          <span
            className="font-bold text-base tracking-widest uppercase text-primary"
            style={{ textShadow: "0 0 8px rgba(0,255,65,0.75), 0 0 20px rgba(0,255,65,0.3)" }}
          >
            Pool<span className="opacity-35">:</span>Guard
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-primary" : "group-hover:text-foreground",
                )}
              />
              {!sidebarCollapsed && (
                <span className="flex-1 truncate">{label}</span>
              )}
              {!sidebarCollapsed && badge && (
                <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Chain indicators */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
            Chains
          </p>
          <div className="flex gap-2">
            {CHAINS.map(({ id, label }) => (
              <div
                key={id}
                className="flex items-center gap-1.5"
                title={label}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CHAIN_COLORS[id] }}
                />
                <span className="text-xs text-muted-foreground">
                  {CHAIN_SHORT[id]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revert.finance link */}
      {!sidebarCollapsed && (
        <div className="px-4 py-2 border-t border-border">
          <a
            href="https://revert.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View on Revert.finance
          </a>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
