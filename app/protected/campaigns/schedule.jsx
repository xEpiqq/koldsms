"use client";

import React from "react";
import { Button } from "@/components/button";
import {
  Fieldset,
  Legend,
  FieldGroup,
  Field,
  Label,
  Description,
} from "@/components/fieldset";
import { Input } from "@/components/input";
import { Checkbox } from "@/components/checkbox";

export default function ScheduleStep({
  scheduleForm,
  setScheduleForm,
  saveSchedule,
  toggleDay,
}) {
  const allDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 className="text-lg font-semibold">Schedule</h2>
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
                setScheduleForm({ ...scheduleForm, dailyLimit: Number(e.target.value) })
              }
            />
            <Description>Max texts per day (depends on backends).</Description>
          </Field>
          <Field>
            <Label>Start Time</Label>
            <Input
              type="time"
              value={scheduleForm.startTime}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, startTime: e.target.value })
              }
            />
          </Field>
          <Field>
            <Label>End Time</Label>
            <Input
              type="time"
              value={scheduleForm.endTime}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, endTime: e.target.value })
              }
            />
          </Field>
          <Field>
            <Label>Days of Week</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {allDays.map((d) => {
                const checked = scheduleForm.daysOfWeek.includes(d);
                return (
                  <label key={d} style={{ display: "flex", alignItems: "center" }}>
                    <Checkbox checked={checked} onChange={() => toggleDay(d)} />
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
  );
}
