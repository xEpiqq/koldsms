"use client";

import React from "react";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text"; // <-- Make sure this exists in your project
import { Button } from "@/components/button";
import { Fieldset, Legend, FieldGroup, Field, Label } from "@/components/fieldset";
import { Input } from "@/components/input";

export default function NewCampaign({
  newCampaignName,
  setNewCampaignName,
  createCampaign,
  setView,
}) {
  return (
    <div style={{ padding: "1rem" }}>
      <Heading>New Campaign</Heading>
      <Text className="mt-2">
        Name your campaign, then proceed to import leads, schedule your SMS, etc.
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
