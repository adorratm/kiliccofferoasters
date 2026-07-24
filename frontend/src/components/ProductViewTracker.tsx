"use client";

import { useEffect } from "react";
import { trackViewContent } from "@/lib/analytics";

type Props = {
  id: string;
  name: string;
  price?: number;
  currency?: string;
};

/** Ürün detay ViewContent — client-only bir kez */
export function ProductViewTracker({ id, name, price, currency }: Props) {
  useEffect(() => {
    trackViewContent({ id, name, price, currency });
  }, [id, name, price, currency]);

  return null;
}
