"use client";

import React from "react";
import { Heading } from "@/components/heading";
import {
  Navbar,
  NavbarSection,
  NavbarSpacer,
  NavbarItem,
} from "@/components/navbar";
import { TrashIcon, PlusIcon } from "@heroicons/react/16/solid";

import LeadsStep from "./leads";
import SequenceStep from "./sequence";
import ScheduleStep from "./schedule";
import OptionsStep from "./options";

/**
 * The Wizard is only shown if we have a `campaign` selected.
 * It receives from the parent:
 *   - wizardStep, setWizardStep
 *   - campaign, selectedCampaignId
 *   - leads, selectedLeadIds, etc.
 *   - plus the scheduleForm and supabase references
 */
export default function Wizard({
  wizardStep,
  setWizardStep,
  campaign,
  selectedCampaignId,
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
  loadCampaignDetails,
  scheduleForm,
  setScheduleForm,
}) {
  // --------------
  // Wizard Action: Delete selected leads
  // --------------
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

  // --------------
  // Toggle day
  // --------------
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

  // --------------
  // Save schedule
  // --------------
  async function saveSchedule() {
    // daily limit check
    const {
      data: backends,
      error: beError,
    } = await supabase.from("backends").select("id").eq("user_id", campaign.user_id);
    if (beError) {
      alert("Error checking backends: " + beError.message);
      return;
    }
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

  // --------------
  // Save sequence
  // --------------
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

  // --------------
  // Launch campaign
  // --------------
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

  if (!campaign) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2>No campaign selected.</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <Heading level={2}>
        Campaign: {campaign.name} (Status: {campaign.status})
      </Heading>

      {/* Navbar for wizard steps */}
      <Navbar className="mt-6">
        <NavbarSection>
          <NavbarItem current={wizardStep === "leads"} onClick={() => setWizardStep("leads")}>
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

      {/* The actual wizard content */}
      {wizardStep === "leads" && (
        <LeadsStep
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
          selectedCampaignId={selectedCampaignId}
          loadCampaignDetails={loadCampaignDetails}
        />
      )}
      {wizardStep === "sequence" && (
        <SequenceStep
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          saveSequence={saveSequence}
        />
      )}
      {wizardStep === "schedule" && (
        <ScheduleStep
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          saveSchedule={saveSchedule}
          toggleDay={toggleDay}
        />
      )}
      {wizardStep === "options" && (
        <OptionsStep campaign={campaign} launchCampaign={launchCampaign} />
      )}
    </div>
  );
}
