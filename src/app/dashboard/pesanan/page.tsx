import type { Metadata } from "next";
import { OrdersClient } from "@/components/orders/orders-client";
import { requirePageUser } from "@/lib/auth/page-guards";
import { listOrders } from "@/lib/orders/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pesanan Saya" };

export default async function OrdersPage() {
  const { user } = await requirePageUser("/dashboard/pesanan");
  const orders = await listOrders(user.id, { limit: 100 });
  return <OrdersClient initialOrders={orders} />;
}
