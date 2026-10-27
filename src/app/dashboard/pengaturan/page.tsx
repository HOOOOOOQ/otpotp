import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return <SettingsClient />;
}
