/**
 * WalletInput — paste any EVM public address to analyze its V3 LP positions.
 * No wallet connection required.
 */
"use client";

import { useState } from "react";
import { Search, X, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { isAddress, truncateAddress } from "@/lib/utils";

export function WalletInput() {
  const { overrideAddress, setOverrideAddress } = useAppStore();
  const [draft, setDraft] = useState(overrideAddress ?? "");
  const [error, setError] = useState("");

  function handleAnalyze() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setOverrideAddress(null);
      return;
    }
    if (!isAddress(trimmed)) {
      setError("Invalid Ethereum address");
      return;
    }
    setError("");
    setOverrideAddress(trimmed.toLowerCase());
  }

  function handleClear() {
    setDraft("");
    setError("");
    setOverrideAddress(null);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium">Analyze wallet</p>
        <p className="text-xs text-muted-foreground">— paste any EVM public address</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="0x… wallet address"
            className="pl-8 font-mono text-sm"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
        </div>
        <Button size="sm" onClick={handleAnalyze} disabled={!draft.trim()}>
          Analyze
        </Button>
        {overrideAddress && (
          <Button size="sm" variant="ghost" onClick={handleClear} title="Clear">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-loss mt-1">{error}</p>}

      {overrideAddress && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse-subtle" />
          <span className="text-xs text-muted-foreground">
            Analyzing:{" "}
            <span className="font-mono text-foreground">{truncateAddress(overrideAddress)}</span>
            <span className="ml-1 text-muted-foreground">(read-only)</span>
          </span>
        </div>
      )}
    </div>
  );
}
