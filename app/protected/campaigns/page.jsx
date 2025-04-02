"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Papa from "papaparse";

export default function CampaignsPage() {
  // Supabase client in the browser
  const supabase = createClient();

  // Auth user
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

  // Wizard step: "leads", "schedule", "options"
  const [wizardStep, setWizardStep] = useState("leads");

  // leads
  const [leads, setLeads] = useState([]);
  const [csvData, setCsvData] = useState([]);       // parsed rows
  const [csvHeaders, setCsvHeaders] = useState([]);   // columns
  const [selectedPhoneHeader, setSelectedPhoneHeader] = useState("");

  // schedule form
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    dailyLimit: 100,
    startTime: "09:00",
    endTime: "18:00",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    messageContent: "", // single step message
  });

  /**
   * On mount, check user, fetch campaigns
   */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        setUser(null);
        return;
      }
      setUser(user);

      const { data: c } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setCampaigns(c || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load campaign details if wizard
   */
  useEffect(() => {
    if (view !== "wizard" || !selectedCampaignId) return;
    loadCampaignDetails(selectedCampaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedCampaignId]);

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

    // set schedule form from campaign
    if (c) {
      setScheduleForm({
        name: c.name,
        dailyLimit: c.daily_limit,
        startTime: c.start_time,
        endTime: c.end_time,
        daysOfWeek: c.days_of_week || [],
        messageContent: c.message_content || "",
      });
    }
  }

  /**
   * Create a new campaign
   */
  async function createCampaign() {
    if (!newCampaignName.trim()) {
      alert("Please enter a campaign name!");
      return;
    }
    // create with status 'draft', user_id, name
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

  /**
   * CSV parsing
   */
  async function handleCsvFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });
      // Filter out field mismatch errors that occur if a row doesn't have all columns.
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

      // Auto-select phone header if a common candidate is found
      const phoneHeaderCandidates = ["phone", "phone number", "phone numbers"];
      const foundPhoneHeader = headers.find((header) =>
        phoneHeaderCandidates.includes(header.toLowerCase())
      );
      if (foundPhoneHeader) {
        setSelectedPhoneHeader(foundPhoneHeader);
      } else {
        setSelectedPhoneHeader("");
      }
      alert("CSV loaded. Select which column is phone and then import.");
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
      alert("No valid phone numbers found.");
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

  /**
   * handle schedule form
   */
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
        start_time: scheduleForm.startTime,
        end_time: scheduleForm.endTime,
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
  }

  if (!user) {
    return <div className="text-red-500">No user session found.</div>;
  }

  // list view
  if (view === "list") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded"
          onClick={() => setView("new")}
        >
          Start New Campaign
        </button>
        {campaigns.length === 0 ? (
          <p className="text-gray-600">No campaigns yet.</p>
        ) : (
          <table className="min-w-full mt-2 border-collapse border text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Daily Limit</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">Updated</th>
                <th className="p-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.status}</td>
                  <td className="p-2">{c.daily_limit}</td>
                  <td className="p-2">{c.created_at}</td>
                  <td className="p-2">{c.updated_at}</td>
                  <td className="p-2">
                    <button
                      className="underline text-blue-600"
                      onClick={() => {
                        setSelectedCampaignId(c.id);
                        setView("wizard");
                        setWizardStep("leads");
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // new campaign
  if (view === "new") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">New Campaign</h1>
        <div>
          <label className="block mb-1">Campaign Name:</label>
          <input
            type="text"
            className="border p-1"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded"
            onClick={createCampaign}
          >
            Create
          </button>
          <button className="underline" onClick={() => setView("list")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // wizard
  if (view === "wizard" && campaign) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">
          Campaign: {campaign.name} (Status: {campaign.status})
        </h1>
        {/* Wizard tabs: leads, schedule, options */}
        <div className="flex space-x-4 border-b pb-2">
          <button
            className={`${wizardStep === "leads" ? "font-bold" : ""} underline text-blue-600`}
            onClick={() => setWizardStep("leads")}
          >
            Leads
          </button>
          <button
            className={`${wizardStep === "schedule" ? "font-bold" : ""} underline text-blue-600`}
            onClick={() => setWizardStep("schedule")}
          >
            Schedule
          </button>
          <button
            className={`${wizardStep === "options" ? "font-bold" : ""} underline text-blue-600`}
            onClick={() => setWizardStep("options")}
          >
            Options
          </button>
          <button
            className="underline text-blue-600 ml-auto"
            onClick={() => setView("list")}
          >
            Back to Campaigns
          </button>
        </div>

        {wizardStep === "leads" && (
          <div>
            <h2 className="text-lg font-semibold">Leads</h2>
            <p className="text-sm text-gray-600 mb-2">
              {leads.length} leads in this campaign.
            </p>
            <div className="mb-4">
              <label className="block mb-1">Select a CSV File:</label>
              <input
                type="file"
                accept=".csv"
                className="border p-1"
                onChange={(e) => {
                  if (e.target.files?.length > 0) {
                    handleCsvFile(e.target.files[0]);
                    e.target.value = "";
                  }
                }}
              />
            </div>
            {csvHeaders.length > 0 && (
              <div className="mb-4">
                <label className="block mb-1">
                  Which column is the phone number?
                </label>
                <select
                  className="border p-1"
                  value={selectedPhoneHeader}
                  onChange={(e) => setSelectedPhoneHeader(e.target.value)}
                >
                  <option value="">-- Select Column --</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {csvHeaders.length > 0 && (
              <button
                className="bg-blue-600 text-white px-4 py-1 rounded"
                onClick={importLeads}
              >
                Import Leads
              </button>
            )}
            {leads.length > 0 && (
              <table className="min-w-full border-collapse border text-sm mt-6">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-2">{l.phone}</td>
                      <td className="p-2">{l.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {wizardStep === "schedule" && (
          <div>
            <h2 className="text-lg font-semibold">
              Schedule (Single-Step Text)
            </h2>
            <div className="mb-4">
              <label className="block mb-1 font-medium">
                Campaign Name:
              </label>
              <input
                className="border p-1"
                value={scheduleForm.name}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, name: e.target.value })
                }
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">
                Daily Limit:
              </label>
              <input
                className="border p-1"
                type="number"
                value={scheduleForm.dailyLimit}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    dailyLimit: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">
                Start Time:
              </label>
              <input
                className="border p-1"
                type="time"
                value={scheduleForm.startTime}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, startTime: e.target.value })
                }
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">
                End Time:
              </label>
              <input
                className="border p-1"
                type="time"
                value={scheduleForm.endTime}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, endTime: e.target.value })
                }
              />
            </div>
            <div className="mb-4">
              <p className="font-medium">Days of Week:</p>
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
                  <label key={d} className="block">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked}
                      onChange={() => toggleDay(d)}
                    />
                    {d}
                  </label>
                );
              })}
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">
                Message Content (Single Text):
              </label>
              <textarea
                className="border p-1 w-full"
                rows={3}
                value={scheduleForm.messageContent}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    messageContent: e.target.value,
                  })
                }
              />
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded"
              onClick={saveSchedule}
            >
              Save Schedule
            </button>
          </div>
        )}

        {wizardStep === "options" && (
          <div>
            <h2 className="text-lg font-semibold">Options</h2>
            <p className="mb-4">Current status: {campaign.status}</p>
            <button
              className="bg-green-600 text-white px-4 py-1 rounded"
              disabled={campaign.status === "active"}
              onClick={launchCampaign}
            >
              Launch Campaign
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
