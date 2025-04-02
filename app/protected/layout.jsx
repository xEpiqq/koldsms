import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { StackedLayout } from "@/components/stacked-layout";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
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
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/sidebar";
import {
  ArrowRightStartOnRectangleIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/16/solid";
import "@/app/globals.css";

export default async function ProtectedLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <StackedLayout
      navbar={
        <Navbar>
          {/* Left logo + text replaced with your files using plain img tags */}
          <NavbarItem className="max-lg:hidden">
            <img src="/koldsmslogo.png" alt="koldsms logo" className="h-6" />
            <NavbarLabel>
              <img
                src="/koldsmslogotext.png"
                alt="koldsms"
                className="h-4"
              />
            </NavbarLabel>
          </NavbarItem>
          <NavbarDivider className="max-lg:hidden" />
          {/* Navigation links */}
          <NavbarSection className="max-lg:hidden">
            <NavbarItem href="/protected/campaigns">
              Campaigns
            </NavbarItem>
            <NavbarItem href="/protected/unibox">
              Inbox
            </NavbarItem>
          </NavbarSection>
          <NavbarSpacer />
          {/* User dropdown */}
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <img src="/profile-photo.jpg" alt="profile" className="h-8" />
              </DropdownButton>
              <DropdownMenu className="min-w-64" anchor="bottom end">
                <DropdownItem href="/my-profile">
                  <UserIcon />
                  <DropdownLabel>My profile</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/settings">
                  <Cog8ToothIcon />
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/privacy-policy">
                  <ShieldCheckIcon />
                  <DropdownLabel>Privacy policy</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/share-feedback">
                  <LightBulbIcon />
                  <DropdownLabel>Share feedback</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/logout">
                  <ArrowRightStartOnRectangleIcon />
                  <DropdownLabel>Sign out</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            {/* Sidebar logo + text replaced with your files using plain img tags */}
            <SidebarItem className="lg:mb-2.5">
              <img src="/koldsmslogo.png" alt="koldsms logo" className="h-8" />
              <SidebarLabel>
                <img
                  src="/koldsmslogotext.png"
                  alt="koldsms"
                  className="h-4"
                />
              </SidebarLabel>
            </SidebarItem>
          </SidebarHeader>
          <SidebarBody>
            {/* Sidebar navigation links */}
            <SidebarSection>
              <SidebarItem href="/protected/campaigns">
                Campaigns
              </SidebarItem>
              <SidebarItem href="/protected/unibox">
                Inbox
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      {children}
    </StackedLayout>
  );
}
