import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/profile-client";
import { requirePageUser } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil Saya" };

export default async function ProfilePage() {
  const { profile } = await requirePageUser("/dashboard/profil");
  return <ProfileClient initialProfile={profile} />;
}
