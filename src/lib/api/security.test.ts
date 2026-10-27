import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/api/errors";

vi.mock("@/lib/supabase/config", () => ({ hasServerSupabaseConfig: () => false }));

import { assertSameOrigin } from "@/lib/api/origin";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { safeIdempotencyKey, sanitizeNextPath } from "@/lib/auth/validation";

const repoRoot = path.resolve(__dirname, "../../..");

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    return statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];
  });
}

describe("request security helpers", () => {
  it("allows the same origin and rejects a foreign origin on state-changing requests", () => {
    const sameOrigin = new Request("https://kaii.example/api/orders", {
      method: "POST",
      headers: { origin: "https://kaii.example", host: "kaii.example" },
    });
    expect(() => assertSameOrigin(sameOrigin)).not.toThrow();

    const foreign = new Request("https://kaii.example/api/orders", {
      method: "POST",
      headers: { origin: "https://evil.example", host: "kaii.example" },
    });
    expect(() => assertSameOrigin(foreign)).toThrow(AppError);
  });

  it("rejects a cross-site request with no Origin header", () => {
    const request = new Request("https://kaii.example/api/orders", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(() => assertSameOrigin(request)).toThrow(/asal/i);
  });

  it("enforces a local rate-limit fallback when the database limiter is unavailable", async () => {
    const key = `test:rate:${Date.now()}:${Math.random()}`;
    await expect(enforceRateLimit(key, 1, 60)).resolves.toBeUndefined();
    await expect(enforceRateLimit(key, 1, 60)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("sanitizes redirect paths and idempotency keys", () => {
    expect(sanitizeNextPath("/dashboard/pesanan?status=all")).toBe("/dashboard/pesanan?status=all");
    expect(sanitizeNextPath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("https://evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeIdempotencyKey("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(safeIdempotencyKey("short")).toBeNull();
    expect(safeIdempotencyKey("contains spaces and enough length")).toBeNull();
  });
});

describe("repository security invariants", () => {
  it("keeps the provider API key empty in .env.example and excludes .env files", () => {
    const envExample = readFileSync(path.join(repoRoot, ".env.example"), "utf8");
    const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
    const keyLine = envExample.split(/\r?\n/).find((line) => line.startsWith("JASAOTP_API_KEY="));
    expect(keyLine).toBe("JASAOTP_API_KEY=");
    expect(envExample).not.toMatch(/api_key=\w{8,}/i);
    expect(gitignore).toMatch(/^\.env/m);
    expect(gitignore).toContain("!.env.example");
  });

  it("keeps provider network calls in the server-only client module", () => {
    const providerClientPath = path.join(repoRoot, "src/lib/provider/client.ts");
    const sourceFiles = walk(path.join(repoRoot, "src")).filter(
      (file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts"),
    );
    const filesWithOrigin = sourceFiles.filter((file) =>
      readFileSync(file, "utf8").includes("api.jasaotp.id"),
    );
    expect(filesWithOrigin).toContain(providerClientPath);
    for (const file of filesWithOrigin) {
      const source = readFileSync(file, "utf8");
      if (file !== providerClientPath) {
        // Documentation may mention the base URL as text; it must not build a provider request.
        expect(source).not.toMatch(/new URL\(endpoint, PROVIDER_BASE_URL\)/);
        expect(source).not.toMatch(/fetch\([^)]*api\.jasaotp\.id/);
      }
    }
    const clientSource = readFileSync(providerClientPath, "utf8");
    expect(clientSource).toContain('import "server-only"');
    expect(clientSource).toContain("https://api.jasaotp.id/v2/");
    expect(clientSource).toContain("new URL(endpoint, PROVIDER_BASE_URL)");
  });

  it("never accesses or stores the provider API key in client components", () => {
    const clientFiles = walk(path.join(repoRoot, "src/components")).filter(
      (file) => /\.tsx?$/.test(file) && readFileSync(file, "utf8").includes('"use client"'),
    );
    const leaks = clientFiles.filter((file) =>
      /process\.env\.JASAOTP_API_KEY|JASAOTP_API_KEY\s*=\s*["'][^"']+["']/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(leaks).toEqual([]);
  });

  it("ships RLS, atomic wallet functions, OTP cleanup, and service-role-only grants in SQL", () => {
    const sql = readFileSync(
      path.join(repoRoot, "supabase/migrations/202610270001_initial.sql"),
      "utf8",
    );
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/create policy "Users can read own orders"/i);
    expect(sql).toMatch(/create or replace function public\.reserve_order/i);
    expect(sql).toMatch(/create or replace function public\.finalize_order_cancel/i);
    expect(sql).toMatch(/create or replace function public\.cleanup_sensitive_data/i);
    expect(sql).toMatch(/grant execute on function public\.reserve_order.*to service_role/i);
    expect(sql).toMatch(/revoke all on function public\.mark_order_otp.*from public, anon, authenticated/i);
    expect(sql).not.toMatch(/JASAOTP_API_KEY\s+text/i);
  });
});
