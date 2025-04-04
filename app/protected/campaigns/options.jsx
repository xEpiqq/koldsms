"use client";

import React from "react";
import { Button } from "@/components/button";
import { Subheading } from "@/components/heading";

export default function OptionsStep({ campaign, launchCampaign }) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <Subheading>Options</Subheading>
      <p className="mt-2">Current status: {campaign.status}</p>
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
  );
}
