import OrderPurchaseForm from "@/components/OrderPurchaseForm";

export default function PurchaseNewPage() {
  return (
    <OrderPurchaseForm
      mode="purchase"
      title="Purchase Details"
      subtitle="Create a purchase record with product, supplier, pricing, stock and payment details."
    />
  );
}
