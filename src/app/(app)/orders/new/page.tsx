import OrderPurchaseForm from "@/components/OrderPurchaseForm";

export default function OrdersNewPage() {
  return (
    <OrderPurchaseForm
      mode="order"
      title="Order Details"
      subtitle="Create a new sales order with product, customer, pricing, delivery and payment details."
    />
  );
}
