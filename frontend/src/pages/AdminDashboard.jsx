import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  useDisclosure,
} from "@heroui/react";
import { useAuth } from "../contexts/AuthContext";

const ROLES = ["student", "teacher", "admin"];

function parseCSV(text) {
  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // Header parsing: normalize to lowercase and remove spaces
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/\s/g, ""));
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Simple CSV parser that handles basic quoted values
    // For a production app, a library like PapaParse would be better, 
    // but for this specific use case we keep it simple.
    const values = lines[i].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function mapCSVRowToUser(row) {
  // Helper to get value regardless of exact header property name capitalization/spacing
  const get = (k) => {
    const key = k.toLowerCase().replace(/\s/g, "");
    const val = row[key] ?? row[k] ?? '';
    return val.trim();
  };
  
  return {
    username: get("username"),
    displayName: get("displayname") || get("displayName"),
    role: (get("role") || "student").toLowerCase(),
    class: get("class"),
    yearLevel: get("yearlevel") || get("yearLevel"),
    password: get("password"),
  };
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastLogin(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleString();
}

function roleBadgeClass(role) {
  if (role === "admin")
    return "px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20";
  if (role === "teacher")
    return "px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800";
  return "px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
}

export default function AdminDashboard() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("users");
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [allTeachers, setAllTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    role: "",
    classId: "",
    yearLevel: "",
    activeOnly: false,
  });
  const [overviewStats, setOverviewStats] = useState({ 
    totalStudents: 0, 
    activeSurveys: 0, 
    pendingResponses: 0, 
    recentActivity: [] 
  });
  const [surveyAnalytics, setSurveyAnalytics] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const perPage = 25;
  const [message, setMessage] = useState({ type: "", text: "" });
  const [importing, setImporting] = useState(false);
  const [downloadingExample, setDownloadingExample] = useState(false);

  // Modals
  const addUserModal = useDisclosure();
  const editUserModal = useDisclosure();
  const importModal = useDisclosure();
  const addClassModal = useDisclosure();
  const editClassModal = useDisclosure();
  const classStudentsModal = useDisclosure();

  const [formUser, setFormUser] = useState({
    username: "",
    displayName: "",
    role: "student",
    classId: "",
    yearLevel: "",
    password: "",
    isActive: true,
  });
  const [editUserId, setEditUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [classForm, setClassForm] = useState({ name: "", teacherId: "none" });
  const [editClassId, setEditClassId] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classStudentIds, setClassStudentIds] = useState([]);
  const [savingClass, setSavingClass] = useState(false);

  // Derived from paginated user list (current page only)
  const students = users.filter((u) => u.role === "student");
  // teachers comes from a dedicated fetch so it's always complete regardless of pagination
  const teachers = allTeachers;

  const handleDownloadExample = async () => {
    setDownloadingExample(true);
    try {
      const resp = await axios.get('/example-users.csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'example-users.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setMessage({ type: 'error', text: 'Failed to download example CSV' });
    } finally {
      setDownloadingExample(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const pageLimit = 1000;
      // Use backend pagination to ensure "all users" even if dataset grows.
      const firstRes = await axios.get(`/api/admin/users?limit=${pageLimit}`);
      const firstData = firstRes.data ?? {};
      const firstUsers = Array.isArray(firstData.users)
        ? firstData.users
        : Array.isArray(firstRes.data)
          ? firstRes.data
          : [];
      const total = typeof firstData.total === "number" ? firstData.total : firstUsers.length;
      const totalPages =
        typeof firstData.totalPages === "number" && Number.isFinite(firstData.totalPages)
          ? firstData.totalPages
          : Math.max(1, Math.ceil(total / pageLimit));

      const allUsers = [...firstUsers];
      for (let page = 2; page <= totalPages; page++) {
        // Sequential fetch keeps API pressure reasonable.
        const res = await axios.get(`/api/admin/users?page=${page}&limit=${pageLimit}`);
        const data = res.data ?? {};
        const list = Array.isArray(data.users) ? data.users : Array.isArray(res.data) ? res.data : [];
        allUsers.push(...list);
      }

      setUsers(allUsers);
      setTotalUsers(total || allUsers.length);
      setCurrentPage(1);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load users" });
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get("/api/admin/classes");
      setClasses(res.data);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load classes" });
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get("/api/admin/users?role=teacher&limit=500");
      const data = res.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
      setAllTeachers(list);
    } catch (_) {
      setAllTeachers([]);
    }
  };

  const fetchSurveys = async () => {
    try {
      const res = await axios.get("/api/surveys");
      setSurveys(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setSurveys([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [overviewRes, surveysRes] = await Promise.all([
        axios.get("/api/analytics/overview"),
        axios.get("/api/analytics/surveys"),
      ]);
      setOverviewStats(overviewRes.data);
      setSurveyAnalytics(surveysRes.data);
    } catch (err) {
      console.error("Failed to fetch admin analytics", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchClasses(), fetchSurveys(), fetchTeachers(), fetchAnalytics()]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    filters.role,
    filters.classId,
    filters.yearLevel,
    filters.activeOnly,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const filteredUsers = users.filter((u) => {
    const searchTrim = search.trim().toLowerCase();
    const matchesSearch =
      !searchTrim ||
      (u.displayName || "").toLowerCase().includes(searchTrim) ||
      (u.username || "").toLowerCase().includes(searchTrim);

    const matchesRole = !filters.role || u.role === filters.role;

    const classIdNum = filters.classId ? parseInt(filters.classId, 10) : null;
    const matchesClass = !filters.classId || (u.classId ?? null) === classIdNum;

    const matchesYear = !filters.yearLevel || (u.yearLevel ?? "") === filters.yearLevel;

    const matchesActive =
      !filters.activeOnly ||
      u.isActive === 1 ||
      u.isActive === true ||
      u.isActive === null ||
      u.isActive === undefined;

    return matchesSearch && matchesRole && matchesClass && matchesYear && matchesActive;
  });

  const sortedUsers = React.useMemo(() => {
    if (!sortConfig.key) return filteredUsers;

    const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
    const toText = (v) =>
      v === null || v === undefined ? "" : String(v).toLowerCase();
    const toTime = (v) => {
      if (!v) return 0;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const sorted = [...filteredUsers].sort((a, b) => {
      if (sortConfig.key === "lastLogin") {
        const av = toTime(a.lastLogin);
        const bv = toTime(b.lastLogin);
        if (av < bv) return -1 * directionFactor;
        if (av > bv) return 1 * directionFactor;
        return 0;
      }

      const aText =
        sortConfig.key === "name"
          ? toText(a.displayName || a.username)
          : sortConfig.key === "role"
            ? toText(a.role)
            : sortConfig.key === "className"
              ? toText(a.className)
              : sortConfig.key === "yearLevel"
                ? toText(a.yearLevel)
                : toText(a[sortConfig.key]);
      const bText =
        sortConfig.key === "name"
          ? toText(b.displayName || b.username)
          : sortConfig.key === "role"
            ? toText(b.role)
            : sortConfig.key === "className"
              ? toText(b.className)
              : sortConfig.key === "yearLevel"
                ? toText(b.yearLevel)
                : toText(b[sortConfig.key]);

      if (aText < bText) return -1 * directionFactor;
      if (aText > bText) return 1 * directionFactor;
      return 0;
    });

    return sorted;
  }, [filteredUsers, sortConfig]);

  const start = (currentPage - 1) * perPage;
  const paginatedUsers = sortedUsers.slice(start, start + perPage);

  const hasPrev = currentPage > 1;
  const hasNext = start + perPage < sortedUsers.length;

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      // Third click clears sorting
      return { key: null, direction: "asc" };
    });
  };

  const openAddUser = () => {
    setFormUser({
      username: "",
      displayName: "",
      role: "student",
      classId: "",
      yearLevel: "",
      password: "",
      isActive: true,
    });
    addUserModal.onOpen();
  };

  const openEditUser = (u) => {
    setEditUserId(u.id);
    setFormUser({
      username: u.username,
      displayName: u.displayName || "",
      role: u.role,
      classId: u.classId ?? "",
      yearLevel: u.yearLevel || "",
      password: "",
      isActive: u.isActive !== 0,
    });
    editUserModal.onOpen();
  };

  const handleCreateUser = async () => {
    if (!formUser.username || !formUser.password) {
      setMessage({ type: "error", text: "Username and password required" });
      return;
    }
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await axios.post("/api/admin/users", {
        ...formUser,
        classId: formUser.classId || null,
      });
      addUserModal.onClose();
      await fetchUsers();
      setMessage({ type: "success", text: "User created" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to create user" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        displayName: formUser.displayName,
        role: formUser.role,
        classId: formUser.classId || null,
        yearLevel: formUser.yearLevel || null,
        isActive: formUser.isActive,
      };
      if (formUser.password) payload.password = formUser.password;
      await axios.put(`/api/admin/users/${editUserId}`, payload);
      editUserModal.onClose();
      await Promise.all([fetchUsers(), fetchClasses(), fetchTeachers()]);
      setMessage({ type: "success", text: "User updated" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to update user" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = (u) => {
    openEditUser(u);
  };

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Remove ${u.displayName || u.username} from their class?`)) return;
    try {
      // "Deactivate" in this UI means unassign from class(es), not account deactivation.
      await axios.put(`/api/admin/users/${u.id}`, { classId: null });
      await fetchUsers();
      setMessage({ type: "success", text: "Student removed from class" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to update" });
    }
  };

  const escapeCSVCell = (value) => {
    const str = value === null || value === undefined ? "" : String(value);
    const needsQuotes = /[",\n\r]/.test(str);
    if (!needsQuotes) return str;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExport = () => {
    try {
      const headers = ["Name", "Username", "Role", "Class", "Year Level", "Last Login", "Active"];
      const rows = filteredUsers.map((u) => [
        u.displayName || u.username,
        u.username,
        u.role,
        u.className ?? "—",
        u.yearLevel ?? "—",
        u.lastLogin ?? "—",
        u.isActive === 1 || u.isActive === true ? "Yes" : u.isActive === 0 ? "No" : "—",
      ]);

      const csv = [headers, ...rows]
        .map((r) => r.map(escapeCSVCell).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "users-export.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: "success", text: `Exported ${filteredUsers.length} users` });
    } catch (err) {
      console.error("Export failed:", err);
      setMessage({ type: "error", text: "Failed to export users" });
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      await fetchUsers();
      setMessage({ type: "success", text: "User deleted" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to delete user" });
    }
  };

  const openAddClass = () => {
    setClassForm({ name: "", teacherId: "none" });
    addClassModal.onOpen();
  };

  const openEditClass = (c) => {
    setEditClassId(c.id);
    setClassForm({ name: c.name, teacherId: c.teacherId ?? "none" });
    editClassModal.onOpen();
  };

  const handleCreateClass = async () => {
    if (!classForm.name?.trim()) {
      setMessage({ type: "error", text: "Class name is required" });
      return;
    }
    setSavingClass(true);
    try {
      await axios.post("/api/admin/classes", {
        name: classForm.name.trim(),
        teacherId: classForm.teacherId === "none" ? null : classForm.teacherId,
      });
      addClassModal.onClose();
      await fetchClasses();
      await fetchUsers();
      setMessage({ type: "success", text: "Class created" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to create class" });
    } finally {
      setSavingClass(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!classForm.name?.trim()) {
      setMessage({ type: "error", text: "Class name is required" });
      return;
    }
    setSavingClass(true);
    try {
      await axios.put(`/api/admin/classes/${editClassId}`, {
        name: classForm.name.trim(),
        teacherId: classForm.teacherId === "none" ? null : classForm.teacherId,
      });
      editClassModal.onClose();
      await fetchClasses();
      await fetchUsers();
      setMessage({ type: "success", text: "Class updated" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to update class" });
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (c) => {
    if (!window.confirm(`Delete class "${c.name}"? Students will be unassigned.`)) return;
    try {
      await axios.delete(`/api/admin/classes/${c.id}`);
      await fetchClasses();
      await fetchUsers();
      setMessage({ type: "success", text: "Class deleted" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to delete class" });
    }
  };

  const openClassStudents = async (c) => {
    setEditClassId(c.id);
    try {
      const res = await axios.get(`/api/admin/classes/${c.id}/students`);
      setClassStudents(res.data);
      setClassStudentIds(res.data.map((s) => s.id));
    } catch (_) {
      setClassStudents([]);
      setClassStudentIds([]);
    }
    classStudentsModal.onOpen();
  };

  const handleSaveClassStudents = async () => {
    setSavingClass(true);
    try {
      await axios.put(`/api/admin/classes/${editClassId}/students`, { userIds: classStudentIds });
      classStudentsModal.onClose();
      await fetchUsers();
      setMessage({ type: "success", text: "Students updated" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to update students" });
    } finally {
      setSavingClass(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result ?? "";
        const rows = parseCSV(text);
        const usersToImport = rows.map(mapCSVRowToUser);
        const response = await axios.post("/api/admin/users/import", { users: usersToImport });
        setImportResult(response.data);
        if (response.data.created > 0) {
          await Promise.all([fetchUsers(), fetchClasses(), fetchTeachers()]);
        }
        importModal.onClose();
        setImportFile(null);
      } catch (err) {
        setImportResult({
          created: 0,
          errors: [{ message: err.response?.data?.error || "Import failed" }],
        });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(importFile);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const activeSurveys = surveys.filter((s) => !s.closedAt);
  const surveyStatusList = surveys.slice(0, 5);

  if (!authUser || authUser.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <p className="text-danger">Access denied. Administrators only.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-slate-100 font-display">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2 text-white">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Survey App</h1>
            <p className="text-xs text-slate-500 font-medium">ADMIN CONSOLE</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <button
            onClick={() => setSection("users")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              section === "users" ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined">group</span>
            <span>User Management</span>
          </button>
          <button
            onClick={() => setSection("classes")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              section === "classes" ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined">menu_book</span>
            <span>Class Management</span>
          </button>
          <button
            onClick={() => setSection("teachers")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              section === "teachers" ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined">person_pin</span>
            <span>Teacher Management</span>
          </button>
          <button
            onClick={() => setSection("surveys")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              section === "surveys" ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span>Survey Overview</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2">
            <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
              {getInitials(authUser.displayName || authUser.username)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{authUser.displayName || authUser.username}</p>
              <p className="text-xs text-slate-500 truncate">System Admin</p>
            </div>
            <button type="button" onClick={handleLogout} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-xl font-bold">Admin Dashboard</h2>
          <div className="flex-1 max-w-xl px-12">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
              <input
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all"
                placeholder="Global search for users, surveys or classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </header>

        <div className="p-8 space-y-8">
          {message.text && (
            <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"}`}>
              {message.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">person</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold mt-1">{loading ? "—" : totalUsers}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">assignment_turned_in</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Active Surveys</p>
              <p className="text-3xl font-bold mt-1">{loading ? "—" : activeSurveys.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">school</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Classes</p>
              <p className="text-3xl font-bold mt-1">{loading ? "—" : classes.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg">pending_actions</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Pending Responses</p>
              <p className="text-3xl font-bold mt-1">{loading ? "—" : overviewStats.pendingResponses}</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-9 space-y-6">
              {section === "users" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold">User Management</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterOpen((v) => !v)}
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        aria-expanded={filterOpen}
                      >
                        <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
                      </button>
                      <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span> Export
                      </button>
                    </div>
                  </div>

                  {filterOpen && (
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Role</label>
                          <select
                            value={filters.role}
                            onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
                            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">All roles</option>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Class</label>
                          <select
                            value={filters.classId}
                            onChange={(e) => setFilters((p) => ({ ...p, classId: e.target.value }))}
                            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">All classes</option>
                            {classes.map((c) => (
                              <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year level</label>
                          <input
                            type="text"
                            value={filters.yearLevel}
                            onChange={(e) => setFilters((p) => ({ ...p, yearLevel: e.target.value }))}
                            placeholder="e.g. 7"
                            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 pb-2">
                          <input
                            type="checkbox"
                            checked={filters.activeOnly}
                            onChange={(e) => setFilters((p) => ({ ...p, activeOnly: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-primary"
                          />
                          Active only
                        </label>

                        <div className="flex-1" />

                        <button
                          type="button"
                          onClick={() => setFilters({ role: "", classId: "", yearLevel: "", activeOnly: false })}
                          className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <tr>
                          <th
                            className="px-6 py-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            onClick={() => handleSort("name")}
                            aria-sort={
                              sortConfig.key === "name"
                                ? sortConfig.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span>Name / Username</span>
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  sortConfig.key === "name"
                                    ? "text-primary"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              >
                                {sortConfig.key === "name" && sortConfig.direction === "desc"
                                  ? "arrow_downward"
                                  : sortConfig.key === "name"
                                    ? "arrow_upward"
                                    : "unfold_more"}
                              </span>
                            </div>
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            onClick={() => handleSort("role")}
                            aria-sort={
                              sortConfig.key === "role"
                                ? sortConfig.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span>Role</span>
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  sortConfig.key === "role"
                                    ? "text-primary"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              >
                                {sortConfig.key === "role" && sortConfig.direction === "desc"
                                  ? "arrow_downward"
                                  : sortConfig.key === "role"
                                    ? "arrow_upward"
                                    : "unfold_more"}
                              </span>
                            </div>
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            onClick={() => handleSort("className")}
                            aria-sort={
                              sortConfig.key === "className"
                                ? sortConfig.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span>Class</span>
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  sortConfig.key === "className"
                                    ? "text-primary"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              >
                                {sortConfig.key === "className" && sortConfig.direction === "desc"
                                  ? "arrow_downward"
                                  : sortConfig.key === "className"
                                    ? "arrow_upward"
                                    : "unfold_more"}
                              </span>
                            </div>
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            onClick={() => handleSort("yearLevel")}
                            aria-sort={
                              sortConfig.key === "yearLevel"
                                ? sortConfig.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span>Year Level</span>
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  sortConfig.key === "yearLevel"
                                    ? "text-primary"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              >
                                {sortConfig.key === "yearLevel" && sortConfig.direction === "desc"
                                  ? "arrow_downward"
                                  : sortConfig.key === "yearLevel"
                                    ? "arrow_upward"
                                    : "unfold_more"}
                              </span>
                            </div>
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            onClick={() => handleSort("lastLogin")}
                            aria-sort={
                              sortConfig.key === "lastLogin"
                                ? sortConfig.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span>Last Login</span>
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  sortConfig.key === "lastLogin"
                                    ? "text-primary"
                                    : "text-slate-300 dark:text-slate-600"
                                }`}
                              >
                                {sortConfig.key === "lastLogin" && sortConfig.direction === "desc"
                                  ? "arrow_downward"
                                  : sortConfig.key === "lastLogin"
                                    ? "arrow_upward"
                                    : "unfold_more"}
                              </span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                              Loading…
                            </td>
                          </tr>
                        ) : (
                          paginatedUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                                    {getInitials(u.displayName || u.username)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{u.displayName || u.username}</p>
                                    <p className="text-xs text-slate-500">{u.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={roleBadgeClass(u.role)}>{u.role}</span>
                              </td>
                              <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">{u.className || "—"}</td>
                              <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">{u.yearLevel || "—"}</td>
                              <td className="px-6 py-5 text-sm text-slate-500 italic">{formatLastLogin(u.lastLogin)}</td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => openEditUser(u)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded" title="Edit">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                  </button>
                                  <button type="button" onClick={() => handleResetPassword(u)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded" title="Reset Password">
                                    <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                                  </button>
                                  {u.role !== "admin" && (
                                    <>
                                      {u.role === "student" && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeactivate(u)}
                                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                          title="Remove from class"
                                        >
                                          <span className="material-symbols-outlined text-[20px]">person_off</span>
                                        </button>
                                      )}
                                      <button type="button" onClick={() => handleDeleteUser(u.id, u.username)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete">
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing {filteredUsers.length === 0 ? 0 : start + 1}-{Math.min(start + perPage, filteredUsers.length)} of {filteredUsers.length} users
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {section === "classes" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold">Class Management</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Class name</th>
                          <th className="px-6 py-4">Teacher</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                              Loading…
                            </td>
                          </tr>
                        ) : (
                          classes.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-5 font-medium">{c.name}</td>
                              <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">
                                {c.teacherId ? teachers.find((t) => t.id === c.teacherId)?.displayName || teachers.find((t) => t.id === c.teacherId)?.username || "—" : "—"}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => openClassStudents(c)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded">
                                    <span className="material-symbols-outlined text-[20px]">group</span>
                                  </button>
                                  <button type="button" onClick={() => openEditClass(c)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded" title="Edit">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                  </button>
                                  <button type="button" onClick={() => handleDeleteClass(c)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {section === "teachers" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold">Teacher Management</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Name / Username</th>
                          <th className="px-6 py-4">Classes</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                              Loading…
                            </td>
                          </tr>
                        ) : (
                          teachers.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{getInitials(t.displayName || t.username)}</div>
                                  <div>
                                    <p className="font-semibold text-sm">{t.displayName || t.username}</p>
                                    <p className="text-xs text-slate-500">{t.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">
                                {classes.filter((c) => c.teacherId === t.id).map((c) => c.name).join(", ") || "—"}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button type="button" onClick={() => openEditUser(t)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded" title="Edit">
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {section === "surveys" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold">Survey Overview</h3>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <p className="text-slate-500">Loading…</p>
                    ) : surveys.length === 0 ? (
                      <p className="text-slate-500">No surveys yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {surveys.slice(0, 20).map((s) => (
                          <li key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="font-medium">{s.title}</span>
                            <span className="text-sm text-slate-500">{s.closedAt ? "Closed" : "Open"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="col-span-12 lg:col-span-3 space-y-8">
              <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Quick Actions</h3>
                <button type="button" onClick={openAddUser} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined">person_add</span>
                  <span>Add New User</span>
                </button>
                <button type="button" onClick={importModal.onOpen} className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined">upload_file</span>
                  <span>Bulk CSV Import</span>
                </button>
                <button type="button" onClick={openAddClass} className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined">add_business</span>
                  <span>Create New Class</span>
                </button>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider px-2">Recent Activity</h3>
                <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800 pl-2">
                  {loading ? (
                    <p className="text-xs text-slate-500 px-8">Loading...</p>
                  ) : overviewStats.recentActivity.length > 0 ? (
                    overviewStats.recentActivity.map((act, i) => (
                      <div key={i} className="relative flex gap-4">
                        <div className="size-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center z-10 shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-blue-600">task_alt</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm font-medium leading-snug truncate">{act.studentName}</p>
                          <p className="text-[10px] text-slate-500 truncate">responded to {act.surveyTitle}</p>
                          <p className="text-[9px] text-slate-400 mt-1">{new Date(act.submittedAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative flex gap-4">
                      <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-10 shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">history</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium leading-snug">No recent activity</p>
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => navigate("/analytics")} className="w-full text-center text-xs font-bold text-primary hover:underline py-2">View All Activity</button>
              </section>

              <section className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-xl overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Survey Status</h3>
                  <div className="space-y-4">
                    {loading ? (
                      <p className="text-sm text-slate-400">Loading...</p>
                    ) : surveyAnalytics.length === 0 ? (
                      <p className="text-sm text-slate-400">No surveys</p>
                    ) : (
                      surveyAnalytics.slice(0, 3).map((s) => {
                        const completion = Math.round((s.completion.responded / Math.max(1, s.completion.total)) * 100);
                        return (
                          <div key={s.id}>
                            <div className="flex justify-between text-xs font-medium mb-1">
                              <span className="truncate pr-2">{s.title}</span>
                              <span>{completion}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <span className="material-symbols-outlined text-[100px]">insights</span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      <Modal isOpen={addUserModal.isOpen} onOpenChange={addUserModal.onOpenChange} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Add user</ModalHeader>
          <ModalBody>
            <Input label="Username" labelPlacement="outside" variant="bordered" placeholder="Enter username" value={formUser.username} onValueChange={(v) => setFormUser((p) => ({ ...p, username: v }))} isRequired />
            <Input label="Password" labelPlacement="outside" variant="bordered" placeholder="Enter password" type="password" value={formUser.password} onValueChange={(v) => setFormUser((p) => ({ ...p, password: v }))} isRequired />
            <Input label="Display name" labelPlacement="outside" variant="bordered" placeholder="Enter display name" value={formUser.displayName} onValueChange={(v) => setFormUser((p) => ({ ...p, displayName: v }))} />
            <Select label="Role" labelPlacement="outside" variant="bordered" placeholder="Select role" popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }} selectedKeys={[formUser.role]} onSelectionChange={(keys) => setFormUser((p) => ({ ...p, role: Array.from(keys)[0] ?? "student" }))}>
              {ROLES.map((r) => (
                <SelectItem key={r}>{r}</SelectItem>
              ))}
            </Select>
            <Select label="Class" labelPlacement="outside" variant="bordered" placeholder="None" popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }} selectedKeys={formUser.classId ? [String(formUser.classId)] : ["none"]} onSelectionChange={(keys) => setFormUser((p) => ({ ...p, classId: Array.from(keys)[0] === "none" ? "" : Array.from(keys)[0] }))}>
              <SelectItem key="none">None</SelectItem>
              {classes.map((c) => (
                <SelectItem key={String(c.id)}>{c.name}</SelectItem>
              ))}
            </Select>
            <Input label="Year level" labelPlacement="outside" variant="bordered" placeholder="e.g. Year 5" value={formUser.yearLevel} onValueChange={(v) => setFormUser((p) => ({ ...p, yearLevel: v }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={addUserModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleCreateUser} isLoading={saving}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editUserModal.isOpen} onOpenChange={editUserModal.onOpenChange} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Edit user</ModalHeader>
          <ModalBody>
            <Input label="Username" labelPlacement="outside" variant="bordered" value={formUser.username} isReadOnly />
            <Input label="New password (leave blank to keep)" labelPlacement="outside" variant="bordered" placeholder="Leave blank to keep current password" type="password" value={formUser.password} onValueChange={(v) => setFormUser((p) => ({ ...p, password: v }))} />
            <Input label="Display name" labelPlacement="outside" variant="bordered" placeholder="Enter display name" value={formUser.displayName} onValueChange={(v) => setFormUser((p) => ({ ...p, displayName: v }))} />
            <Select label="Role" labelPlacement="outside" variant="bordered" placeholder="Select role" popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }} selectedKeys={[formUser.role]} onSelectionChange={(keys) => setFormUser((p) => ({ ...p, role: Array.from(keys)[0] ?? "student" }))}>
              {ROLES.map((r) => (
                <SelectItem key={r}>{r}</SelectItem>
              ))}
            </Select>
            <Select label="Class" labelPlacement="outside" variant="bordered" placeholder="None" popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }} selectedKeys={formUser.classId ? [String(formUser.classId)] : ["none"]} onSelectionChange={(keys) => setFormUser((p) => ({ ...p, classId: Array.from(keys)[0] === "none" ? "" : Array.from(keys)[0] }))}>
              <SelectItem key="none">None</SelectItem>
              {classes.map((c) => (
                <SelectItem key={String(c.id)}>{c.name}</SelectItem>
              ))}
            </Select>
            <Input label="Year level" labelPlacement="outside" variant="bordered" placeholder="e.g. Year 5" value={formUser.yearLevel} onValueChange={(v) => setFormUser((p) => ({ ...p, yearLevel: v }))} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="edit-active" checked={formUser.isActive} onChange={(e) => setFormUser((p) => ({ ...p, isActive: e.target.checked }))} />
              <label htmlFor="edit-active">Active</label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={editUserModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleUpdateUser} isLoading={saving}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={importModal.isOpen} onOpenChange={importModal.onOpenChange} size="lg">
        <ModalContent>
          <ModalHeader>Import users from CSV</ModalHeader>
          <ModalBody>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Required CSV columns</p>
                <button
                  type="button"
                  onClick={handleDownloadExample}
                  disabled={downloadingExample}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  {downloadingExample ? 'Downloading...' : 'Download example CSV'}
                </button>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700">
                    <th className="text-left px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300 rounded-tl">Column</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Required?</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300 rounded-tr">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {[
                    ["username", "✅ Yes", "Unique login name"],
                    ["password", "✅ Yes", "Initial password"],
                    ["role", "✅ Yes", "student, teacher, or admin"],
                    ["displayName", "No", "Full name for display"],
                    ["class", "No", "Must match an existing class name (e.g. 7A)"],
                    ["yearLevel", "No", 'Year group (e.g. "7")'],
                  ].map(([col, req, note]) => (
                    <tr key={col} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-3 py-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">{col}</td>
                      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{req}</td>
                      <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Select your CSV file</label>
              <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer" />
            </div>
            {importResult && (
              <div className="mt-2 p-3 rounded-lg bg-default-100">
                <p className="font-medium">Created: {importResult.created}</p>
                {importResult.errors?.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-sm text-danger-600">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                    {importResult.errors.length > 10 && <li>… and {importResult.errors.length - 10} more</li>}
                  </ul>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={importModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleImport} isLoading={importing} isDisabled={!importFile}>Import</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Class Modal */}
      <Modal isOpen={addClassModal.isOpen} onOpenChange={addClassModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>Add class</ModalHeader>
          <ModalBody>
            <Input label="Class name" value={classForm.name} onValueChange={(v) => setClassForm((p) => ({ ...p, name: v }))} isRequired />
            <Select label="Teacher" selectedKeys={[String(classForm.teacherId)]} onSelectionChange={(keys) => setClassForm((p) => ({ ...p, teacherId: Array.from(keys)[0] ?? "none" }))}>
              <SelectItem key="none">None</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={String(t.id)}>{t.displayName || t.username}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={addClassModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleCreateClass} isLoading={savingClass}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Class Modal */}
      <Modal isOpen={editClassModal.isOpen} onOpenChange={editClassModal.onOpenChange} placement="center" size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>Edit Class</span>
            <span className="text-sm font-normal text-slate-500">Update the class name or assign a teacher</span>
          </ModalHeader>
          <ModalBody className="gap-4 pb-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Class name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={classForm.name}
                onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned teacher
              </label>
              <select
                value={classForm.teacherId === "none" || classForm.teacherId == null ? "" : String(classForm.teacherId)}
                onChange={(e) => setClassForm((p) => ({ ...p, teacherId: e.target.value === "" ? "none" : e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— No teacher assigned —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.displayName || t.username}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  ⚠ No teachers found. Import or add teacher accounts first.
                </p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={editClassModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleUpdateClass} isLoading={savingClass}>Save changes</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Class Students Modal */}
      <Modal isOpen={classStudentsModal.isOpen} onOpenChange={classStudentsModal.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent classNames={{ base: 'max-h-[90vh] flex flex-col' }}>
          <ModalHeader className="flex-shrink-0">Manage students in class</ModalHeader>
          <ModalBody classNames={{ base: 'flex flex-col gap-3 overflow-y-auto min-h-0 flex-1' }}>
            <p className="text-sm text-default-500 flex-shrink-0">Select students to assign to this class.</p>
            <div className="space-y-2 flex-1 min-h-0">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-default-100 border border-transparent hover:border-default-200">
                  <input type="checkbox" checked={classStudentIds.includes(s.id)} onChange={(e) => (e.target.checked ? setClassStudentIds((prev) => [...prev, s.id]) : setClassStudentIds((prev) => prev.filter((id) => id !== s.id)))} className="mt-0.5 flex-shrink-0" />
                  <span className="truncate">{s.displayName || s.username} ({s.username})</span>
                </label>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={classStudentsModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleSaveClassStudents} isLoading={savingClass}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
