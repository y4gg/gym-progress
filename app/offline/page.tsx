import { Suspense } from "react";
import { OfflineApp } from "@/components/offline-app";

export default function OfflinePage() {
  return (
    <Suspense fallback={null}>
      <OfflineApp />
    </Suspense>
  );
}
