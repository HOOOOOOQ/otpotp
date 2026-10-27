import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalog/catalog-client";
import { requirePageUser } from "@/lib/auth/page-guards";
import { listCountries, listOperators, listServices } from "@/lib/provider/service";
import type { Country, Operator, ServiceItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Beli OTP" };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default async function BuyPage() {
  const { profile } = await requirePageUser("/dashboard/beli");

  let countries: Country[] = [];
  let countryError: string | null = null;
  try {
    countries = await listCountries();
  } catch (error) {
    countryError = messageOf(error, "Daftar negara provider tidak dapat dimuat.");
  }
  const selectedCountry = countries.find((country) => country.id === 6) ?? countries[0] ?? null;

  let services: ServiceItem[] = [];
  let operators: Operator[] = [];
  let servicesError: string | null = null;
  let operatorsError: string | null = null;
  if (selectedCountry) {
    const [servicesResult, operatorsResult] = await Promise.allSettled([
      listServices(selectedCountry.id),
      listOperators(selectedCountry.id),
    ]);
    if (servicesResult.status === "fulfilled") services = servicesResult.value;
    else servicesError = messageOf(servicesResult.reason, "Daftar layanan provider tidak dapat dimuat.");
    if (operatorsResult.status === "fulfilled") operators = operatorsResult.value;
    else operatorsError = messageOf(operatorsResult.reason, "Daftar operator provider tidak dapat dimuat.");
  } else if (!countryError) {
    countryError = "Provider belum mengembalikan daftar negara.";
  }

  return (
    <CatalogClient
      initialCountries={countries}
      initialCountryId={selectedCountry?.id ?? null}
      initialServices={services}
      initialOperators={operators}
      initialError={countryError}
      initialServicesError={servicesError}
      initialOperatorsError={operatorsError}
      initialBalanceIdr={profile.balanceIdr}
    />
  );
}
