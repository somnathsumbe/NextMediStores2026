"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import OrderPurchaseForm, { type SalesOrderRecord } from "@/components/OrderPurchaseForm";
import { mockService } from "@/lib/mock-service";

export default function EditSalesOrder() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrderRecord | null>(null);

  useEffect(() => {
    const found = mockService.get<SalesOrderRecord>("salesOrders").find((item) => String(item.id) === params.id);
    setOrder(found ?? null);
  }, [params.id]);

  if (!order) return <div className="page"><div className="alert alert-warning">Sales bill not found.</div></div>;
  return <OrderPurchaseForm mode="order" title="Edit Sales Bill" subtitle="Update this bill without changing its saved salesman name snapshot." initialOrder={order} />;
}
