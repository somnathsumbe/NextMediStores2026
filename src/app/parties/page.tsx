import { DataTable, PageHeader } from "@/components/ui";
export default function Parties() {
  return (
    <div className="page">
      <PageHeader
        title="Customers & Suppliers"
        subtitle="Manage pharmacies, hospitals, distributors and suppliers"
      />
      <DataTable
        collection="customers"
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "gst", label: "GSTIN" },
          { key: "city", label: "City" },
        ]}
      />
    </div>
  );
}
