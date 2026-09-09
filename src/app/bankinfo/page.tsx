"use client";

import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";

type BankRecord = {
  id: number;
  party: string;
  bankName: string;
  address: string;
  ifsc: string;
  accountNo: string;
  city: string;
};
type BankForm = Omit<BankRecord, "id">;

const parties = [
  "Apollo Pharmacy",
  "MedPlus Healthcare",
  "Wellness Retail",
  "City Care Hospital",
];
const banks = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
];
const cities = [
  "Mumbai",
  "Pune",
  "Bengaluru",
  "Hyderabad",
  "New Delhi",
  "Chennai",
];
const emptyForm: BankForm = {
  party: "",
  bankName: "",
  address: "",
  ifsc: "",
  accountNo: "",
  city: "",
};
const initialRecords: BankRecord[] = [
  {
    id: 1,
    party: "Apollo Pharmacy",
    bankName: "HDFC Bank",
    address: "Andheri East, Mumbai",
    ifsc: "HDFC0001245",
    accountNo: "50200018476291",
    city: "Mumbai",
  },
  {
    id: 2,
    party: "MedPlus Healthcare",
    bankName: "ICICI Bank",
    address: "Hitech City, Hyderabad",
    ifsc: "ICIC0002371",
    accountNo: "014205001983",
    city: "Hyderabad",
  },
  {
    id: 3,
    party: "Wellness Retail",
    bankName: "State Bank of India",
    address: "Baner Road, Pune",
    ifsc: "SBIN0006412",
    accountNo: "321456789012",
    city: "Pune",
  },
  {
    id: 4,
    party: "City Care Hospital",
    bankName: "Axis Bank",
    address: "Indiranagar, Bengaluru",
    ifsc: "UTIB0001189",
    accountNo: "912345678901",
    city: "Bengaluru",
  },
  {
    id: 5,
    party: "Apollo Pharmacy",
    bankName: "Kotak Mahindra Bank",
    address: "Connaught Place, New Delhi",
    ifsc: "KKBK0004581",
    accountNo: "671234567890",
    city: "New Delhi",
  },
];

function maskAccount(accountNo: string) {
  return accountNo.length > 4
    ? `${"•".repeat(Math.max(0, accountNo.length - 4))}${accountNo.slice(-4)}`
    : accountNo;
}

export default function BankInfo() {
  const [records, setRecords] = useState(initialRecords);
  const [form, setForm] = useState<BankForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [viewing, setViewing] = useState<BankRecord | null>(null);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? records.filter((record) =>
          [
            record.party,
            record.bankName,
            record.accountNo,
            record.city,
            record.ifsc,
          ].some((value) => value.toLowerCase().includes(query)),
        )
      : records;
  }, [records, search]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }
  function updateField(field: keyof BankForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === "ifsc" ? value.toUpperCase() : value,
    }));
  }
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      showToast("error", "Please complete all required fields.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
      showToast("error", "Enter a valid IFSC code, for example HDFC0001234.");
      return;
    }
    if (editingId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingId ? { ...form, id: editingId } : record,
        ),
      );
      showToast("success", "Bank details updated successfully.");
    } else {
      setRecords((current) => [...current, { ...form, id: Date.now() }]);
      showToast("success", "Bank details added successfully.");
    }
    resetForm();
  }
  function editRecord(record: BankRecord) {
    setForm({
      party: record.party,
      bankName: record.bankName,
      address: record.address,
      ifsc: record.ifsc,
      accountNo: record.accountNo,
      city: record.city,
    });
    setEditingId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function deleteRecord(record: BankRecord) {
    if (!window.confirm(`Delete bank details for ${record.party}?`)) return;
    setRecords((current) => current.filter((item) => item.id !== record.id));
    if (editingId === record.id) resetForm();
    showToast("success", "Bank details deleted.");
  }

  return (
    <div className="page bank-details-page">
      <PageHeader
        title="Bank Details"
        subtitle="Manage party bank accounts and payment information"
      />
      {toast && (
        <div
          className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`}
          role="status"
        >
          <i
            className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"} me-2`}
          />
          {toast.message}
        </div>
      )}
      <section className="card bank-form-card mb-4" id="bank-details-form">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 px-4">
          <div>
            <h2 className="h5 mb-1">
              {editingId ? "Edit bank details" : "Add bank details"}
            </h2>
            <p className="muted mb-0">
              Fields marked <span className="text-danger">*</span> are required
            </p>
          </div>
          <span className="bank-form-icon">
            <i className="bi bi-bank2" aria-hidden="true" />
          </span>
        </div>
        <form className="p-4" onSubmit={submitForm}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="party" className="form-label">
                Party <span className="text-danger">*</span>
              </label>
              <select
                id="party"
                className="form-select"
                value={form.party}
                onChange={(event) => updateField("party", event.target.value)}
              >
                <option value="">Select Party</option>
                {parties.map((party) => (
                  <option key={party}>{party}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="bankName" className="form-label">
                Bank Name <span className="text-danger">*</span>
              </label>
              <select
                id="bankName"
                className="form-select"
                value={form.bankName}
                onChange={(event) =>
                  updateField("bankName", event.target.value)
                }
              >
                <option value="">Select Bank</option>
                {banks.map((bank) => (
                  <option key={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label htmlFor="address" className="form-label">
                Address <span className="text-danger">*</span>
              </label>
              <textarea
                id="address"
                className="form-control"
                rows={3}
                placeholder="Enter bank address"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="city" className="form-label">
                City <span className="text-danger">*</span>
              </label>
              <select
                id="city"
                className="form-select"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="ifsc" className="form-label">
                IFSC Code <span className="text-danger">*</span>
              </label>
              <input
                id="ifsc"
                className="form-control text-uppercase"
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                value={form.ifsc}
                onChange={(event) => updateField("ifsc", event.target.value)}
              />
              <div className="form-text">
                11 characters: 4 letters, 0, then 6 alphanumeric characters.
              </div>
            </div>
            <div className="col-md-6">
              <label htmlFor="accountNo" className="form-label">
                Account No. <span className="text-danger">*</span>
              </label>
              <input
                id="accountNo"
                className="form-control"
                inputMode="numeric"
                placeholder="Enter account number"
                value={form.accountNo}
                onChange={(event) =>
                  updateField(
                    "accountNo",
                    event.target.value.replace(/\D/g, ""),
                  )
                }
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-light" onClick={resetForm}>
              <i className="bi bi-arrow-counterclockwise me-2" />
              Reset
            </button>
            <button className="btn btn-brand" type="submit">
              <i
                className={`bi ${editingId ? "bi-check2" : "bi-plus-lg"} me-2`}
              />
              {editingId ? "Update Details" : "Save Details"}
            </button>
          </div>
        </form>
      </section>
      <section className="card table-card" aria-label="Bank details table">
        <div className="table-toolbar p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h2 className="h5 mb-1">Saved bank details</h2>
            <span className="muted" aria-live="polite">
              {filteredRecords.length} of {records.length} records
            </span>
          </div>
          <label
            className="search mb-0"
            style={{ maxWidth: 390, width: "100%" }}
          >
            <i className="bi bi-search" aria-hidden="true" />
            <span className="visually-hidden">Search bank details</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search party, bank, account, city..."
            />
          </label>
        </div>
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>Party</th>
                <th>Bank Name</th>
                <th>Account No.</th>
                <th>City</th>
                <th>Address</th>
                <th>IFSC Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="fw-semibold">{record.party}</td>
                    <td>{record.bankName}</td>
                    <td className="text-nowrap">
                      {maskAccount(record.accountNo)}
                    </td>
                    <td>{record.city}</td>
                    <td className="bank-address">{record.address}</td>
                    <td>
                      <span className="ifsc-code">{record.ifsc}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-light"
                          onClick={() => setViewing(record)}
                          aria-label={`View ${record.party}`}
                          title="View"
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          className="btn btn-sm btn-light"
                          onClick={() => editRecord(record)}
                          aria-label={`Edit ${record.party}`}
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-light text-danger"
                          onClick={() => deleteRecord(record)}
                          aria-label={`Delete ${record.party}`}
                          title="Delete"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-5 muted">
                    No bank details found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {viewing && (
        <div
          className="bank-modal-backdrop"
          role="presentation"
          onClick={() => setViewing(null)}
        >
          <section
            className="card bank-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-bank-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <p className="eyebrow mb-1">Bank account</p>
                <h2 id="view-bank-title" className="h4 mb-0">
                  {viewing.party}
                </h2>
              </div>
              <button
                className="btn-close"
                aria-label="Close details"
                onClick={() => setViewing(null)}
              />
            </div>
            <div className="row g-3">
              {[
                ["Bank Name", viewing.bankName],
                ["Account No.", maskAccount(viewing.accountNo)],
                ["IFSC Code", viewing.ifsc],
                ["City", viewing.city],
                ["Address", viewing.address],
              ].map(([label, value]) => (
                <div className="col-sm-6" key={label}>
                  <div className="muted small">{label}</div>
                  <div className="fw-semibold mt-1">{value}</div>
                </div>
              ))}
            </div>
            <div className="text-end mt-4">
              <button
                className="btn btn-brand"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
