import "server-only";
import { CATALOG_CACHE_SECONDS, LANDING_CACHE_SECONDS } from "@/lib/constants";
import { callProvider } from "@/lib/provider/client";
import {
  parseBalanceResponse,
  parseCancelResponse,
  parseCountriesResponse,
  parseOperatorsResponse,
  parseOrderResponse,
  parseOtpResponse,
  parseServicesResponse,
} from "@/lib/provider/parse";
import type {
  ProviderBalanceResult,
  ProviderCancelResult,
  ProviderOrderResult,
  ProviderOtpResult,
} from "@/lib/provider/types";
import type { Country, LandingStats, Operator, ServiceItem } from "@/lib/types";

interface CacheEntry {
  promise: Promise<unknown>;
  expiresAt: number;
}

const catalogCache = new Map<string, CacheEntry>();

async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
  fresh = false,
): Promise<T> {
  const now = Date.now();
  if (!fresh) {
    const existing = catalogCache.get(key);
    if (existing && existing.expiresAt > now) return existing.promise as Promise<T>;
  }
  const promise = producer().catch((error) => {
    catalogCache.delete(key);
    throw error;
  });
  catalogCache.set(key, { promise, expiresAt: now + ttlSeconds * 1000 });
  return promise;
}

export interface CatalogOptions {
  fresh?: boolean;
}

export async function listCountries(options: CatalogOptions = {}): Promise<Country[]> {
  return cached(
    "countries",
    CATALOG_CACHE_SECONDS,
    async () => parseCountriesResponse(await callProvider("negara.php", {}, { requiresKey: false })),
    options.fresh,
  );
}

export async function listServices(
  countryId: number,
  options: CatalogOptions = {},
): Promise<ServiceItem[]> {
  return cached(
    `services:${countryId}`,
    CATALOG_CACHE_SECONDS,
    async () =>
      parseServicesResponse(
        await callProvider("layanan.php", { negara: countryId }, { requiresKey: false }),
        countryId,
      ),
    options.fresh,
  );
}

export async function listOperators(
  countryId: number,
  options: CatalogOptions = {},
): Promise<Operator[]> {
  return cached(
    `operators:${countryId}`,
    CATALOG_CACHE_SECONDS,
    async () =>
      parseOperatorsResponse(
        await callProvider("operator.php", { negara: countryId }, { requiresKey: false }),
        countryId,
      ),
    options.fresh,
  );
}

export async function createProviderOrder(input: {
  countryId: number;
  serviceCode: string;
  operator: string;
}): Promise<ProviderOrderResult> {
  const payload = await callProvider(
    "order.php",
    {
      negara: input.countryId,
      layanan: input.serviceCode,
      operator: input.operator,
    },
    { requiresKey: true },
  );
  return parseOrderResponse(payload);
}

export async function checkProviderOtp(providerOrderId: string): Promise<ProviderOtpResult> {
  const payload = await callProvider("sms.php", { id: providerOrderId }, { requiresKey: true });
  return parseOtpResponse(payload);
}

export async function cancelProviderOrder(
  providerOrderId: string,
): Promise<ProviderCancelResult> {
  const payload = await callProvider(
    "cancel.php",
    { id: providerOrderId },
    { requiresKey: true },
  );
  return parseCancelResponse(payload);
}

export async function getProviderBalance(): Promise<ProviderBalanceResult> {
  const payload = await callProvider("balance.php", {}, { requiresKey: true });
  return parseBalanceResponse(payload);
}

/**
 * Landing-page statistics are computed from live public provider catalog responses.
 * If the provider is unavailable, null values and dashes are shown — never invented numbers.
 */
export async function getLandingStats(options: CatalogOptions = {}): Promise<LandingStats> {
  return cached(
    "landing-stats",
    LANDING_CACHE_SECONDS,
    async () => {
      const empty: LandingStats = {
        available: false,
        countries: null,
        services: null,
        operators: null,
        lowestPriceIdr: null,
        sampleCountry: null,
        featuredServices: [],
        updatedAt: null,
        error: null,
      };
      let countries: Country[];
      try {
        countries = await listCountries({ fresh: options.fresh });
      } catch (error) {
        return {
          ...empty,
          error: error instanceof Error ? "Data katalog provider sedang tidak tersedia." : null,
        };
      }
      if (countries.length === 0) {
        return { ...empty, countries: 0, updatedAt: new Date().toISOString(), error: "Provider belum mengembalikan daftar negara." };
      }
      const sampleCountry = countries.find((country) => country.id === 6) ?? countries[0];
      const [servicesResult, operatorsResult] = await Promise.allSettled([
        listServices(sampleCountry.id, { fresh: options.fresh }),
        listOperators(sampleCountry.id, { fresh: options.fresh }),
      ]);
      const services = servicesResult.status === "fulfilled" ? servicesResult.value : [];
      const operators = operatorsResult.status === "fulfilled" ? operatorsResult.value : [];
      const availableServices = services.filter((service) => service.stock > 0);
      const lowestPriceIdr = availableServices.length
        ? Math.min(...availableServices.map((service) => service.priceIdr))
        : null;
      return {
        available: true,
        countries: countries.length,
        services: servicesResult.status === "fulfilled" ? services.length : null,
        operators: operatorsResult.status === "fulfilled" ? operators.length : null,
        lowestPriceIdr,
        sampleCountry,
        featuredServices: [...availableServices]
          .sort((a, b) => a.priceIdr - b.priceIdr || a.name.localeCompare(b.name, "id"))
          .slice(0, 6),
        updatedAt: new Date().toISOString(),
        error:
          servicesResult.status === "rejected" || operatorsResult.status === "rejected"
            ? "Sebagian katalog provider sedang tidak tersedia."
            : null,
      };
    },
    options.fresh,
  );
}
