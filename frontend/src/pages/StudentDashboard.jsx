import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/surveys");
        setSurveys(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load surveys", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) load();
  }, [user?.id]);

  const completedSurveys = surveys.filter((s) => s.hasResponded);
  const myCreatedSurveys = surveys.filter((s) => s.creatorId === user?.id);
  const pendingSurveys = surveys.filter((s) => !s.hasResponded && !s.closedAt && s.creatorId !== user?.id);
  const totalRelevantSurveys = surveys.filter(s => s.creatorId !== user?.id).length;
  const responseRate = totalRelevantSurveys > 0
    ? Math.round((completedSurveys.length / totalRelevantSurveys) * 100)
    : 0;

  const displayName = user?.displayName || user?.username || "Student";
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const handleTakeSurvey = (id) => navigate(`/take-survey/${id}`);
  const handleViewResults = (id) => navigate(`/results/${id}`);
  const handleViewAll = () => navigate("/browse");

  const formatDue = (survey) => {
    if (!survey.closesAt) return "No due date";
    const d = new Date(survey.closesAt);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / 86400000);
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays} days (${d.toLocaleDateString()})`;
  };

  if (!user || user.role !== "student") {
    return (
      <div className="p-8 text-center">
        <p className="text-danger">Access denied. Students only.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-slate-100 font-display">
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary rounded-lg p-1.5 text-white">
            <span className="material-symbols-outlined block">insights</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">Survey App</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-semibold text-left">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          <button onClick={handleViewAll} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
            <span className="material-symbols-outlined">description</span>
            <span>My Surveys</span>
          </button>
          <button onClick={handleViewAll} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
            <span className="material-symbols-outlined">bar_chart</span>
            <span>Results</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => navigate("/create")} className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-sm">add</span>
            Create New Survey
          </button>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Support</p>
            <button className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-lg">help_center</span>
              <span>Help Center</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex-1 max-w-md relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500"
              placeholder="Search surveys, results..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button type="button" className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-2" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-semibold leading-none group-hover:text-primary transition-colors">{displayName}</p>
                <p className="text-xs text-slate-500 mt-1 leading-none">Student ID: {user?.id ?? "—"}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-transparent group-hover:border-primary transition-all flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                {(displayName || "S").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Hello, {firstName}!</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                You have {pendingSurveys.length} survey{pendingSurveys.length !== 1 ? "s" : ""} waiting for your feedback today.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 px-4 py-2 rounded-lg border border-primary/10">
              <span className="material-symbols-outlined text-primary">stars</span>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none">Your Rank</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Participant</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Completed</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{loading ? "—" : completedSurveys.length}</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">trending_up</span> —
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Surveys</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{loading ? "—" : pendingSurveys.length}</span>
                <span className="text-xs font-medium text-slate-400">Active tasks</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Response Rate</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{loading ? "—" : `${responseRate}%`}</span>
                <span className="text-xs font-medium text-slate-400">of assigned</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">My Surveys</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{loading ? "—" : myCreatedSurveys.length}</span>
                <span className="material-symbols-outlined text-primary text-lg">edit_document</span>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Assigned to Me</h3>
              <button type="button" onClick={handleViewAll} className="text-sm font-semibold text-primary hover:underline">
                View all tasks
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <p className="text-slate-500 col-span-full">Loading…</p>
              ) : pendingSurveys.length === 0 ? (
                <p className="text-slate-500 col-span-full">No pending surveys. Check &quot;View all tasks&quot; for more.</p>
              ) : (
                pendingSurveys.slice(0, 6).map((s) => {
                  const dueText = formatDue(s);
                  const isUrgent = dueText === "Due tomorrow" || dueText === "Due today" || dueText === "Overdue";
                  return (
                    <div
                      key={s.id}
                      className="group bg-white dark:bg-slate-900 rounded-xl border-2 border-primary/20 shadow-sm overflow-hidden flex flex-col hover:border-primary transition-all"
                    >
                      <div className="h-32 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                        <span className="absolute top-3 right-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          Required
                        </span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{s.title}</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined text-sm">{isUrgent ? "warning" : "schedule"}</span>
                            <span className={isUrgent ? "text-red-500 font-semibold" : ""}>{dueText}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined text-sm">timer</span>
                            <span>~{s.questionCount || 0} questions</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTakeSurvey(s.id)}
                          className="w-full mt-6 bg-primary text-white py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                        >
                          Take Survey
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {myCreatedSurveys.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">My Created Surveys</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCreatedSurveys.map((s) => (
                  <div
                    key={s.id}
                    className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:border-primary transition-all"
                  >
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{s.title}</h4>
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">Author</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">event</span>
                          <span>Created {new Date(s.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">groups</span>
                          <span>{s.sharedWithSchool ? "School" : s.sharedWithYearLevel ? "Year Level" : "Class"}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewResults(s.id)}
                        className="w-full mt-6 border border-primary text-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary/5 transition-all"
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <div className="p-4 text-slate-500">Loading…</div>
                  ) : completedSurveys.length === 0 ? (
                    <div className="p-4 text-slate-500">No completed surveys yet.</div>
                  ) : (
                    completedSurveys.slice(0, 5).map((s) => (
                      <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <span className="material-symbols-outlined">check_circle</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{s.title}</p>
                            <p className="text-xs text-slate-500">Completed</p>
                          </div>
                        </div>
                        <button type="button" onClick={handleViewAll} className="p-2 text-slate-400 hover:text-primary transition-colors" aria-label="View surveys">
                          <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold">Your Progress</h3>
              <div className="bg-primary rounded-xl p-6 text-white relative overflow-hidden shadow-xl shadow-primary/30">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <span className="material-symbols-outlined text-6xl">insights</span>
                </div>
                <p className="text-sm font-medium opacity-90">Current Goal</p>
                <h4 className="text-xl font-bold mt-1">Weekly Challenge</h4>
                <p className="text-xs mt-4 opacity-80">Complete surveys to track your progress</p>
                <div className="mt-4 bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full" style={{ width: `${Math.min(100, (completedSurveys.length / 5) * 100)}%` }} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-bold">{completedSurveys.length} completed</span>
                </div>
                <button type="button" onClick={handleViewAll} className="w-full mt-6 bg-white text-primary py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                  View Milestones
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Redeem Points</p>
                  <p className="text-xs text-slate-500">Complete more surveys to earn rewards</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
