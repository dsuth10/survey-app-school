import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [classesRes, surveysRes, statsRes] = await Promise.all([
        axios.get("/api/classes"),
        axios.get("/api/surveys"),
        axios.get("/api/surveys/teacher-stats"),
      ]);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      const surveyList = Array.isArray(surveysRes.data) ? surveysRes.data : [];
      setSurveys(surveyList.filter((s) => s.creatorId === user?.id));
      setRecentActivity(statsRes.data.recentActivity || []);
    } catch (err) {
      console.error("Failed to load teacher data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchTeacherData();
  }, [user?.id]);

  const mySurveys = surveys.filter((s) => s.creatorId === user?.id);
  const activeSurveys = mySurveys.filter((s) => !s.closedAt);
  const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);

  const surveysWithCompletion = mySurveys.filter(s => s.completion?.total > 0);
  const avgCompletionRate = surveysWithCompletion.length
    ? Math.round(surveysWithCompletion.reduce((sum, s) =>
      sum + (s.completion.responded / s.completion.total) * 100, 0
    ) / surveysWithCompletion.length)
    : null;

  const handleViewResults = (surveyId) => navigate(`/results/${surveyId}`);
  const handleCreateSurvey = () => navigate("/create");
  const handleManageClass = () => navigate("/manage-class");
  const handleSeeAllClasses = () => navigate("/manage-class");
  const handleBrowse = () => navigate("/analytics");

  const displayName = user?.displayName || user?.username || "Teacher";
  const firstName = displayName.split(/\s+/)[0] || displayName;

  if (!user || user.role !== "teacher") {
    return (
      <div className="p-8 text-center">
        <p className="text-danger">Access denied. Teachers only.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-slate-100 font-display">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg text-white">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-primary">Survey App</h2>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mt-4 mb-2">Main Menu</div>
          <button
            onClick={() => { }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors bg-primary/10 text-primary"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </button>
          <button
            onClick={handleSeeAllClasses}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors text-left"
          >
            <span className="material-symbols-outlined">school</span>
            <span className="text-sm">My Classes</span>
          </button>
          <button
            onClick={handleCreateSurvey}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors text-left"
          >
            <span className="material-symbols-outlined">edit_note</span>
            <span className="text-sm">Survey Builder</span>
          </button>
          <button
            onClick={handleBrowse}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors text-left"
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-sm">Results &amp; Analytics</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCreateSurvey}
            className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create New Survey
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
              <input
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 w-64 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all"
                placeholder="Search students, surveys..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold leading-tight">{displayName}</p>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tighter">Teacher</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                {(displayName || "T").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-1 text-slate-900 dark:text-white">Welcome back, {firstName}</h1>
              <p className="text-slate-500 dark:text-slate-400">Here&apos;s a snapshot of your classes and recent survey activity.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleManageClass}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">group</span>
                View Class Roster
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-primary p-2 rounded-lg">
                  <span className="material-symbols-outlined">groups</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Total Students</p>
              <h3 className="text-2xl font-black mt-1">{loading ? "—" : totalStudents}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Active Surveys</p>
              <h3 className="text-2xl font-black mt-1">{loading ? "—" : activeSurveys.length}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 p-2 rounded-lg">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Completion Rate</p>
              <h3 className="text-2xl font-black mt-1">{loading ? "—" : (avgCompletionRate != null ? `${avgCompletionRate}%` : "—")}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 p-2 rounded-lg">
                  <span className="material-symbols-outlined">rate_review</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Recent Submissions</p>
              <h3 className="text-2xl font-black mt-1">{loading ? "—" : recentActivity.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">My Classes</h2>
                  <button type="button" onClick={handleSeeAllClasses} className="text-primary text-sm font-bold hover:underline">
                    See All Classes
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loading ? (
                    <p className="text-slate-500 col-span-2">Loading classes…</p>
                  ) : classes.length === 0 ? (
                    <p className="text-slate-500 col-span-2">No classes assigned.</p>
                  ) : (
                    classes.slice(0, 4).map((c) => (
                      <div key={c.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{c.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">Class ID: {c.id}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-bold uppercase text-slate-400">Class</div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-5">{c.studentCount || 0} students enrolled</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleManageClass} className="flex-1 text-[11px] font-bold py-2 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors">
                            Manage Roster
                          </button>
                          <button type="button" onClick={handleSeeAllClasses} className="flex-1 text-[11px] font-bold py-2 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            View All
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Recent Surveys</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Survey Title</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Responses</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading…</td>
                        </tr>
                      ) : mySurveys.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No surveys yet. Create one to get started.</td>
                        </tr>
                      ) : (
                        mySurveys.slice(0, 5).map((s) => {
                          const isOpen = !s.closedAt;
                          const completion = s.completion != null ? Math.round((s.completion.responded / Math.max(1, s.completion.total)) * 100) : null;
                          return (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{s.title}</span>
                                  <span className="text-[10px] text-slate-400">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isOpen ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500"}`}>
                                  {isOpen ? "Open" : "Closed"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {completion != null ? (
                                  <div className="w-full max-w-[100px]">
                                    <div className="flex justify-between text-[10px] mb-1 font-bold">
                                      <span>{s.completion?.responded ?? 0}/{s.completion?.total ?? 0}</span>
                                      <span>{completion}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-primary h-full" style={{ width: `${completion}%` }} />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button type="button" onClick={() => handleViewResults(s.id)} className="text-xs font-bold text-primary hover:underline">
                                  View Results
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Student Activity</h2>
                  <button type="button" onClick={fetchTeacherData} className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">refresh</span>
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <div className="space-y-6">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((act, i) => (
                        <div key={i} className="flex gap-4 relative">
                          <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary flex shrink-0 items-center justify-center relative z-10">
                            <span className="material-symbols-outlined text-sm">task_alt</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{act.studentName}</p>
                            <p className="text-[10px] text-slate-500 truncate">responded to {act.surveyTitle}</p>
                            <p className="text-[9px] text-slate-400 mt-1">{new Date(act.submittedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-4 relative">
                        <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 flex shrink-0 items-center justify-center relative z-10">
                          <span className="material-symbols-outlined text-sm">history</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 leading-relaxed">No recent survey submissions.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleBrowse} className="w-full mt-8 py-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors border-t border-slate-100 dark:border-slate-800 pt-4">
                    View All Activity History
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
