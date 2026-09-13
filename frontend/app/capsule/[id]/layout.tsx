import { ReactNode } from "react";

export const runtime = "edge";

export default function CapsuleLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
