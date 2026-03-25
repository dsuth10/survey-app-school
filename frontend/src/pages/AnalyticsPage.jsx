import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [byClass, setByClass] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ovRes, svRes, clRes, tlRes] = await Promise.all([
        axios.get("/api/analytics/overview"),
        axios.get("/api/analytics/surveys"),
        axios.get("/api/analytics/by-class"),
        axios.get("/api/analytics/timeline"),
      ]);
      setOverview(ovRes.data);
      setSurveys(svRes.data);
      setByClass(clRes.data);
      setTimeline(tlRes.data);
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBack = () => navigate(-1);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completionRate = overview?.totalStudents > 0
    ? Math.round(
        (surveys.reduce((sum, s) => sum + (s.completion?.responded ?? 0), 0) /
          (Math.max(1, surveys.length) * overview.totalStudents)) *
          100
      )
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-display p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-black tracking-tight">System Analytics</h1>
          <p className="text-slate-500">Real-time engagement and completion metrics across the platform.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Active Surveys", value: overview?.activeSurveys || 0, icon: "assignment", color: "blue" },
          { label: "Total Respondants", value: overview?.totalStudents || 0, icon: "groups", color: "purple" },
          { label: "Pending Tasks", value: overview?.pendingResponses || 0, icon: "pending_actions", color: "amber" },
          { label: "Avg. Completion", value: `${completionRate}%`, icon: "analytics", color: "emerald" },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className={`size-10 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600 flex items-center justify-center mb-4`}>
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{card.label}</p>
            <h3 className="text-2xl font-black mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engagement Chart (Timeline) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Response Engagement (Last 7 Days)</h2>
          <div className="h-64 flex items-end justify-between gap-2 px-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            {timeline.length === 0 ? (
               <div className="w-full text-center py-20 text-slate-400">No activity data available</div>
            ) : (
              timeline.map((point, i) => {
                const max = Math.max(...timeline.map(p => p.count), 1);
                const height = (point.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="w-full bg-primary/20 hover:bg-primary transition-all rounded-t-lg relative flex justify-center" style={{ height: `${height}%` }}>
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-50 transition-opacity">
                         {point.count} responses
                       </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 rotate-45 origin-left">{point.date}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Participation by Class */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Participation by Class</h2>
          <div className="space-y-6">
            {byClass.length === 0 ? (
              <p className="text-slate-500 text-sm">No class data available</p>
            ) : (
              byClass.map((cls, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Class {cls.className}</span>
                    <span>{cls.rate ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${cls.rate ?? 0}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Survey Completion Breakdown */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold">Survey Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Survey Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Responses</th>
                  <th className="px-6 py-4">Engagement</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {surveys.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No surveys found</td></tr>
                ) : (
                  surveys.map((s) => {
                    const responded = s.completion?.responded ?? 0;
                    const total = s.completion?.total ?? 0;
                    const completion = Math.round((responded / Math.max(1, total)) * 100);
                    const isOpen = !s.closedAt;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{s.title}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isOpen ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500"}`}>
                            {isOpen ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium">
                          {responded} / {total}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden min-w-[100px]">
                              <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
                            </div>
                            <span className="text-xs font-bold w-8">{completion}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => navigate(`/results/${s.id}`)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
