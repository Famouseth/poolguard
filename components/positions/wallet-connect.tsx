/**
 * WalletConnect — allows user to connect wallet OR paste any address.
 * Used at the top of the My Positions page.
 */
"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { isAddress, truncateAddress } from "@/lib/utils";

export function WalletInput() {
  const { address: connectedAddress } = useAccount();
  const { overrideAddress, setOverrideAddress } = useAppStore();
  const [draft, setDraft] = useState(overrideAddress ?? "");
  const [error, setError] = useState("");

  const activeAddress = overrideAddress ?? connectedAddress;

  function handlePaste() {
    if (!draft.trim()) {
      setOverrideAddress(null);
      return;
    }
    if (!isAddress(draft.trim())) {
      setError("Invalid Ethereum address");
      return;
    }
    setError("");
    setOverrideAddress(draft.trim().toLowerCase());
  }

  function handleClear() {
    setDraft("");
    setError("");
    setOverrideAddress(null);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Connect wallet button */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Connect wallet</p>
          <ConnectButton accountStatus="full" chainStatus="none" showBalance={false} />
        </div>

        <div className="text-muted-foreground text-xs self-center">or</div>

        {/* Address input */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-2">Track any address</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="0x…"
                className="pl-8 font-mono text-sm"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePaste()}
              />
            </div>
            <Button size="sm" onClick={handlePaste} disabled={!draft.trim()}>
              Track
            </Button>
            {overrideAddress && (
              <Button size="sm" variant="ghost" onClick={handleClear}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {error && <p className="text-xs text-loss mt-1">{error}</p>}
        </div>
      </div>

      {/* Active address indicator */}
      {activeAddress && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse-subtle" />
          <span className="text-xs text-muted-foreground">
            Viewing:{" "}
            <span className="font-mono text-foreground">
              {overrideAddress
                ? truncateAddress(overrideAddress)
                : truncateAddress(connectedAddress ?? "")}
            </span>
            {overrideAddress ? " (read-only)" : " (connected wallet)"}
          </span>
        </div>
      )}
    </div>
  );
}
