import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Checkbox, Chip } from "@heroui/react";

export default function SharingOptions({ user, sharing, setSharing }) {
  const [permissions, setPermissions] = useState(null);
  const [assignableStudents, setAssignableStudents] = useState([]);

  useEffect(() => {
    if (user && user.role === 'student' && user.classId) {
      setPermissions({
        canShareWithClass: true,
        canShareWithYearLevel: false,
        canShareWithSchool: false
      });
    }
  }, [user]);

  useEffect(() => {
    axios.get('/api/surveys/assignable-students').then((res) => setAssignableStudents(res.data)).catch(() => {});
  }, [user?.id]);

  const handleChange = (name, checked) => {
    setSharing(prev => ({ ...prev, [name]: checked }));
  };

  const targetUserIds = sharing.targetUserIds || [];
  const toggleTarget = (userId) => {
    setSharing(prev => ({
      ...prev,
      targetUserIds: prev.targetUserIds?.includes(userId)
        ? (prev.targetUserIds || []).filter((id) => id !== userId)
        : [...(prev.targetUserIds || []), userId]
    }));
  };

  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-default-700">Distribution Options</h4>
        {!isTeacher && !isAdmin && <Chip size="sm" variant="flat">Student Limits</Chip>}
      </div>

      <div className="flex flex-col gap-3">
        <Checkbox
          isSelected={sharing.sharedWithClass}
          onValueChange={(checked) => handleChange("sharedWithClass", checked)}
          isDisabled={!isTeacher && !isAdmin && permissions && !permissions.canShareWithClass}
          color="primary"
        >
          Share with Class
        </Checkbox>

        <Checkbox
          isSelected={sharing.sharedWithYearLevel}
          onValueChange={(checked) => handleChange("sharedWithYearLevel", checked)}
          isDisabled={!isTeacher && !isAdmin && permissions && !permissions.canShareWithYearLevel}
          color="primary"
        >
          Share with Year Level
        </Checkbox>

        <Checkbox
          isSelected={sharing.sharedWithSchool}
          onValueChange={(checked) => handleChange("sharedWithSchool", checked)}
          isDisabled={!isTeacher && !isAdmin && permissions && !permissions.canShareWithSchool}
          color="primary"
        >
          Share with School
        </Checkbox>
      </div>

      {assignableStudents.length > 0 && (
        <div className="pt-2 border-t border-divider">
          <p className="text-sm font-semibold text-default-600 mb-2">Or assign to specific students</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {assignableStudents.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  isSelected={targetUserIds.includes(s.id)}
                  onValueChange={() => toggleTarget(s.id)}
                  color="primary"
                  size="sm"
                />
                <span>{s.displayName || s.username} {s.className && <span className="text-default-400">({s.className})</span>}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!isTeacher && !isAdmin && permissions && (
        <p className="text-xs text-default-400 mt-2 italic">
          Note: Some options may be restricted by your teacher.
        </p>
      )}
    </div>
  );
}
