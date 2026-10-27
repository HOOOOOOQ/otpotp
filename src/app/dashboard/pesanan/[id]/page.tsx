import type { Metadata } from "next";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { OrderDetailClient } from "@/components/orders/order-detail-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppError } from "@/lib/api/errors";
import { requirePageUser } from "@/lib/auth/page-guards";
import { getOrderDetail } from "@/lib/orders/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Detail Pesanan" };

function NotFoundCard() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Detail pesanan" title="Pesanan tidak ditemukan" description="Pesanan mungkin sudah dihapus atau bukan milik akun Anda." />
      <Card>
        <EmptyState
          icon={PackageX}
          title="Tidak ada data pesanan"
          description="Kaii OTP hanya menampilkan pesanan yang terikat pada akun Anda. Periksa daftar pesanan untuk melihat data yang tersedia."
          action={<Button asChild><Link href="/dashboard/pesanan">Kembali ke Pesanan Saya</Link></Button>}
        />
      </Card>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!validId) return <NotFoundCard />;
  const { user } = await requirePageUser(`/dashboard/pesanan/${id}`);
  try {
    const order = await getOrderDetail(user.id, id);
    return <OrderDetailClient initialOrder={order} />;
  } catch (error) {
    if (error instanceof AppError && (error.code === "ORDER_NOT_FOUND" || error.status === 404)) {
      return <NotFoundCard />;
    }
    throw error;
  }
}
