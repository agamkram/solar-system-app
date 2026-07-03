import { Suspense } from "react";

import { SolarSystemViewer } from "@/components/SolarSystemViewer";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <SolarSystemViewer />
    </Suspense>
  );
}