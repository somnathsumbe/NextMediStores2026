"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrderPurchaseForm, { type SalesOrderRecord } from "@/components/OrderPurchaseForm";
import { mockService } from "@/lib/mock-service";

export default function EditSalesOrder() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<SalesOrderRecord | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    const found = id ? mockService.get<SalesOrderRecord>("salesOrders").find((item) => String(item.id) === id) : undefined;
    setOrder(found ?? null);
  }, [searchParams]);

  if (!order) return <div className="page"><div className="alert alert-warning">Sales bill not found.</div></div>;
  return <OrderPurchaseForm mode="order" title="Edit Sales Bill" subtitle="Update this bill without changing its saved salesman name snapshot." initialOrder={order} />;
}
