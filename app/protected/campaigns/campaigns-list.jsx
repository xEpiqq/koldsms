"use client";

import React from "react";
import { Heading, Text } from "@/components/heading";
import { Button } from "@/components/button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/table";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
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

export default function CampaignsList({
  campaigns,
  setView,
  renameCampaign,
  deleteCampaign,
  duplicateCampaign,
  downloadAnalyticsCSV,
  shareCampaign,
  setSelectedCampaignId,
  setWizardStep,
}) {
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
            // placeholders for now
            const progress = 0;
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

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Dropdown>
                    <DropdownButton plain aria-label="More options">
                      <EllipsisHorizontalIcon className="size-5" />
                    </DropdownButton>
                    <DropdownMenu>
                      <DropdownItem onClick={(e) => {
                        e.stopPropagation();
                        renameCampaign(c);
                      }}>
                        <PencilIcon className="size-4" />
                        <DropdownLabel>Rename</DropdownLabel>
                      </DropdownItem>
                      <DropdownItem onClick={(e) => {
                        e.stopPropagation();
                        deleteCampaign(c);
                      }}>
                        <TrashIcon className="size-4" />
                        <DropdownLabel>Delete</DropdownLabel>
                      </DropdownItem>
                      <DropdownItem onClick={(e) => {
                        e.stopPropagation();
                        duplicateCampaign(c);
                      }}>
                        <DocumentDuplicateIcon className="size-4" />
                        <DropdownLabel>Duplicate campaign</DropdownLabel>
                      </DropdownItem>
                      <DropdownItem onClick={(e) => {
                        e.stopPropagation();
                        downloadAnalyticsCSV(c);
                      }}>
                        <ArrowDownTrayIcon className="size-4" />
                        <DropdownLabel>Download analytics CSV</DropdownLabel>
                      </DropdownItem>
                      <DropdownItem onClick={(e) => {
                        e.stopPropagation();
                        shareCampaign(c);
                      }}>
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
