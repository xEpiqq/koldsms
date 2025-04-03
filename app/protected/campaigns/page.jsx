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
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ShareIcon,
} from "@heroicons/react/16/solid";
import { useRouter } from "next/navigation";

/**
 * A single file that shows a campaigns list in a table
 * with these columns: [select], Name, Status, Progress, Sent, Click, Replied,
 * plus the wizard for leads/schedule/options.
 */

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
  const [wizardStep, setWizardStep] = useState("leads");

  // leads
  const [leads, setLeads] = useState([]);
  // We still keep CSV data logic around, in case you need it behind "Add leads" eventually
  const [csvData, setCsvData] = useState([]); // parsed rows
  const [csvHeaders, setCsvHeaders] = useState([]); // columns
  const [selectedPhoneHeader, setSelectedPhoneHeader] = useState("");

  // schedule form
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

    if (c) {
      setScheduleForm({
        name: c.name,
        dailyLimit: c.daily_limit,
        startTime: convertUTCToLocal(c.start_time),
        endTime: convertUTCToLocal(c.end_time),
        daysOfWeek: c.days_of_week || [],
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

      const phoneHeaderCandidates = ["phone", "phone number", "phone numbers"];
      const foundPhoneHeader = headers.find((header) =>
        phoneHeaderCandidates.includes(header.toLowerCase())
      );
      if (foundPhoneHeader) {
        setSelectedPhoneHeader(foundPhoneHeader);
      } else {
        setSelectedPhoneHeader("");
      }
      alert("CSV loaded. You can handle uploading logic here.");
    } catch (err) {
      console.error(err);
      alert("Error reading CSV file: " + err.message);
    }
  }

  async function importLeads() {
    if (!selectedCampaignId) {
      alert("No campaign selected.");
      return;
    }
    if (!selectedPhoneHeader) {
      alert("Please select the phone column first.");
      return;
    }
    if (!csvData || csvData.length === 0) {
      alert("No CSV data loaded.");
      return;
    }
    const leadsToInsert = [];
    for (const row of csvData) {
      const phoneValue = row[selectedPhoneHeader]?.toString().trim();
      if (!phoneValue) continue;
      leadsToInsert.push({
        campaign_id: selectedCampaignId,
        phone: phoneValue,
        personalization: row,
      });
    }
    if (leadsToInsert.length === 0) {
      alert("No valid phone numbers found in that column.");
      return;
    }
    const { error } = await supabase.from("campaign_leads").insert(leadsToInsert);
    if (error) {
      alert("Error inserting leads: " + error.message);
      return;
    }
    await loadCampaignDetails(selectedCampaignId);
    setCsvData([]);
    setCsvHeaders([]);
    setSelectedPhoneHeader("");
    alert("Imported leads successfully!");
  }

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

  async function saveSchedule() {
    // check how many backends the user has
    const { data: backends } = await supabase
      .from("backends")
      .select("id")
      .eq("user_id", user.id);
    const maxAllowed = (backends?.length || 0) * 100;
    const safeDailyLimit = Math.min(scheduleForm.dailyLimit, maxAllowed);

    const { error } = await supabase
      .from("campaigns")
      .update({
        name: scheduleForm.name,
        daily_limit: safeDailyLimit,
        start_time: convertLocalTimeToUTC(scheduleForm.startTime),
        end_time: convertLocalTimeToUTC(scheduleForm.endTime),
        days_of_week: scheduleForm.daysOfWeek,
        message_content: scheduleForm.messageContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedCampaignId);
    if (error) {
      alert("Error updating schedule: " + error.message);
      return;
    }
    alert("Schedule saved!");
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
      // Optionally delete leads and sends. 
      // If your DB is set up with ON CASCADE, just deleting the campaign might be enough.
      // Here, let's do it explicitly:
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
        .eq("user_id", user.id)
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
    // For a real app, you might generate a public link or a shared token.
    // We'll just do a quick alert with an example link
    alert(
      `Share link for campaign "${c.name}":\n` +
        `https://yourapp.example.com/public-campaign?c=${c.id}`
    );
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
          Name your campaign and proceed to the next step to import leads and
          schedule your SMS broadcast.
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
        {/* Top header with heading, wizard nav, plus a button if step=leads */}
        <div className="flex w-full flex-wrap items-end justify-between gap-4 border-b border-zinc-950/10 pb-6 dark:border-white/10">
          <Heading level={2}>
            Campaign: {campaign.name} (Status: {campaign.status})
          </Heading>
          <div className="flex gap-4">
            <Button
              outline={wizardStep !== "leads"}
              color={wizardStep === "leads" ? "blue" : "dark"}
              onClick={() => setWizardStep("leads")}
            >
              Leads
            </Button>
            <Button
              outline={wizardStep !== "schedule"}
              color={wizardStep === "schedule" ? "blue" : "dark"}
              onClick={() => setWizardStep("schedule")}
            >
              Schedule
            </Button>
            <Button
              outline={wizardStep !== "options"}
              color={wizardStep === "options" ? "blue" : "dark"}
              onClick={() => setWizardStep("options")}
            >
              Options
            </Button>

            {wizardStep === "leads" && (
              <Button
                color="blue"
                onClick={() => {
                  alert("Show your Add leads UI here!");
                }}
              >
                Add leads
              </Button>
            )}
          </div>
        </div>

        {/* Step: Leads */}
        {wizardStep === "leads" && (
          <div style={{ marginTop: "2rem" }}>
            <Subheading>Leads</Subheading>
            <Text className="mt-2">{leads.length} leads in this campaign.</Text>

            {leads.length > 0 ? (
              <div style={{ marginTop: "2rem" }}>
                <Table
                  bleed
                  striped
                  className="[--gutter:--spacing(6)] sm:[--gutter:--spacing(8)] mt-2"
                >
                  <TableHead>
                    <TableRow>
                      <TableHeader>Phone</TableHeader>
                      <TableHeader>Created At</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.phone}</TableCell>
                        <TableCell>{l.created_at}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Text className="mt-4 text-sm text-gray-600">
                No leads yet. Click "Add leads" above.
              </Text>
            )}
          </div>
        )}

        {/* Step: Schedule */}
        {wizardStep === "schedule" && (
          <div style={{ marginTop: "2rem" }}>
            <Subheading>Schedule (Single-Step Text)</Subheading>
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
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}
                  >
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
