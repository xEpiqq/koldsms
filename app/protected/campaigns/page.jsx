// /app/protected/campaigns/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/utils/supabase/client";

// Catalyst UI Kit imports
import { Heading } from "@/components/heading";
import { Subheading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/table";
import {
  Fieldset,
  Legend,
  FieldGroup,
  Field,
  Label,
  Description,
} from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Checkbox } from "@/components/checkbox";
import { Badge } from "@/components/badge";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  DropdownLabel,
} from "@/components/dropdown";
import {
  Navbar,
  NavbarDivider,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
} from "@/components/navbar";

import {
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import { InboxIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";

import { useRouter } from "next/navigation";

export default function CampaignsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Main view states: "list", "new", or "wizard"
  const [view, setView] = useState("list");

  // The user’s campaigns
  const [campaigns, setCampaigns] = useState([]);

  // Creating a new campaign
  const [newCampaignName, setNewCampaignName] = useState("");

  // Wizard states
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaign, setCampaign] = useState(null);
  // Wizard steps
  const [wizardStep, setWizardStep] = useState("leads");

  // leads
  const [leads, setLeads] = useState([]);
  // CSV upload states
  const [csvData, setCsvData] = useState([]); // parsed rows
  const [csvHeaders, setCsvHeaders] = useState([]); // columns
  // New state for dynamic mapping of CSV columns to DB fields
  const [csvMapping, setCsvMapping] = useState({
    phone: "",
    first_name: "",
    last_name: "",
    company_name: "",
  });
  // Toggle for showing CSV upload UI
  const [showCsvUploadForm, setShowCsvUploadForm] = useState(false);

  // Store the user’s selections of leads for deletion
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // schedule & sequence form
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    dailyLimit: 100,
    startTime: "09:00",
    endTime: "18:00",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    messageContent: "",
  });

  // On mount, fetch user + campaigns
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        return;
      }
      setUser(user);

      // Retrieve campaigns for this user
      const { data: c, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading campaigns:", error.message);
        return;
      }
      setCampaigns(c || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If wizard, load the campaign details
  useEffect(() => {
    if (view !== "wizard" || !selectedCampaignId) return;
    loadCampaignDetails(selectedCampaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedCampaignId]);

  // Helpers to convert local times <-> UTC
  function convertLocalTimeToUTC(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    return `${String(utcHours).padStart(2, "0")}:${String(utcMinutes).padStart(
      2,
      "0"
    )}`;
  }

  function convertUTCToLocal(timeStr) {
    const [utcHours, utcMinutes] = timeStr.split(":").map(Number);
    const now = new Date();
    // Create a Date object using UTC time components for today
    const utcDate = new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        utcHours,
        utcMinutes,
        0
      )
    );
    // Convert to local time
    const localHours = utcDate.getHours();
    const localMinutes = utcDate.getMinutes();
    return `${String(localHours).padStart(2, "0")}:${String(localMinutes).padStart(
      2,
      "0"
    )}`;
  }

  async function loadCampaignDetails(campaignId) {
    // fetch the campaign
    const { data: c } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();
    setCampaign(c || null);

    // fetch leads
    const { data: leadRows } = await supabase
      .from("campaign_leads")
      .select("*")
      .eq("campaign_id", campaignId);
    setLeads(leadRows || []);

    // reset selectedLeadIds
    setSelectedLeadIds([]);

    if (c) {
      setScheduleForm({
        name: c.name || "",
        dailyLimit: c.daily_limit || 100,
        startTime: c.start_time ? convertUTCToLocal(c.start_time) : "09:00",
        endTime: c.end_time ? convertUTCToLocal(c.end_time) : "18:00",
        daysOfWeek:
          c.days_of_week || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        messageContent: c.message_content || "",
      });
    }
  }

  async function createCampaign() {
    if (!newCampaignName.trim()) {
      alert("Please enter a campaign name!");
      return;
    }
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        name: newCampaignName.trim(),
        status: "draft",
      })
      .select()
      .single();
    if (error) {
      alert("Error creating campaign: " + error.message);
      return;
    }
    setCampaigns((prev) => [data, ...prev]);
    setSelectedCampaignId(data.id);
    setView("wizard");
    setWizardStep("leads");
    setNewCampaignName("");
  }

  // Handle CSV file upload and set dynamic mapping defaults
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

      // Attempt to auto-detect column mapping
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
        headers.find((header) =>
          phoneHeaderCandidates.includes(header.toLowerCase())
        ) || "";
      detectedMapping.first_name =
        headers.find((header) =>
          firstNameCandidates.includes(header.toLowerCase())
        ) || "";
      detectedMapping.last_name =
        headers.find((header) =>
          lastNameCandidates.includes(header.toLowerCase())
        ) || "";
      detectedMapping.company_name =
        headers.find((header) =>
          companyCandidates.includes(header.toLowerCase())
        ) || "";

      setCsvMapping(detectedMapping);

      alert("CSV loaded. Please adjust the mapping if needed.");
    } catch (err) {
      console.error(err);
      alert("Error reading CSV file: " + err.message);
    }
  }

  // Validate that phone contains only digits
  function validatePhone(phone) {
    return /^[0-9]+$/.test(phone);
  }

  // Import leads using the dynamic CSV mapping; only valid phone numbers are inserted.
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
      // Remove mapped columns from personalization
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
    // Clear CSV data and mapping, and hide the upload UI
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
      message += ` Skipped ${invalidCount} rows due to invalid phone numbers.`;
    }
    alert(message);
  }

  // Toggle day selection
  function toggleDay(d) {
    setScheduleForm((prev) => {
      const days = new Set(prev.daysOfWeek);
      if (days.has(d)) {
        days.delete(d);
      } else {
        days.add(d);
      }
      return { ...prev, daysOfWeek: Array.from(days) };
    });
  }

  // Save the schedule (without message content, which is handled in "sequence")
  async function saveSchedule() {
    // check how many backends the user has
    const { data: backends } = await supabase
      .from("backends")
      .select("id")
      .eq("user_id", user.id);
    const maxAllowed = (backends?.length || 0) * 100;
    const safeDailyLimit = Math.min(scheduleForm.dailyLimit, maxAllowed);

    const updates = {
      name: scheduleForm.name,
      daily_limit: safeDailyLimit,
      start_time: convertLocalTimeToUTC(scheduleForm.startTime),
      end_time: convertLocalTimeToUTC(scheduleForm.endTime),
      days_of_week: scheduleForm.daysOfWeek,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", selectedCampaignId);
    if (error) {
      alert("Error updating schedule: " + error.message);
      return;
    }
    alert("Schedule saved!");
    await loadCampaignDetails(selectedCampaignId);
  }

  // Save the message content in the separate "sequence" step
  async function saveSequence() {
    const { error } = await supabase
      .from("campaigns")
      .update({
        message_content: scheduleForm.messageContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedCampaignId);
    if (error) {
      alert("Error updating sequence: " + error.message);
      return;
    }
    alert("Sequence saved!");
    await loadCampaignDetails(selectedCampaignId);
  }

  async function launchCampaign() {
    if (!campaign) return;
    const { error } = await supabase
      .from("campaigns")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedCampaignId);
    if (error) {
      alert("Error launching campaign: " + error.message);
      return;
    }
    await loadCampaignDetails(selectedCampaignId);
    alert("Campaign launched!");
  }

  // Helper to map status to a badge color
  function getStatusColor(status) {
    switch (status) {
      case "active":
        return "green";
      case "paused":
        return "orange";
      case "draft":
      default:
        return "zinc";
    }
  }

  // --------------------------------------------------------
  // Additional functions to handle the triple-dot actions
  // --------------------------------------------------------

  // 1) Rename
  async function renameCampaign(c) {
    const newName = window.prompt("Enter a new name for this campaign:", c.name);
    if (!newName || !newName.trim()) {
      return; // canceled or empty
    }
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: newName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);
      if (error) {
        alert("Error renaming campaign: " + error.message);
        return;
      }
      alert(`Campaign renamed to: ${newName.trim()}`);
      // Re-load campaigns list
      const { data: refreshed, error: refreshErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!refreshErr && refreshed) {
        setCampaigns(refreshed);
      }
    } catch (err) {
      alert("Unexpected error renaming campaign: " + err.message);
    }
  }

  // 2) Delete
  async function deleteCampaign(c) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the campaign "${c.name}"?\nThis will also delete all associated leads and sends.`
    );
    if (!confirmed) return;

    try {
      // Delete leads and sends explicitly
      await supabase.from("campaign_leads").delete().eq("campaign_id", c.id);
      await supabase.from("campaign_sends").delete().eq("campaign_id", c.id);

      const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
      if (error) {
        alert("Error deleting campaign: " + error.message);
        return;
      }
      alert(`Deleted campaign: ${c.name}`);
      // Refresh the campaigns list
      const { data: refreshed, error: refreshErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!refreshErr && refreshed) {
        setCampaigns(refreshed);
      }
    } catch (err) {
      alert("Unexpected error deleting campaign: " + err.message);
    }
  }

  // 3) Duplicate
  async function duplicateCampaign(original) {
    const confirmed = window.confirm(
      `Duplicate the campaign "${original.name}" along with its leads?`
    );
    if (!confirmed) return;
    try {
      // Insert new campaign
      const newCampaignName = `${original.name} (copy)`;
      const insertData = {
        user_id: original.user_id,
        name: newCampaignName,
        status: "draft",
        daily_limit: original.daily_limit,
        start_time: original.start_time,
        end_time: original.end_time,
        days_of_week: original.days_of_week,
        message_content: original.message_content,
      };
      const { data: newCamp, error: campErr } = await supabase
        .from("campaigns")
        .insert(insertData)
        .select()
        .single();
      if (campErr) {
        alert("Error duplicating campaign: " + campErr.message);
        return;
      }
      // fetch original leads
      const { data: origLeads, error: leadErr } = await supabase
        .from("campaign_leads")
        .select("*")
        .eq("campaign_id", original.id);
      if (leadErr) {
        alert("Error reading original leads: " + leadErr.message);
        return;
      }
      if (origLeads && origLeads.length > 0) {
        // Insert them for the new campaign
        const leadsToInsert = origLeads.map((l) => ({
          campaign_id: newCamp.id,
          company_name: l.company_name,
          created_at: new Date().toISOString(),
          first_name: l.first_name,
          last_name: l.last_name,
          personalization: l.personalization,
          phone: l.phone,
          stop_sending: l.stop_sending,
        }));
        const { error: insLeadsErr } = await supabase
          .from("campaign_leads")
          .insert(leadsToInsert);
        if (insLeadsErr) {
          alert("Error inserting duplicated leads: " + insLeadsErr.message);
          return;
        }
      }
      alert(`Campaign duplicated as "${newCampaignName}".`);
      // Refresh list
      const { data: refreshed, error: refreshErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", original.user_id)
        .order("created_at", { ascending: false });
      if (!refreshErr && refreshed) {
        setCampaigns(refreshed);
      }
    } catch (err) {
      alert("Unexpected error duplicating campaign: " + err.message);
    }
  }

  // 4) Download analytics CSV
  async function downloadAnalyticsCSV(c) {
    // For example, let's fetch campaign_sends for this campaign, turn them into CSV
    try {
      const { data: sends, error } = await supabase
        .from("campaign_sends")
        .select("*")
        .eq("campaign_id", c.id);
      if (error) {
        alert("Error fetching sends: " + error.message);
        return;
      }
      if (!sends || sends.length === 0) {
        alert("No sends found for this campaign.");
        return;
      }
      // Convert to CSV
      const csv = Papa.unparse(sends, {
        quotes: false,
        delimiter: ",",
        newline: "\r\n",
      });
      // Create a Blob, download it
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `campaign_${c.id}_analytics.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error exporting CSV: " + err.message);
    }
  }

  // 5) Share campaign
  function shareCampaign(c) {
    alert(
      `Share link for campaign "${c.name}":\n` +
        `https://yourapp.example.com/public-campaign?c=${c.id}`
    );
  }

  // Toggle selection of a single lead (for batch deletion)
  function toggleLeadSelection(leadId) {
    setSelectedLeadIds((prev) => {
      if (prev.includes(leadId)) {
        return prev.filter((id) => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  }

  // Delete all selected leads
  async function handleDeleteSelectedLeads() {
    if (selectedLeadIds.length === 0) {
      alert("No leads selected.");
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedLeadIds.length} lead(s)?`
    );
    if (!confirmed) return;
    const { error } = await supabase
      .from("campaign_leads")
      .delete()
      .in("id", selectedLeadIds);
    if (error) {
      alert("Error deleting selected leads: " + error.message);
      return;
    }
    await loadCampaignDetails(selectedCampaignId);
    alert(`${selectedLeadIds.length} lead(s) deleted.`);
  }

  if (!user) {
    return (
      <div style={{ padding: "1rem" }}>
        <Heading level={2}>No user session found.</Heading>
      </div>
    );
  }

  // ----------------------
  // VIEW: list
  // ----------------------
  if (view === "list") {
    return (
      <div style={{ padding: "1rem" }}>
        <Heading>All Campaigns</Heading>
        <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
          <Button color="blue" onClick={() => setView("new")}>
            Start New Campaign
          </Button>
        </div>

        <Table bleed className="[--gutter:--spacing(6)] sm:[--gutter:--spacing(8)]">
          <TableHead>
            <TableRow>
              <TableHeader>
                <Checkbox aria-label="Select all campaigns" />
              </TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Progress</TableHeader>
              <TableHeader>Sent</TableHeader>
              <TableHeader>Click</TableHeader>
              <TableHeader>Replied</TableHeader>
              <TableHeader>
                <span className="sr-only">Actions</span>
              </TableHeader>
            </TableRow>
          </TableHead>

          <TableBody>
            {campaigns.map((c) => {
              // In a real app, you’d compute these stats from your data:
              const progress = 0; // e.g. (# leads completed / total leads)
              const sentCount = 0;
              const clickCount = 0;
              const repliedCount = 0;

              return (
                <TableRow
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedCampaignId(c.id);
                    setView("wizard");
                    setWizardStep("leads");
                  }}
                >
                  {/* Stop event for checkbox cell so it doesn't open wizard */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox aria-label={`Select ${c.name}`} />
                  </TableCell>

                  <TableCell style={{ fontWeight: 500 }}>{c.name}</TableCell>
                  <TableCell>
                    {c.status ? (
                      <Badge color={getStatusColor(c.status)}>{c.status}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{progress > 0 ? `${progress}%` : "-"}</TableCell>
                  <TableCell>{sentCount > 0 ? sentCount : "-"}</TableCell>
                  <TableCell>{clickCount > 0 ? clickCount : "-"}</TableCell>
                  <TableCell>{repliedCount > 0 ? repliedCount : "-"}</TableCell>

                  {/* Actions dropdown */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Dropdown>
                      <DropdownButton plain aria-label="More options">
                        <EllipsisHorizontalIcon className="size-5" />
                      </DropdownButton>
                      <DropdownMenu>
                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation();
                            renameCampaign(c);
                          }}
                        >
                          <PencilIcon className="size-4" />
                          <DropdownLabel>Rename</DropdownLabel>
                        </DropdownItem>

                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCampaign(c);
                          }}
                        >
                          <TrashIcon className="size-4" />
                          <DropdownLabel>Delete</DropdownLabel>
                        </DropdownItem>

                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateCampaign(c);
                          }}
                        >
                          <DocumentDuplicateIcon className="size-4" />
                          <DropdownLabel>Duplicate campaign</DropdownLabel>
                        </DropdownItem>

                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAnalyticsCSV(c);
                          }}
                        >
                          <ArrowDownTrayIcon className="size-4" />
                          <DropdownLabel>Download analytics CSV</DropdownLabel>
                        </DropdownItem>

                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation();
                            shareCampaign(c);
                          }}
                        >
                          <ShareIcon className="size-4" />
                          <DropdownLabel>Share Campaign</DropdownLabel>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              );
            })}

            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <em>No campaigns found.</em>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ----------------------
  // VIEW: new
  // ----------------------
  if (view === "new") {
    return (
      <div style={{ padding: "1rem" }}>
        <Heading>New Campaign</Heading>
        <Text className="mt-2">
          Name your campaign and proceed to the next step to import leads, set up
          your sequence, and schedule your SMS broadcast.
        </Text>
        <Fieldset style={{ marginTop: "1rem", maxWidth: "500px" }}>
          <Legend>Campaign Details</Legend>
          <FieldGroup>
            <Field>
              <Label>Campaign Name</Label>
              <Input
                name="campaignName"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </Fieldset>

        <div style={{ marginTop: "1.5rem" }}>
          <Button color="blue" onClick={createCampaign}>
            Create
          </Button>
          <Button plain onClick={() => setView("list")} style={{ marginLeft: 8 }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------
  // VIEW: wizard
  // ----------------------
  if (view === "wizard" && campaign) {
    return (
      <div style={{ padding: "1rem" }}>
        <Heading level={2}>
          Campaign: {campaign.name} (Status: {campaign.status})
        </Heading>

        {/* Navigation for wizard steps, plus leads actions if leads step */}
        <Navbar className="mt-6">
          <NavbarSection>
            <NavbarItem
              current={wizardStep === "leads"}
              onClick={() => setWizardStep("leads")}
            >
              Leads
            </NavbarItem>
            <NavbarItem
              current={wizardStep === "sequence"}
              onClick={() => setWizardStep("sequence")}
            >
              Sequence
            </NavbarItem>
            <NavbarItem
              current={wizardStep === "schedule"}
              onClick={() => setWizardStep("schedule")}
            >
              Schedule
            </NavbarItem>
            <NavbarItem
              current={wizardStep === "options"}
              onClick={() => setWizardStep("options")}
            >
              Options
            </NavbarItem>
          </NavbarSection>
          <NavbarSpacer />
          <NavbarSection>
            {wizardStep === "leads" && (
              <>
                <NavbarItem
                  onClick={handleDeleteSelectedLeads}
                  aria-label="Delete selected leads"
                >
                  <TrashIcon className="size-4" />
                </NavbarItem>
                <NavbarItem
                  onClick={() => setShowCsvUploadForm(true)}
                  aria-label="Add leads"
                >
                  <PlusIcon className="size-4" />
                </NavbarItem>
              </>
            )}
          </NavbarSection>
        </Navbar>

        {/* Step: Leads */}
        {wizardStep === "leads" && (
          <div style={{ marginTop: "2rem" }}>
            <Text>{leads.length} leads in this campaign.</Text>

            {/* CSV Upload & Mapping UI */}
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
                              setCsvMapping({
                                ...csvMapping,
                                phone: e.target.value,
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

                        <Field>
                          <Label>First Name</Label>
                          <select
                            value={csvMapping.first_name}
                            onChange={(e) =>
                              setCsvMapping({
                                ...csvMapping,
                                first_name: e.target.value,
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

                        <Field>
                          <Label>Last Name</Label>
                          <select
                            value={csvMapping.last_name}
                            onChange={(e) =>
                              setCsvMapping({
                                ...csvMapping,
                                last_name: e.target.value,
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
              <Text className="mt-4 text-sm text-gray-600">
                No leads yet. Click the plus icon above to add leads.
              </Text>
            )}
          </div>
        )}

        {/* Step: Sequence */}
        {wizardStep === "sequence" && (
          <div style={{ marginTop: "2rem" }}>
            <Subheading>Sequence</Subheading>
            <Fieldset style={{ marginTop: "1.5rem", maxWidth: 500 }}>
              <Legend>Message Settings</Legend>
              <FieldGroup>
                <Field>
                  <Label>Message Content</Label>
                  <Textarea
                    rows={3}
                    value={scheduleForm.messageContent}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        messageContent: e.target.value,
                      })
                    }
                  />
                  <Description>
                    This is the single SMS message to send to each lead.
                  </Description>
                </Field>
              </FieldGroup>
            </Fieldset>
            <div style={{ marginTop: "1.5rem" }}>
              <Button color="blue" onClick={saveSequence}>
                Save Sequence
              </Button>
            </div>
          </div>
        )}

        {/* Step: Schedule */}
        {wizardStep === "schedule" && (
          <div style={{ marginTop: "2rem" }}>
            <Subheading>Schedule</Subheading>
            <Fieldset style={{ marginTop: "1.5rem", maxWidth: 500 }}>
              <Legend>Campaign Settings</Legend>
              <FieldGroup>
                <Field>
                  <Label>Campaign Name</Label>
                  <Input
                    name="scheduleName"
                    value={scheduleForm.name}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, name: e.target.value })
                    }
                  />
                </Field>

                <Field>
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    value={scheduleForm.dailyLimit}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        dailyLimit: Number(e.target.value),
                      })
                    }
                  />
                  <Description>
                    Max texts per day. Actual max depends on available backends.
                  </Description>
                </Field>

                <Field>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        startTime: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        endTime: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field>
                  <Label>Days of Week</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((d) => {
                      const checked = scheduleForm.daysOfWeek.includes(d);
                      return (
                        <label
                          key={d}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <Checkbox
                            checked={checked}
                            onChange={() => toggleDay(d)}
                          />
                          <span style={{ marginLeft: 4 }}>{d}</span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </FieldGroup>
            </Fieldset>
            <div style={{ marginTop: "1.5rem" }}>
              <Button color="blue" onClick={saveSchedule}>
                Save Schedule
              </Button>
            </div>
          </div>
        )}

        {/* Step: Options */}
        {wizardStep === "options" && (
          <div style={{ marginTop: "2rem" }}>
            <Subheading>Options</Subheading>
            <Text className="mt-2">Current status: {campaign.status}</Text>
            <div style={{ marginTop: "1rem" }}>
              <Button
                color="green"
                disabled={campaign.status === "active"}
                onClick={launchCampaign}
              >
                Launch Campaign
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
