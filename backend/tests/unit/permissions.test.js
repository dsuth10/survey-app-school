const { validateDistribution } = require('../../src/services/survey_service');

describe('Distribution Permission Logic', () => {
  const teacherUser = { role: 'teacher' };
  const studentUser = { role: 'student', classId: 1 };
  
  const fullPermissions = {
    canShareWithClass: 1,
    canShareWithYearLevel: 1,
    canShareWithSchool: 1
  };

  const restrictedPermissions = {
    canShareWithClass: 1,
    canShareWithYearLevel: 0,
    canShareWithSchool: 0
  };

  test('Teacher should be able to share with anything regardless of class permissions', () => {
    const surveyData = { sharedWithSchool: true };
    // For teachers, permissions don't matter (or they have all)
    expect(() => validateDistribution(teacherUser, surveyData, restrictedPermissions)).not.toThrow();
  });

  test('Student should be able to share with Class if allowed', () => {
    const surveyData = { sharedWithClass: true };
    expect(() => validateDistribution(studentUser, surveyData, restrictedPermissions)).not.toThrow();
  });

  test('Student should NOT be able to share with Year Level if NOT allowed', () => {
    const surveyData = { sharedWithYearLevel: true };
    expect(() => validateDistribution(studentUser, surveyData, restrictedPermissions)).toThrow('Not permitted to share with year level');
  });

  test('Student should NOT be able to share with School if NOT allowed', () => {
    const surveyData = { sharedWithSchool: true };
    expect(() => validateDistribution(studentUser, surveyData, restrictedPermissions)).toThrow('Not permitted to share with school');
  });

  test('Student should be able to share with Year Level if allowed', () => {
    const surveyData = { sharedWithYearLevel: true };
    expect(() => validateDistribution(studentUser, surveyData, fullPermissions)).not.toThrow();
  });
});
