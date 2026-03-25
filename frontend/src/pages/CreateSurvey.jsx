import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const QUESTION_TYPES = [
  { value: "multipleChoice", label: "Multiple Choice" },
  { value: "trueFalse", label: "True / False" },
  { value: "ranking", label: "Ranking" },
  { value: "text", label: "Text" },
];

function getInitials(name) {
  if (!name) return "?";
  return String(name)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getLocalIsoString(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function CreateSurvey() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: surveyId } = useParams();
  const isEdit = Boolean(surveyId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRequiredSurvey, setIsRequiredSurvey] = useState(true);
  const [questions, setQuestions] = useState([
    { questionText: "", type: "multipleChoice", options: ["", ""], isRequired: true },
  ]);
  const [sharing, setSharing] = useState({
    sharedWithClass: true,
    sharedWithYearLevel: false,
    sharedWithSchool: false,
    targetUserIds: [],
  });
  const [targetClassId, setTargetClassId] = useState("");
  const [opensAt, setOpensAt] = useState(getLocalIsoString());
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const [classes, setClasses] = useState([]);
  const [assignableStudents, setAssignableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    const loadClasses = () => {
      if (user?.role !== "teacher" && user?.role !== "admin") return;
      axios.get("/api/classes").then((res) => setClasses(Array.isArray(res.data) ? res.data : [])).catch(() => setClasses([]));
    };
    loadClasses();
  }, [user?.role]);

  useEffect(() => {
    axios.get("/api/surveys/assignable-students").then((res) => setAssignableStudents(Array.isArray(res.data) ? res.data : [])).catch(() => setAssignableStudents([]));
  }, [user?.id]);

  useEffect(() => {
    if (isEdit || surveyId) return;
    const raw = localStorage.getItem("surveyBuilderDraft");
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description || "");
      if (Array.isArray(d.questions) && d.questions.length) setQuestions(d.questions);
      if (d.sharing) setSharing(d.sharing);
      if (d.opensAt) setOpensAt(d.opensAt);
      if (d.closesAt) setClosesAt(d.closesAt);
      if (d.targetClassId) setTargetClassId(d.targetClassId);
    } catch (_) { }
  }, [isEdit, surveyId]);

  useEffect(() => {
    if (!isEdit || !surveyId) return;
    setLoadingData(true);
    axios
      .get(`/api/surveys/${surveyId}`)
      .then((res) => {
        const { survey, questions: qs } = res.data;
        setTitle(survey.title || "");
        setDescription(survey.description || "");
        setOpensAt(survey.opensAt ? survey.opensAt.slice(0, 16) : "");
        setClosesAt(survey.closesAt ? survey.closesAt.slice(0, 16) : "");
        setSharing({
          sharedWithClass: !!survey.sharedWithClass,
          sharedWithYearLevel: !!survey.sharedWithYearLevel,
          sharedWithSchool: !!survey.sharedWithSchool,
          targetUserIds: [],
        });
        if (Array.isArray(qs) && qs.length) {
          setQuestions(
            qs.map((q) => ({
              questionText: q.questionText || "",
              type: q.type || "multipleChoice",
              options: q.options != null ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]")) : [],
              isRequired: q.isRequired !== 0,
            }))
          );
        }
      })
      .catch(() => setError("Failed to load survey"))
      .finally(() => setLoadingData(false));
  }, [isEdit, surveyId]);

  const addQuestion = () => {
    setQuestions([...questions, { questionText: "", type: "multipleChoice", options: ["", ""], isRequired: true }]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const next = [...questions];
    next[index] = { ...next[index], [field]: value };
    if (field === "type" && value === "ranking") {
      const opts = next[index].options || [];
      if (opts.length < 2) next[index].options = [...opts, "", ""].slice(0, 2);
    }
    if (field === "type" && value === "trueFalse") next[index].options = ["True", "False"];
    setQuestions(next);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const next = [...questions];
    next[qIndex].options = [...(next[qIndex].options || [])];
    next[qIndex].options[oIndex] = value;
    setQuestions(next);
  };

  const addOption = (qIndex) => {
    const next = [...questions];
    next[qIndex].options = [...(next[qIndex].options || []), ""];
    setQuestions(next);
  };

  const removeOption = (qIndex, oIndex) => {
    const next = [...questions];
    const opts = (next[qIndex].options || []).filter((_, i) => i !== oIndex);
    if (opts.length < 1 && (next[qIndex].type === "multipleChoice" || next[qIndex].type === "ranking")) return;
    next[qIndex].options = opts;
    setQuestions(next);
  };

  const filteredStudents = studentSearch.trim()
    ? assignableStudents.filter(
      (s) =>
        (s.displayName || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.username || "").toLowerCase().includes(studentSearch.toLowerCase())
    )
    : assignableStudents;

  const toggleTargetStudent = (student) => {
    const ids = sharing.targetUserIds || [];
    const has = ids.includes(student.id);
    setSharing((prev) => ({
      ...prev,
      targetUserIds: has ? ids.filter((id) => id !== student.id) : [...ids, student.id],
    }));
  };

  const removeTargetStudent = (userId) => {
    setSharing((prev) => ({ ...prev, targetUserIds: (prev.targetUserIds || []).filter((id) => id !== userId) }));
  };

  const buildPayload = () => {
    const questionsPayload = questions.map((q) => {
      const type = q.type || "multipleChoice";
      let options = q.options;
      if (type === "trueFalse") options = ["True", "False"];
      if (type === "ranking") options = (q.options || []).filter(Boolean);
      return { questionText: q.questionText, type, options: options || [], isRequired: q.isRequired !== false };
    });
    return {
      title,
      description,
      isAnonymous: false,
      questions: questionsPayload,
      sharedWithClass: sharing.sharedWithClass,
      sharedWithYearLevel: sharing.sharedWithYearLevel,
      sharedWithSchool: sharing.sharedWithSchool,
      targetUserIds: sharing.targetUserIds || [],
      opensAt: opensAt || null,
      closesAt: closesAt || null,
      targetClassId: targetClassId || null,
    };
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      setError("Please enter a survey title.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await axios.post("/api/surveys", buildPayload());
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create survey");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem("surveyBuilderDraft", JSON.stringify({ title, description, questions, sharing, opensAt, closesAt, targetClassId: targetClassId || undefined }));
      setError("");
      setMessage("Draft saved locally. Use Publish to create the survey.");
    } catch (e) {
      setError("Could not save draft locally.");
    }
  };

  const [previewOpen, setPreviewOpen] = useState(false);
  const handlePreview = () => {
    if (!title.trim()) {
      setError("Enter a title to preview.");
      return;
    }
    setError("");
    setPreviewOpen(true);
  };

  const handleDiscard = () => {
    if (window.confirm("Discard this survey? Unsaved changes will be lost.")) navigate("/dashboard");
  };

  const displayName = user?.displayName || user?.username || "User";
  const isStudent = user?.role === "student";

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] dark:bg-[#101622]">
        <p className="text-slate-500">Loading survey…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-slate-100 font-display">
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary cursor-pointer" onClick={() => navigate("/dashboard")}>
            <span className="material-symbols-outlined text-3xl font-bold">poll</span>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Survey Builder</h2>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button type="button" onClick={() => navigate("/dashboard")} className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
              Dashboard
            </button>
            <span className="text-primary text-sm font-semibold border-b-2 border-primary py-5">Editor</span>
            <button type="button" onClick={() => navigate("/analytics")} className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
              Analytics
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <span className="material-symbols-outlined text-sm">visibility</span>
            Preview
          </button>
          <button type="button" onClick={handleSaveDraft} disabled={loading} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50">
            Save Draft
          </button>
          <button type="button" onClick={handlePublish} disabled={loading} className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">
            Publish
          </button>
          <div className="ml-2 h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
            {getInitials(displayName)}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="max-w-3xl w-full flex flex-col gap-6">
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              <button type="button" onClick={() => navigate("/dashboard")} className="hover:text-primary">
                Surveys
              </button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-slate-600 dark:text-slate-300">Editor</span>
            </nav>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Survey title"
                  className="flex-1 bg-transparent text-3xl font-black text-slate-900 dark:text-white tracking-tight border-none outline-none placeholder:text-slate-400"
                />
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide border border-primary/20">
                  Draft
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this survey."
                className="w-full bg-transparent text-slate-500 dark:text-slate-400 border-none outline-none resize-none placeholder:text-slate-400 min-h-[2.5rem]"
                rows={2}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm">
                {message}
              </div>
            )}

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="group relative bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border-2 border-transparent hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 flex-1">
                    <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">{qIndex + 1}</span>
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)}
                      placeholder="Question text"
                      className="flex-1 bg-transparent text-lg font-semibold text-slate-800 dark:text-slate-100 border-none outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={q.type || "multipleChoice"}
                      onChange={(e) => handleQuestionChange(qIndex, "type", e.target.value)}
                      className="text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeQuestion(qIndex)} disabled={questions.length === 1} className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-50" aria-label="Remove question">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                </div>

                {(q.type || "multipleChoice") === "multipleChoice" && (
                  <div className="space-y-3 pl-10">
                    {(q.options || []).map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-lg">radio_button_unchecked</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-transparent text-sm text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} disabled={(q.options || []).length <= 2} className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-50">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(qIndex)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add option
                    </button>
                  </div>
                )}

                {(q.type || "multipleChoice") === "trueFalse" && (
                  <div className="flex gap-4 pl-10">
                    <span className="py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">True</span>
                    <span className="py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium">False</span>
                  </div>
                )}

                {(q.type || "multipleChoice") === "ranking" && (
                  <div className="space-y-2 pl-10">
                    {(q.options || []).map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="material-symbols-outlined text-slate-400 text-lg">drag_handle</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            placeholder={`Item ${oIndex + 1}`}
                            className="flex-1 bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 border-none outline-none"
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-bold">{oIndex + 1}</span>
                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} disabled={(q.options || []).length <= 2} className="p-1 text-slate-400 hover:text-red-500 ml-2">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(qIndex)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add item
                    </button>
                  </div>
                )}

                {q.type === "text" && (
                  <div className="pl-10">
                    <div className="px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm">Short text response</div>
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={addQuestion} className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-3xl">add_circle</span>
              <span className="text-sm font-bold uppercase tracking-widest">Add Question</span>
            </button>
            <div className="h-20" />

            {previewOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreviewOpen(false)}>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Preview</h3>
                    <button type="button" onClick={() => setPreviewOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">{title || "Untitled"}</h4>
                  {description && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{description}</p>}
                  <div className="mt-6 space-y-4">
                    {questions.map((q, i) => (
                      <div key={i} className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{q.questionText || `Question ${i + 1}`}</p>
                        <p className="text-xs text-slate-400 mt-1">{QUESTION_TYPES.find((t) => t.value === (q.type || "multipleChoice"))?.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-xl">settings</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Survey Settings</h2>
            </div>
            <p className="text-xs text-slate-500">Global configurations for visibility and access.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Required Survey</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRequiredSurvey}
                  onClick={() => setIsRequiredSurvey((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isRequiredSurvey ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${isRequiredSurvey ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Current Status</span>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-primary/20">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary">Drafting Mode</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Scheduling
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Opens At</label>
                  <input
                    type="datetime-local"
                    value={opensAt}
                    onChange={(e) => setOpensAt(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary px-3 py-2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Closes At</label>
                  <input
                    type="datetime-local"
                    value={closesAt}
                    onChange={(e) => setClosesAt(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">groups</span>
                Targeting
              </h3>
              <div className="space-y-4">
                {!isStudent && classes.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Assign to Class</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary px-3 py-2"
                    >
                      <option value="">— Select class —</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Share with</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={sharing.sharedWithClass} onChange={(e) => setSharing((s) => ({ ...s, sharedWithClass: e.target.checked }))} className="rounded text-primary focus:ring-primary" />
                      <span className="text-xs font-medium">Class</span>
                    </label>
                    {!isStudent && (
                      <>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={sharing.sharedWithYearLevel} onChange={(e) => setSharing((s) => ({ ...s, sharedWithYearLevel: e.target.checked }))} className="rounded text-primary focus:ring-primary" />
                          <span className="text-xs font-medium">Year Level</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={sharing.sharedWithSchool} onChange={(e) => setSharing((s) => ({ ...s, sharedWithSchool: e.target.checked }))} className="rounded text-primary focus:ring-primary" />
                          <span className="text-xs font-medium">School</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {assignableStudents.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Specific Individuals</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search students..."
                        className="pl-10 block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary py-2"
                      />
                    </div>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {filteredStudents.slice(0, 10).map((s) => {
                        const selected = (sharing.targetUserIds || []).includes(s.id);
                        return (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold shrink-0">
                                {getInitials(s.displayName || s.username)}
                              </div>
                              <span className="text-xs font-medium truncate">{s.displayName || s.username}</span>
                            </div>
                            <button type="button" onClick={() => toggleTargetStudent(s)} className={`text-xs font-bold ${selected ? "text-primary" : "text-slate-400 hover:text-primary"}`}>
                              {selected ? "Remove" : "Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {(sharing.targetUserIds || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {assignableStudents.filter((s) => (sharing.targetUserIds || []).includes(s.id)).map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                                {getInitials(s.displayName || s.username)}
                              </div>
                              <span className="text-xs font-medium">{s.displayName || s.username}</span>
                            </div>
                            <button type="button" onClick={() => removeTargetStudent(s.id)} className="text-slate-400 hover:text-red-500 p-0.5">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={handleDiscard} className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-sm">delete</span>
              Discard Survey
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
