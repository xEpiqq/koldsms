"use client";

import React from "react";
import Papa from "papaparse";
import { Button } from "@/components/button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/table";
import { Checkbox } from "@/components/checkbox";
import { Heading } from "@/components/heading";
import {
  Fieldset,
  FieldGroup,
  Field,
  Label,
} from "@/components/fieldset";
import { Input } from "@/components/input";

/**
 * Props:
 *  - leads
 *  - selectedLeadIds, setSelectedLeadIds
 *  - showCsvUploadForm, setShowCsvUploadForm
 *  - csvData, setCsvData
 *  - csvHeaders, setCsvHeaders
 *  - csvMapping, setCsvMapping
 *  - supabase
 *  - selectedCampaignId
 *  - loadCampaignDetails
 */
export default function LeadsStep({
  leads,
  selectedLeadIds,
  setSelectedLeadIds,
  showCsvUploadForm,
  setShowCsvUploadForm,
  csvData,
  setCsvData,
  csvHeaders,
  setCsvHeaders,
  csvMapping,
  setCsvMapping,
  supabase,
  selectedCampaignId,
  loadCampaignDetails,
}) {
  // Toggle a single lead's checkbox
  function toggleLeadSelection(leadId) {
    setSelectedLeadIds((prev) => {
      if (prev.includes(leadId)) {
        return prev.filter((id) => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  }

  async function handleCsvFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });
      const nonFieldMismatchErrors = parsed.errors.filter(
        (err) => err.code !== "TooFewFields"
      );
      if (nonFieldMismatchErrors.length > 0) {
        console.error(nonFieldMismatchErrors);
        alert("Error parsing CSV.");
        return;
      }
      const rows = parsed.data;
      if (!rows || rows.length === 0) {
        alert("No rows found in CSV.");
        return;
      }
      const headers = parsed.meta.fields || [];
      setCsvHeaders(headers);
      setCsvData(rows);

      // Attempt auto-detection
      let detectedMapping = {
        phone: "",
        first_name: "",
        last_name: "",
        company_name: "",
      };
      const phoneHeaderCandidates = ["phone", "phone number", "phone numbers"];
      const firstNameCandidates = ["first name", "firstname", "first"];
      const lastNameCandidates = ["last name", "lastname", "last"];
      const companyCandidates = ["company", "company name", "business"];

      detectedMapping.phone =
        headers.find((h) => phoneHeaderCandidates.includes(h.toLowerCase())) || "";
      detectedMapping.first_name =
        headers.find((h) => firstNameCandidates.includes(h.toLowerCase())) || "";
      detectedMapping.last_name =
        headers.find((h) => lastNameCandidates.includes(h.toLowerCase())) || "";
      detectedMapping.company_name =
        headers.find((h) => companyCandidates.includes(h.toLowerCase())) || "";

      setCsvMapping(detectedMapping);

      alert("CSV loaded. Please adjust the mapping if needed.");
    } catch (err) {
      console.error(err);
      alert("Error reading CSV file: " + err.message);
    }
  }

  function validatePhone(phone) {
    return /^[0-9]+$/.test(phone);
  }

  async function importLeads() {
    if (!selectedCampaignId) {
      alert("No campaign selected.");
      return;
    }
    if (!csvData || csvData.length === 0) {
      alert("No CSV data loaded.");
      return;
    }
    if (!csvMapping.phone) {
      alert("Please select the phone column in the mapping.");
      return;
    }
    const leadsToInsert = [];
    let invalidCount = 0;
    for (const row of csvData) {
      const phoneValue = row[csvMapping.phone]?.toString().trim();
      if (!phoneValue || !validatePhone(phoneValue)) {
        invalidCount++;
        continue;
      }
      const firstName = csvMapping.first_name
        ? row[csvMapping.first_name]?.toString().trim() || ""
        : "";
      const lastName = csvMapping.last_name
        ? row[csvMapping.last_name]?.toString().trim() || ""
        : "";
      const companyName = csvMapping.company_name
        ? row[csvMapping.company_name]?.toString().trim() || ""
        : "";

      const personal = { ...row };
      if (csvMapping.phone) delete personal[csvMapping.phone];
      if (csvMapping.first_name) delete personal[csvMapping.first_name];
      if (csvMapping.last_name) delete personal[csvMapping.last_name];
      if (csvMapping.company_name) delete personal[csvMapping.company_name];

      leadsToInsert.push({
        campaign_id: selectedCampaignId,
        phone: phoneValue,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        personalization: personal,
        created_at: new Date().toISOString(),
        stop_sending: false,
      });
    }
    if (leadsToInsert.length === 0) {
      alert(`No valid leads found. ${invalidCount} invalid phone numbers.`);
      return;
    }
    const { error } = await supabase.from("campaign_leads").insert(leadsToInsert);
    if (error) {
      alert("Error inserting leads: " + error.message);
      return;
    }
    await loadCampaignDetails(selectedCampaignId);

    // Clear everything
    setCsvData([]);
    setCsvHeaders([]);
    setCsvMapping({
      phone: "",
      first_name: "",
      last_name: "",
      company_name: "",
    });
    setShowCsvUploadForm(false);

    let message = "Imported leads successfully!";
    if (invalidCount > 0) {
      message += ` Skipped ${invalidCount} row(s) due to invalid phone numbers.`;
    }
    alert(message);
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <p>{leads.length} leads in this campaign.</p>

      {showCsvUploadForm && (
        <div
          style={{
            marginTop: "2rem",
            border: "1px solid #ccc",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          <Heading level={4}>Upload CSV Leads</Heading>
          <Fieldset style={{ marginTop: "1rem" }}>
            <FieldGroup>
              <Field>
                <Label>CSV File</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleCsvFile(e.target.files[0]);
                    }
                  }}
                />
              </Field>
            </FieldGroup>
          </Fieldset>

          {csvHeaders.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <Heading level={5}>Map CSV columns to database fields:</Heading>
              <Fieldset style={{ marginTop: "0.5rem" }}>
                <FieldGroup>
                  <Field>
                    <Label>Phone Number</Label>
                    <select
                      value={csvMapping.phone}
                      onChange={(e) =>
                        setCsvMapping({ ...csvMapping, phone: e.target.value })
                      }
                    >
                      <option value="">--Select Column--</option>
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field>
                    <Label>First Name</Label>
                    <select
                      value={csvMapping.first_name}
                      onChange={(e) =>
                        setCsvMapping({ ...csvMapping, first_name: e.target.value })
                      }
                    >
                      <option value="">--Select Column--</option>
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field>
                    <Label>Last Name</Label>
                    <select
                      value={csvMapping.last_name}
                      onChange={(e) =>
                        setCsvMapping({ ...csvMapping, last_name: e.target.value })
                      }
                    >
                      <option value="">--Select Column--</option>
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field>
                    <Label>Company Name</Label>
                    <select
                      value={csvMapping.company_name}
                      onChange={(e) =>
                        setCsvMapping({
                          ...csvMapping,
                          company_name: e.target.value,
                        })
                      }
                    >
                      <option value="">--Select Column--</option>
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                </FieldGroup>
              </Fieldset>
            </div>
          )}

          <div style={{ marginTop: "1rem" }}>
            <Button color="blue" onClick={importLeads}>
              Import Leads
            </Button>
            <Button
              plain
              onClick={() => setShowCsvUploadForm(false)}
              style={{ marginLeft: "1rem" }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {leads.length > 0 ? (
        <div style={{ marginTop: "2rem" }}>
          <Table
            bleed
            striped
            className="[--gutter:--spacing(6)] sm:[--gutter:--spacing(8)] mt-2"
          >
            <TableHead>
              <TableRow>
                <TableHeader>Select</TableHeader>
                <TableHeader>Phone</TableHeader>
                <TableHeader>First Name</TableHeader>
                <TableHeader>Last Name</TableHeader>
                <TableHeader>Company Name</TableHeader>
                <TableHeader>Created At</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select lead ${l.id}`}
                      checked={selectedLeadIds.includes(l.id)}
                      onChange={() => toggleLeadSelection(l.id)}
                    />
                  </TableCell>
                  <TableCell>{l.phone}</TableCell>
                  <TableCell>{l.first_name || "-"}</TableCell>
                  <TableCell>{l.last_name || "-"}</TableCell>
                  <TableCell>{l.company_name || "-"}</TableCell>
                  <TableCell>{l.created_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600">
          No leads yet. Click the plus icon above to add leads.
        </p>
      )}
    </div>
  );
}
