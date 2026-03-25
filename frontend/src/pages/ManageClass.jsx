import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function ManageClass() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [permissions, setPermissions] = useState({
    canShareWithClass: 0,
    canShareWithYearLevel: 0,
    canShareWithSchool: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchPermissions(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/api/classes');
      setClasses(response.data);
      if (response.data.length > 0) {
        setSelectedClassId(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (classId) => {
    try {
      const response = await axios.get(`/api/classes/${classId}/permissions`);
      setPermissions({
        canShareWithClass: response.data.canShareWithClass,
        canShareWithYearLevel: response.data.canShareWithYearLevel,
        canShareWithSchool: response.data.canShareWithSchool
      });
    } catch (err) {
      console.error('Failed to fetch permissions');
    }
  };

  const handleToggle = (field) => {
    setPermissions(prev => ({
      ...prev,
      [field]: prev[field] ? 0 : 1
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await axios.put(`/api/classes/${selectedClassId}/permissions`, permissions);
      setMessage('Permissions updated successfully!');
    } catch (err) {
      setMessage('Failed to update permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!user || user.role !== 'teacher') return <div style={{ padding: '20px' }}>Access denied. Teachers only.</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: '20px', color: '#007bff', textDecoration: 'none' }}>&larr; Back to Dashboard</Link>
      <h1>Manage Class Permissions</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Control what sharing options are available to students in your classes when they create surveys.</p>

      {classes.length === 0 ? (
        <div className="p-5 rounded border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-200/30 dark:border-amber-300 dark:text-slate-800">
          You don't have any classes assigned to you. Contact an administrator if this is incorrect.
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Class to Manage:</label>
            <select 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>
              Permissions: {classes.find(c => String(c.id) === String(selectedClassId))?.name}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>
                <input 
                  type="checkbox" 
                  checked={!!permissions.canShareWithClass} 
                  onChange={() => handleToggle('canShareWithClass')}
                  style={{ marginRight: '15px', width: '22px', height: '22px' }}
                />
                Allow students to share with their <strong>Class</strong>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>
                <input 
                  type="checkbox" 
                  checked={!!permissions.canShareWithYearLevel} 
                  onChange={() => handleToggle('canShareWithYearLevel')}
                  style={{ marginRight: '15px', width: '22px', height: '22px' }}
                />
                Allow students to share with their <strong>Year Level</strong>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>
                <input 
                  type="checkbox" 
                  checked={!!permissions.canShareWithSchool} 
                  onChange={() => handleToggle('canShareWithSchool')}
                  style={{ marginRight: '15px', width: '22px', height: '22px' }}
                />
                Allow students to share with the whole <strong>School</strong>
              </label>
            </div>

            <button 
              onClick={handleSave} 
              disabled={saving}
              style={{ 
                marginTop: '35px', 
                padding: '12px 20px', 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                width: '100%',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>

            {message && (
              <div style={{ 
                marginTop: '20px', 
                padding: '12px', 
                background: message.includes('success') ? '#d4edda' : '#f8d7da',
                color: message.includes('success') ? '#155724' : '#721c24',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
