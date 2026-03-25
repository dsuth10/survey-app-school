import React from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Avatar,
  Switch,
} from "@heroui/react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function HeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4">
      <Switch
        isSelected={theme === "dark"}
        onValueChange={toggleTheme}
        size="sm"
        color="secondary"
        startContent={<span>🌙</span>}
        endContent={<span>☀️</span>}
      />
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Avatar
            isBordered
            as="button"
            className="transition-transform"
            color="primary"
            name={user?.username || "User"}
            size="sm"
          />
        </DropdownTrigger>
        <DropdownMenu aria-label="Profile Actions" variant="flat">
          <DropdownItem key="profile" className="h-14 gap-2">
            <p className="font-semibold">Signed in as</p>
            <p className="font-semibold">{user?.username}</p>
          </DropdownItem>
          <DropdownItem key="settings" onClick={() => navigate("/settings")}>
            My Settings
          </DropdownItem>
          <DropdownItem 
            key="logout" 
            color="danger" 
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log Out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
