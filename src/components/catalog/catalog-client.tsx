"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Filter,
  Info,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { CountryCombobox } from "@/components/catalog/country-combobox";
import { ServiceIcon } from "@/components/catalog/service-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ApiClientError,
  apiGet,
  apiPost,
  friendlyApiError,
  newIdempotencyKey,
} from "@/lib/api/client";
import { formatIDR, formatNumber } from "@/lib/format";
import type { Country, Operator, ProfileView, PublicOrder, ServiceItem } from "@/lib/types";

interface PurchaseResult {
  order: PublicOrder | null;
  duplicate: boolean;
  message: string;
}

const AMBIGUOUS_CODES = new Set([
  "PROVIDER_RESULT_UNKNOWN",
  "ORDER_RECONCILIATION_REQUIRED",
  "ORDER_IN_PROGRESS",
  "CANCEL_RESULT_UNKNOWN",
]);

export function CatalogClient({
  initialCountries,
  initialCountryId,
  initialServices,
  initialOperators,
  initialError,
  initialServicesError,
  initialOperatorsError,
  initialBalanceIdr,
}: {
  initialCountries: Country[];
  initialCountryId: number | null;
  initialServices: ServiceItem[];
  initialOperators: Operator[];
  initialError: string | null;
  initialServicesError: string | null;
  initialOperatorsError: string | null;
  initialBalanceIdr: number;
}) {
  const router = useRouter();
  const [countries, setCountries] = useState(initialCountries);
  const [countryId, setCountryId] = useState<number | null>(initialCountryId);
  const [services, setServices] = useState(initialServices);
  const [operators, setOperators] = useState(initialOperators);
  const [operator, setOperator] = useState(
    initialOperators.find((item) => item.value.toLowerCase() === "any")?.value ??
      initialOperators[0]?.value ??
      "",
  );
  const [balanceIdr, setBalanceIdr] = useState(initialBalanceIdr);
  const [searchService, setSearchService] = useState("");
  const [sort, setSort] = useState("name");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(initialError);
  const [servicesError, setServicesError] = useState<string | null>(initialServicesError);
  const [operatorsError, setOperatorsError] = useState<string | null>(initialOperatorsError);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [blockResubmit, setBlockResubmit] = useState(false);

  const selectedCountry = countries.find((country) => country.id === countryId) ?? null;

  useEffect(() => {
    void apiGet<{ profile: ProfileView }>("/api/wallet/summary")
      .then((result) => setBalanceIdr(result.profile.balanceIdr))
      .catch(() => undefined);
  }, []);

  async function loadCountryData(nextCountryId: number, fresh = false) {
    setLoading(true);
    setServicesError(null);
    setOperatorsError(null);
    const query = fresh ? "&fresh=1" : "";
    const [servicesResult, operatorsResult] = await Promise.allSettled([
      apiGet<{ services: ServiceItem[] }>(`/api/services?negara=${nextCountryId}${query}`),
      apiGet<{ operators: Operator[] }>(`/api/operators?negara=${nextCountryId}${query}`),
    ]);
    if (servicesResult.status === "fulfilled") setServices(servicesResult.value.services);
    else setServicesError(friendlyApiError(servicesResult.reason, "Daftar layanan gagal dimuat."));
    if (operatorsResult.status === "fulfilled") {
      const nextOperators = operatorsResult.value.operators;
      setOperators(nextOperators);
      setOperator(
        nextOperators.find((item) => item.value.toLowerCase() === "any")?.value ??
          nextOperators[0]?.value ??
          "",
      );
    } else {
      setOperatorsError(friendlyApiError(operatorsResult.reason, "Daftar operator gagal dimuat."));
      setOperators([]);
      setOperator("");
    }
    setLoading(false);
  }

  async function refreshAll() {
    setLoading(true);
    setCatalogError(null);
    try {
      const result = await apiGet<{ countries: Country[] }>("/api/countries?fresh=1");
      const nextCountries = result.countries;
      setCountries(nextCountries);
      const stillValid = nextCountries.some((country) => country.id === countryId);
      const nextCountry =
        nextCountries.find((country) => country.id === countryId && stillValid) ??
        nextCountries.find((country) => country.id === 6) ??
        nextCountries[0] ??
        null;
      setCountryId(nextCountry?.id ?? null);
      if (nextCountry) await loadCountryData(nextCountry.id, true);
      else {
        setServices([]);
        setOperators([]);
        setOperator("");
        setCatalogError("Provider belum mengembalikan daftar negara.");
      }
      toast.success("Katalog diperbarui dari provider.");
    } catch (error) {
      setCatalogError(friendlyApiError(error, "Katalog provider tidak dapat dimuat."));
      toast.error("Katalog provider tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  function chooseCountry(country: Country) {
    setCountryId(country.id);
    void loadCountryData(country.id);
  }

  function openConfirm(service: ServiceItem) {
    if (service.stock <= 0) {
      toast.error("Stok layanan ini sedang habis.");
      return;
    }
    if (!operator) {
      toast.error("Pilih operator terlebih dahulu.");
      return;
    }
    setSelectedService(service);
    setIdempotencyKey(newIdempotencyKey());
    setDialogError(null);
    setBlockResubmit(false);
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    if (!selectedService || !operator || countryId === null || blockResubmit) return;
    setSubmitting(true);
    setDialogError(null);
    try {
      const result = await apiPost<PurchaseResult>(
        "/api/orders",
        { negara: countryId, layanan: selectedService.code, operator },
        { "Idempotency-Key": idempotencyKey },
      );
      toast.success(result.message);
      setConfirmOpen(false);
      if (result.order?.id) router.push(`/dashboard/pesanan/${result.order.id}`);
      else router.refresh();
    } catch (error) {
      const message = friendlyApiError(error, "Pembelian gagal. Coba lagi.");
      setDialogError(message);
      if (error instanceof ApiClientError && AMBIGUOUS_CODES.has(error.code)) {
        setBlockResubmit(true);
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredServices = useMemo(() => {
    const query = searchService.trim().toLowerCase();
    const result = services.filter((service) => {
      if (onlyAvailable && service.stock <= 0) return false;
      if (!query) return true;
      return service.name.toLowerCase().includes(query) || service.code.toLowerCase().includes(query);
    });
    return result.sort((a, b) => {
      if (sort === "price-asc") return a.priceIdr - b.priceIdr || a.name.localeCompare(b.name, "id");
      if (sort === "price-desc") return b.priceIdr - a.priceIdr || a.name.localeCompare(b.name, "id");
      if (sort === "stock") return b.stock - a.stock || a.name.localeCompare(b.name, "id");
      return a.name.localeCompare(b.name, "id");
    });
  }, [services, searchService, sort, onlyAvailable]);

  const insufficientBalance =
    selectedService !== null && balanceIdr < selectedService.priceIdr;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Katalog provider"
        title="Beli Nomor OTP"
        description="Pilih negara, operator, dan aplikasi. Harga serta stok diambil langsung dari endpoint JasaOTP v2 dan diverifikasi ulang di server sebelum pembelian."
        actions={<RefreshButton onClick={() => void refreshAll()} loading={loading} label="Muat ulang katalog" />}
      />

      {catalogError && (
        <ErrorState
          title="Katalog provider bermasalah"
          message={catalogError}
          onRetry={() => void refreshAll()}
          retrying={loading}
        />
      )}

      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="space-y-2">
            <Label>Negara</Label>
            <CountryCombobox
              countries={countries}
              value={countryId}
              onChange={chooseCountry}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Cari berdasarkan nama atau ID negara.</p>
          </div>
          <div className="space-y-2">
            <Label>Operator</Label>
            <Select value={operator || undefined} onValueChange={setOperator} disabled={loading || operators.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={operators.length === 0 ? "Operator tidak tersedia" : "Pilih operator"} />
              </SelectTrigger>
              <SelectContent>
                {operators.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                    {item.value.toLowerCase() === "any" ? " · semua operator" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {operators.some((item) => item.value.toLowerCase() === "any")
                ? "Pilihan any tersedia dari provider."
                : "Hanya operator yang dikembalikan provider ditampilkan."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Saldo Anda</Label>
            <div className="flex h-11 items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.035] px-3.5">
              <span className="text-base font-extrabold">{formatIDR(balanceIdr)}</span>
              <Link href="/dashboard/deposit" className="text-xs font-bold text-violet-300 hover:underline">
                Deposit →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">Saldo pengguna, bukan saldo provider.</p>
          </div>
        </div>
      </Card>

      {operatorsError && (
        <Alert variant="warning">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>{operatorsError} Pembelian dinonaktifkan sampai operator tersedia.</AlertDescription>
        </Alert>
      )}
      {servicesError && (
        <ErrorState
          title="Layanan belum dapat dimuat"
          message={servicesError}
          onRetry={() => countryId !== null && void loadCountryData(countryId, true)}
          retrying={loading}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchService}
            onChange={(event) => setSearchService(event.target.value)}
            placeholder="Cari aplikasi atau kode layanan..."
            className="pl-10"
            disabled={loading}
          />
        </div>
        <Select value={sort} onValueChange={setSort} disabled={loading}>
          <SelectTrigger className="sm:w-48">
            <SlidersHorizontal className="mr-2 h-4 w-4 text-violet-300" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Urut: Nama</SelectItem>
            <SelectItem value="price-asc">Harga terendah</SelectItem>
            <SelectItem value="price-desc">Harga tertinggi</SelectItem>
            <SelectItem value="stock">Stok terbanyak</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 text-sm font-semibold">
          <Filter className="h-4 w-4 text-cyan-300" />
          <span className="hidden sm:inline">Stok tersedia</span>
          <Switch checked={onlyAvailable} onCheckedChange={setOnlyAvailable} disabled={loading} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {selectedCountry ? `Negara: ${selectedCountry.name}` : "Negara belum dipilih"} ·{" "}
          {formatNumber(filteredServices.length)} layanan ditampilkan
        </p>
        <p className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Harga diverifikasi server saat checkout
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="space-y-4 p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : countries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Boxes}
            title="Belum ada negara dari provider"
            description="Provider belum mengembalikan daftar negara. Coba muat ulang katalog beberapa saat lagi."
            action={<Button onClick={() => void refreshAll()} variant="outline" size="sm">Muat ulang</Button>}
          />
        </Card>
      ) : filteredServices.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="Layanan tidak ditemukan"
            description="Ubah kata kunci, matikan filter stok, atau pilih negara lain. Data tidak pernah diisi dengan contoh palsu."
            action={
              <Button variant="outline" size="sm" onClick={() => { setSearchService(""); setOnlyAvailable(false); }}>
                Reset pencarian
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => (
            <Card key={service.code} className="group flex flex-col p-5 transition-all hover:-translate-y-1 hover:border-violet-400/25">
              <div className="flex items-start justify-between gap-3">
                <ServiceIcon code={service.code} name={service.name} />
                <Badge variant={service.stock > 0 ? "green" : "slate"}>
                  Stok {formatNumber(service.stock)}
                </Badge>
              </div>
              <h3 className="mt-5 truncate text-base font-bold">{service.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Kode <code className="text-violet-200">{service.code}</code> · {selectedCountry?.name ?? "Negara"}
              </p>
              <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Harga</p>
                  <p className="mt-1 text-xl font-extrabold">{formatIDR(service.priceIdr)}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openConfirm(service)}
                  disabled={service.stock <= 0 || !operator}
                  className="shrink-0"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {service.stock <= 0 ? "Habis" : "Beli"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Provider tidak menyediakan waktu kedaluwarsa pada dokumentasi order v2. Karena itu Kaii OTP tidak menampilkan countdown buatan pada katalog.
        </AlertDescription>
      </Alert>

      <Dialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi pembelian nomor</DialogTitle>
            <DialogDescription>
              Saldo akan didebit hanya setelah harga diverifikasi ulang dari API provider.
            </DialogDescription>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Layanan</span><strong>{selectedService.name}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Kode</span><code className="text-violet-200">{selectedService.code}</code></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Negara</span><strong>{selectedCountry?.name ?? "—"}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Operator</span><strong>{operator || "—"}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Stok</span><strong>{formatNumber(selectedService.stock)}</strong></div>
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3"><span className="text-muted-foreground">Harga provider</span><strong className="text-lg">{formatIDR(selectedService.priceIdr)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Saldo Anda</span><strong>{formatIDR(balanceIdr)}</strong></div>
            </div>
          )}
          {insufficientBalance && (
            <Alert variant="warning">
              <AlertTitle>Saldo tidak mencukupi</AlertTitle>
              <AlertDescription>
                Ajukan deposit manual dan tunggu verifikasi admin sebelum membeli.
                <Link href="/dashboard/deposit" className="ml-2 font-bold underline">Buka deposit</Link>
              </AlertDescription>
            </Alert>
          )}
          {dialogError && (
            <Alert variant="destructive">
              <AlertTitle>Pembelian belum selesai</AlertTitle>
              <AlertDescription>
                {dialogError}
                {blockResubmit && (
                  <>
                    {" "}Jangan klik ulang. <Link href="/kontak" className="font-bold underline">Hubungi dukungan</Link> untuk peninjauan.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Batal</Button>
            <Button onClick={() => void confirmPurchase()} disabled={submitting || blockResubmit || insufficientBalance}>
              {submitting ? "Memproses..." : <>Beli Nomor <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
