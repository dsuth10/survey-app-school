import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
} from "@heroui/react";
import { useNavigate, useLocation } from "react-router-dom";

import HeaderActions from "./HeaderActions";
import { useAuth } from "../contexts/AuthContext";

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Browse", path: "/browse" },
    { label: "Create Survey", path: "/create" },
    ...(user?.role === "admin" ? [{ label: "Admin", path: "/admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isBordered isBlurred position="sticky">
        <NavbarBrand>
          <p className="font-bold text-inherit cursor-pointer" onClick={() => navigate("/dashboard")}>
            SURVEY APP
          </p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          {navItems.map((item) => (
            <NavbarItem key={item.path} isActive={location.pathname === item.path}>
              <Link
                color={location.pathname === item.path ? "primary" : "foreground"}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>
        <NavbarContent justify="end">
          <HeaderActions />
        </NavbarContent>
      </Navbar>
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        {children}
      </main>
    </div>
  );
}
