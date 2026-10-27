"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CountryCombobox({
  countries,
  value,
  onChange,
  disabled,
}: {
  countries: Country[];
  value: number | null;
  onChange: (country: Country) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = countries.find((country) => country.id === value) ?? null;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter(
      (country) => country.name.toLowerCase().includes(query) || String(country.id).includes(query),
    );
  }, [countries, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || countries.length === 0}
          className="flex h-11 w-full items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.035] px-3.5 text-left text-sm text-white transition-colors hover:border-white/[0.18] focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Pilih negara"
        >
          <Globe2 className="h-4 w-4 shrink-0 text-violet-300" />
          <span className="flex-1 truncate font-semibold">
            {selected ? `${selected.name} · ID ${selected.id}` : "Pilih negara"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari negara atau ID..."
            className="h-10 pl-9"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Negara tidak ditemukan.</p>
          ) : (
            filtered.map((country) => (
              <button
                key={country.id}
                type="button"
                onClick={() => {
                  onChange(country);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06]",
                  country.id === value && "bg-violet-500/15 text-white",
                )}
              >
                <span className="flex-1 truncate">{country.name}</span>
                <span className="text-xs text-muted-foreground">#{country.id}</span>
                {country.id === value && <Check className="h-4 w-4 text-violet-300" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
