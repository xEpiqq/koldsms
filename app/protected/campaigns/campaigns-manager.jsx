"use client";

import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/utils/supabase/client";

import CampaignsList from "./campaigns-list";
import NewCampaign from "./new-campaign";
import Wizard from "./wizard";

export default function CampaignsManager() {
  const supabase = createClient();
  const [user, setUser] = useState(null);

  // View states: "list" | "new" | "wizard"
  const [view, setView] = useState("list");

  // All user campaigns
  const [campaigns, setCampaigns] = useState([]);

  // For creating a new campaign
  const [newCampaignName, setNewCampaignName] = useState("");

  // Wizard state
  const [wizardStep, setWizardStep] = useState("leads");
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // CSV states for leads
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvMapping, setCsvMapping] = useState({
    phone: "",
    first_name: "",
    last_name: "",
    company_name: "",
  });
  const [showCsvUploadForm, setShowCsvUploadForm] = useState(false);

  // Combined schedule/sequence form state
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    dailyLimit: 100,
    startTime: "09:00",
    endTime: "18:00",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    messageContent: "",
  });

  // ----------------------------
  // 1) On mount, load user + campaigns
  // ----------------------------
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

      // load campaigns
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

  // ----------------------------
  // 2) Whenever we go wizard mode, load that campaign details
  // ----------------------------
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

    setSelectedLeadIds([]);

    // Populate schedule form
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

  // ----------------------------
  // 3) Create new campaign
  // ----------------------------
  async function createCampaign() {
    if (!newCampaignName.trim()) {
      alert("Please enter a campaign name.");
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
    // Insert new campaign at top of the list
    setCampaigns((prev) => [data, ...prev]);
    // Switch to wizard view
    setSelectedCampaignId(data.id);
    setView("wizard");
    setWizardStep("leads");
    setNewCampaignName("");
  }

  // ----------------------------
  // 4) Helpers to convert times
  // ----------------------------
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
    const utcDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), utcHours, utcMinutes, 0)
    );
    const localHours = utcDate.getHours();
    const localMinutes = utcDate.getMinutes();
    return `${String(localHours).padStart(2, "0")}:${String(localMinutes).padStart(
      2,
      "0"
    )}`;
  }

  // ----------------------------
  // 5) Triple-dot actions
  // ----------------------------
  async function renameCampaign(c) {
    const newName = window.prompt("Enter a new name for this campaign:", c.name);
    if (!newName || !newName.trim()) {
      return;
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
      // refresh the list
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

  async function deleteCampaign(c) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the campaign "${c.name}"?\nThis will also delete all associated leads and sends.`
    );
    if (!confirmed) return;

    try {
      // 1) delete leads and sends
      await supabase.from("campaign_leads").delete().eq("campaign_id", c.id);
      await supabase.from("campaign_sends").delete().eq("campaign_id", c.id);

      // 2) delete the campaign
      const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
      if (error) {
        alert("Error deleting campaign: " + error.message);
        return;
      }
      alert(`Deleted campaign: ${c.name}`);

      // 3) refresh
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

  async function duplicateCampaign(original) {
    const confirmed = window.confirm(
      `Duplicate the campaign "${original.name}" along with its leads?`
    );
    if (!confirmed) return;
    try {
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
      // leads copy
      const { data: origLeads, error: leadErr } = await supabase
        .from("campaign_leads")
        .select("*")
        .eq("campaign_id", original.id);
      if (leadErr) {
        alert("Error reading leads: " + leadErr.message);
        return;
      }
      if (origLeads && origLeads.length > 0) {
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
      // refresh
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

  async function downloadAnalyticsCSV(c) {
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
      const csv = Papa.unparse(sends, {
        quotes: false,
        delimiter: ",",
        newline: "\r\n",
      });
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

  function shareCampaign(c) {
    alert(
      `Share link for campaign "${c.name}":\n` +
        `https://yourapp.example.com/public-campaign?c=${c.id}`
    );
  }

  // ----------------------------
  // 6) If no user, bail out
  // ----------------------------
  if (!user) {
    return <div>No user session found.</div>;
  }

  // ----------------------------
  // 7) Decide which “view” to render
  // ----------------------------
  switch (view) {
    case "list":
      return (
        <CampaignsList
          campaigns={campaigns}
          setView={setView}
          renameCampaign={renameCampaign}
          deleteCampaign={deleteCampaign}
          duplicateCampaign={duplicateCampaign}
          downloadAnalyticsCSV={downloadAnalyticsCSV}
          shareCampaign={shareCampaign}
          setSelectedCampaignId={setSelectedCampaignId}
          setWizardStep={setWizardStep}
        />
      );

    case "new":
      return (
        <NewCampaign
          newCampaignName={newCampaignName}
          setNewCampaignName={setNewCampaignName}
          createCampaign={createCampaign}
          setView={setView}
        />
      );

    case "wizard":
      return (
        <Wizard
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          campaign={campaign}
          selectedCampaignId={selectedCampaignId}
          leads={leads}
          selectedLeadIds={selectedLeadIds}
          setSelectedLeadIds={setSelectedLeadIds}
          showCsvUploadForm={showCsvUploadForm}
          setShowCsvUploadForm={setShowCsvUploadForm}
          csvData={csvData}
          setCsvData={setCsvData}
          csvHeaders={csvHeaders}
          setCsvHeaders={setCsvHeaders}
          csvMapping={csvMapping}
          setCsvMapping={setCsvMapping}
          supabase={supabase}
          loadCampaignDetails={loadCampaignDetails}
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
        />
      );

    default:
      return null;
  }
}
