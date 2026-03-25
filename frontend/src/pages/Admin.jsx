import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Tabs,
  Tab,
  Card,
  CardBody,
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Chip,
  useDisclosure,
} from '@heroui/react';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['student', 'teacher', 'admin'];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().replace(/\s/g, '').split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function mapCSVRowToUser(row) {
  const get = (k) => (row[k] ?? row[k.replace(/\s/g, '')] ?? '').trim();
  return {
    username: get('username'),
    displayName: get('displayname') || get('displayName'),
    role: (get('role') || 'student').toLowerCase(),
    class: get('class'),
    yearLevel: get('yearlevel') || get('yearLevel'),
    password: get('password'),
  };
}

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const importModal = useDisclosure();

  const [formUser, setFormUser] = useState({
    username: '',
    displayName: '',
    role: 'student',
    classId: '',
    yearLevel: '',
    password: '',
    isActive: true,
  });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Classes tab
  const classAddModal = useDisclosure();
  const classEditModal = useDisclosure();
  const classStudentsModal = useDisclosure();
  const [classForm, setClassForm] = useState({ name: '', teacherId: 'none' });
  const [editClassId, setEditClassId] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classStudentIds, setClassStudentIds] = useState([]);
  const [savingClass, setSavingClass] = useState(false);
  const teachers = allUsers.filter((u) => u.role === 'teacher');
  const students = allUsers.filter((u) => u.role === 'student');

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole && filterRole !== 'all') params.set('role', filterRole);
      if (filterClassId && filterClassId !== 'all') params.set('classId', filterClassId);
      if (filterYear) params.set('yearLevel', filterYear);
      const response = await axios.get(`/api/admin/users?${params.toString()}`);
      setUsers(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load users' });
    }
  };
  const fetchUsersFull = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setAllUsers(res.data);
    } catch (_) {}
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/api/admin/classes');
      setClasses(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load classes' });
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    const load = async () => {
      await Promise.all([fetchClasses()]);
      const res = await axios.get('/api/admin/users');
      setAllUsers(res.data);
      setUsers(res.data);
    };
    load().finally(() => setLoading(false));
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchUsers();
  }, [filterRole, filterClassId, filterYear]);

  const openAdd = () => {
    setFormUser({
      username: '',
      displayName: '',
      role: 'student',
      classId: '',
      yearLevel: '',
      password: '',
      isActive: true,
    });
    addModal.onOpen();
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setFormUser({
      username: u.username,
      displayName: u.displayName || '',
      role: u.role,
      classId: u.classId ?? '',
      yearLevel: u.yearLevel || '',
      password: '',
      isActive: u.isActive !== 0,
    });
    editModal.onOpen();
  };

  const handleCreate = async () => {
    if (!formUser.username || !formUser.password) {
      setMessage({ type: 'error', text: 'Username and password required' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.post('/api/admin/users', {
        ...formUser,
        classId: formUser.classId || null,
      });
      addModal.onClose();
      fetchUsers();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'User created' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create user' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        displayName: formUser.displayName,
        role: formUser.role,
        classId: formUser.classId || null,
        yearLevel: formUser.yearLevel || null,
        isActive: formUser.isActive,
      };
      if (formUser.password) payload.password = formUser.password;
      await axios.put(`/api/admin/users/${editId}`, payload);
      editModal.onClose();
      fetchUsers();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'User updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update user' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      fetchUsers();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'User deleted' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete user' });
    }
  };

  const openAddClass = () => {
    setClassForm({ name: '', teacherId: 'none' });
    classAddModal.onOpen();
  };

  const openEditClass = (c) => {
    setEditClassId(c.id);
    setClassForm({ name: c.name, teacherId: c.teacherId ?? 'none' });
    classEditModal.onOpen();
  };

  const handleCreateClass = async () => {
    if (!classForm.name?.trim()) {
      setMessage({ type: 'error', text: 'Class name is required' });
      return;
    }
    setSavingClass(true);
    try {
      await axios.post('/api/admin/classes', {
        name: classForm.name.trim(),
        teacherId: classForm.teacherId === 'none' ? null : classForm.teacherId,
      });
      classAddModal.onClose();
      fetchClasses();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'Class created' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create class' });
    } finally {
      setSavingClass(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!classForm.name?.trim()) {
      setMessage({ type: 'error', text: 'Class name is required' });
      return;
    }
    setSavingClass(true);
    try {
      await axios.put(`/api/admin/classes/${editClassId}`, {
        name: classForm.name.trim(),
        teacherId: classForm.teacherId === 'none' ? null : classForm.teacherId,
      });
      classEditModal.onClose();
      fetchClasses();
      fetchUsers();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'Class updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update class' });
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (c) => {
    if (!window.confirm(`Delete class "${c.name}"? Students will be unassigned.`)) return;
    try {
      await axios.delete(`/api/admin/classes/${c.id}`);
      fetchClasses();
      fetchUsers();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'Class deleted' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete class' });
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
      fetchUsers();
      fetchUsersFull();
      setMessage({ type: 'success', text: 'Students updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update students' });
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
        const text = e.target?.result ?? '';
        const rows = parseCSV(text);
        const usersToImport = rows.map(mapCSVRowToUser);
        const response = await axios.post('/api/admin/users/import', { users: usersToImport });
        setImportResult(response.data);
        if (response.data.created > 0) { fetchUsers(); fetchUsersFull(); }
        importModal.onClose();
        setImportFile(null);
      } catch (err) {
        setImportResult({
          created: 0,
          errors: [{ message: err.response?.data?.error || 'Import failed' }],
        });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(importFile);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-danger">Access denied. Administrators only.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Administration</h1>

      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}`}
        >
          {message.text}
        </div>
      )}

      <Tabs>
        <Tab key="users" title="Users">
          <Card>
            <CardBody>
              <div className="flex flex-wrap gap-4 mb-4">
                <Select
                  label="Role"
                  placeholder="All"
                  selectedKeys={filterRole ? [filterRole] : ['all']}
                  onSelectionChange={(keys) => setFilterRole(Array.from(keys)[0] ?? 'all')}
                  className="max-w-[140px]"
                >
                  <SelectItem key="all">All</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r}>{r}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Class"
                  placeholder="All"
                  selectedKeys={filterClassId ? [String(filterClassId)] : ['all']}
                  onSelectionChange={(keys) => setFilterClassId(Array.from(keys)[0] ?? 'all')}
                  className="max-w-[180px]"
                >
                  <SelectItem key="all">All</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </Select>
                <Input
                  type="text"
                  label="Year level"
                  placeholder="Filter by year"
                  value={filterYear}
                  onValueChange={setFilterYear}
                  className="max-w-[120px]"
                />
                <div className="flex gap-2 items-end">
                  <Button color="primary" onPress={openAdd}>
                    Add user
                  </Button>
                  <Button color="secondary" variant="flat" onPress={importModal.onOpen}>
                    Import CSV
                  </Button>
                </div>
              </div>

              <Table aria-label="Users table">
                <TableHeader>
                  <TableColumn>Username</TableColumn>
                  <TableColumn>Display name</TableColumn>
                  <TableColumn>Role</TableColumn>
                  <TableColumn>Class</TableColumn>
                  <TableColumn>Year</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn>Last login</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.displayName || '—'}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={u.role === 'admin' ? 'danger' : u.role === 'teacher' ? 'primary' : 'default'}>
                          {u.role}
                        </Chip>
                      </TableCell>
                      <TableCell>{u.className || '—'}</TableCell>
                      <TableCell>{u.yearLevel || '—'}</TableCell>
                      <TableCell>{u.isActive === 0 ? <Chip size="sm" color="danger">Inactive</Chip> : <Chip size="sm" color="success">Active</Chip>}</TableCell>
                      <TableCell>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="flat" onPress={() => openEdit(u)}>
                            Edit
                          </Button>
                          {u.role !== 'admin' && (
                            <Button size="sm" color="danger" variant="light" onPress={() => handleDelete(u.id, u.username)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </Tab>
        <Tab key="classes" title="Classes">
          <Card>
            <CardBody>
              <div className="flex justify-end mb-4">
                <Button color="primary" onPress={openAddClass}>Add class</Button>
              </div>
              <Table aria-label="Classes table">
                <TableHeader>
                  <TableColumn>Class name</TableColumn>
                  <TableColumn>Teacher</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody>
                  {classes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.teacherId ? (teachers.find((t) => t.id === c.teacherId)?.displayName || teachers.find((t) => t.id === c.teacherId)?.username || '—') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="flat" onPress={() => openClassStudents(c)}>Students</Button>
                          <Button size="sm" variant="flat" onPress={() => openEditClass(c)}>Edit</Button>
                          <Button size="sm" color="danger" variant="light" onPress={() => handleDeleteClass(c)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </Tab>
        <Tab key="teachers" title="Teachers">
          <Card>
            <CardBody>
              <p className="text-default-500 mb-4">Teachers and their assigned classes. Edit a teacher in the Users tab to change role or assign classes.</p>
              <Table aria-label="Teachers table">
                <TableHeader>
                  <TableColumn>Username</TableColumn>
                  <TableColumn>Display name</TableColumn>
                  <TableColumn>Classes</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.username}</TableCell>
                      <TableCell>{t.displayName || '—'}</TableCell>
                      <TableCell>{classes.filter((c) => c.teacherId === t.id).map((c) => c.name).join(', ') || '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="flat" onPress={() => openEdit(t)}>Edit user</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* Add User Modal */}
      <Modal isOpen={addModal.isOpen} onOpenChange={addModal.onOpenChange} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Add user</ModalHeader>
          <ModalBody>
            <Input label="Username" value={formUser.username} onValueChange={(v) => setFormUser((p) => ({ ...p, username: v }))} isRequired />
            <Input label="Password" type="password" value={formUser.password} onValueChange={(v) => setFormUser((p) => ({ ...p, password: v }))} isRequired />
            <Input label="Display name" value={formUser.displayName} onValueChange={(v) => setFormUser((p) => ({ ...p, displayName: v }))} />
            <Select
              label="Role"
              popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }}
              selectedKeys={[formUser.role]}
              onSelectionChange={(keys) => setFormUser((p) => ({ ...p, role: Array.from(keys)[0] ?? 'student' }))}
            >
              {ROLES.map((r) => (
                <SelectItem key={r}>{r}</SelectItem>
              ))}
            </Select>
            <Select
              label="Class"
              popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }}
              placeholder="None"
              selectedKeys={formUser.classId ? [String(formUser.classId)] : ['none']}
              onSelectionChange={(keys) => { const k = Array.from(keys)[0]; setFormUser((p) => ({ ...p, classId: k === 'none' || !k ? '' : k })); }}
            >
              <SelectItem key="none">None</SelectItem>
              {classes.map((c) => (
                <SelectItem key={String(c.id)}>{c.name}</SelectItem>
              ))}
            </Select>
            <Input label="Year level" value={formUser.yearLevel} onValueChange={(v) => setFormUser((p) => ({ ...p, yearLevel: v }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={addModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleCreate} isLoading={saving}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editModal.isOpen} onOpenChange={editModal.onOpenChange} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Edit user</ModalHeader>
          <ModalBody>
            <Input label="Username" value={formUser.username} isReadOnly />
            <Input label="New password (leave blank to keep)" type="password" value={formUser.password} onValueChange={(v) => setFormUser((p) => ({ ...p, password: v }))} />
            <Input label="Display name" value={formUser.displayName} onValueChange={(v) => setFormUser((p) => ({ ...p, displayName: v }))} />
            <Select
              label="Role"
              popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }}
              selectedKeys={[formUser.role]}
              onSelectionChange={(keys) => setFormUser((p) => ({ ...p, role: Array.from(keys)[0] ?? 'student' }))}
            >
              {ROLES.map((r) => (
                <SelectItem key={r}>{r}</SelectItem>
              ))}
            </Select>
            <Select
              label="Class"
              popoverProps={{ className: "z-[1000]", style: { zIndex: 1000 } }}
              placeholder="None"
              selectedKeys={formUser.classId ? [String(formUser.classId)] : ['none']}
              onSelectionChange={(keys) => { const k = Array.from(keys)[0]; setFormUser((p) => ({ ...p, classId: k === 'none' || !k ? '' : k })); }}
            >
              <SelectItem key="none">None</SelectItem>
              {classes.map((c) => (
                <SelectItem key={String(c.id)}>{c.name}</SelectItem>
              ))}
            </Select>
            <Input label="Year level" value={formUser.yearLevel} onValueChange={(v) => setFormUser((p) => ({ ...p, yearLevel: v }))} />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={formUser.isActive}
                onChange={(e) => setFormUser((p) => ({ ...p, isActive: e.target.checked }))}
              />
              <label htmlFor="edit-active">Active</label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={editModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleUpdate} isLoading={saving}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import CSV Modal */}
      {/* Add Class Modal */}
      <Modal isOpen={classAddModal.isOpen} onOpenChange={classAddModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>Add class</ModalHeader>
          <ModalBody>
            <Input label="Class name" value={classForm.name} onValueChange={(v) => setClassForm((p) => ({ ...p, name: v }))} isRequired />
            <Select
              label="Teacher"
              selectedKeys={[String(classForm.teacherId)]}
              onSelectionChange={(keys) => setClassForm((p) => ({ ...p, teacherId: Array.from(keys)[0] ?? 'none' }))}
            >
              <SelectItem key="none">None</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={String(t.id)}>{t.displayName || t.username}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={classAddModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleCreateClass} isLoading={savingClass}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Class Modal */}
      <Modal isOpen={classEditModal.isOpen} onOpenChange={classEditModal.onOpenChange} scrollBehavior="inside">
        <ModalContent classNames={{ base: 'max-h-[90vh]' }}>
          <ModalHeader>Edit class</ModalHeader>
          <ModalBody classNames={{ base: 'flex flex-col gap-4 overflow-visible' }}>
            <Input label="Class name" value={classForm.name} onValueChange={(v) => setClassForm((p) => ({ ...p, name: v }))} isRequired />
            <Select
              label="Teacher"
              selectedKeys={[String(classForm.teacherId)]}
              onSelectionChange={(keys) => setClassForm((p) => ({ ...p, teacherId: Array.from(keys)[0] ?? 'none' }))}
            >
              <SelectItem key="none">None</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={String(t.id)}>{t.displayName || t.username}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={classEditModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleUpdateClass} isLoading={savingClass}>Save</Button>
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
                  <input
                    type="checkbox"
                    checked={classStudentIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setClassStudentIds((prev) => [...prev, s.id]);
                      else setClassStudentIds((prev) => prev.filter((id) => id !== s.id));
                    }}
                    className="mt-0.5 flex-shrink-0"
                  />
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

      <Modal isOpen={importModal.isOpen} onOpenChange={importModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>Import users from CSV</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-500 mb-2">
              CSV columns: username, displayName, role, class, yearLevel, password
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            {importResult && (
              <div className="mt-4 p-3 rounded-lg bg-default-100">
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
            <Button color="primary" onPress={handleImport} isLoading={importing} isDisabled={!importFile}>
              Import
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
