import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import "./TestGenerator.css";

const API_BASE = "https://api.theecportal.com/api";
const INSTITUTE_NAME = "THE EDUCATION'S CRADLE INSTITUTE";
const LOGO_PATH = "/logo512.png";

const STEPS = [
  "Course",
  "Paper Details",
  "Paper Type",
  "Distribution",
  "Questions",
  "Preview & Generate",
];

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Given a saved draft from the backend, work out which step to resume at.
function stepForDraft(paper) {
  if (!paper.subjectLabel || !paper.instructor || !paper.examDate) return 1;
  if (!paper.paperType || !paper.totalMarks || !paper.duration) return 2;
  if (!paper.questions || paper.questions.length === 0) return 3;
  return 4;
}

// Map a backend paper document onto the wizard's form shape.
function paperToForm(paper) {
  return {
    courseId: paper.courseId?._id || paper.courseId || "",
    classInfoId: paper.classInfoId?._id || paper.classInfoId || "",
    subjectLabel: paper.subjectLabel || "",
    instructor: paper.instructor || "",
    examDate: paper.examDate ? paper.examDate.slice(0, 10) : "",
    duration: paper.duration || "",
    totalMarks: paper.totalMarks || "",
    paperType: paper.paperType && paper.paperType !== "MCQ_ONLY" ? paper.paperType : (paper.distribution ? paper.paperType : ""),
    distribution: paper.distribution || {
      mcq: { count: 0, marksEach: 0 },
      short: { count: 0, marksEach: 0 },
      long: { count: 0, marksEach: 0 },
    },
    questions: paper.questions || [],
  };
}

export default function TestGenerator() {
  const [activeTab, setActiveTab] = useState("create"); // "create" | "drafts" | "finalized"

  return (
    <Sidebar>
      <div className="tg-shell">
        <header className="tg-topbar">
          <div className="tg-brand">
            <img src={LOGO_PATH} alt="" className="tg-brand-logo" />
            <div>
              <p className="tg-brand-eyebrow">Paper Generator</p>
              <h1 className="tg-brand-title">{INSTITUTE_NAME}</h1>
            </div>
          </div>
          <nav className="tg-tabs no-print">
            <button
              className={`tg-tab ${activeTab === "create" ? "is-active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create Paper
            </button>
            <button
              className={`tg-tab ${activeTab === "drafts" ? "is-active" : ""}`}
              onClick={() => setActiveTab("drafts")}
            >
              Drafts
            </button>
            <button
              className={`tg-tab ${activeTab === "finalized" ? "is-active" : ""}`}
              onClick={() => setActiveTab("finalized")}
            >
              My Papers
            </button>
          </nav>
        </header>

        {activeTab === "create" && <PaperWizard />}
        {activeTab === "drafts" && (
          <PaperList status="draft" onOpenInWizard={() => setActiveTab("create")} />
        )}
        {activeTab === "finalized" && <PaperList status="finalized" />}
      </div>
    </Sidebar>
  );
}

/* ------------------------------------------------------------------ */
/*  WIZARD                                                             */
/* ------------------------------------------------------------------ */

function PaperWizard() {
  const [step, setStep] = useState(0);
  const [paperId, setPaperId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When a resumable draft is found, hold it here until the teacher decides.
  const [resumeCandidate, setResumeCandidate] = useState(null);

  const [form, setForm] = useState({
    courseId: "",
    classInfoId: "",
    subjectLabel: "",
    instructor: "",
    examDate: "",
    duration: "",
    totalMarks: "",
    paperType: "",
    distribution: {
      mcq: { count: 0, marksEach: 0 },
      short: { count: 0, marksEach: 0 },
      long: { count: 0, marksEach: 0 },
    },
    questions: [],
  });

  useEffect(() => {
    axios
      .get(`${API_BASE}/courses/myCourses`, { headers: authHeaders() })
      .then((res) => setCourses(res.data.courses || []))
      .catch(() => setError("Couldn't load your courses."));
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setClasses([]);
      return;
    }
    axios
      .get(`${API_BASE}/classes/myClasses`, {
        headers: authHeaders(),
        params: { courseId: form.courseId },
      })
      .then((res) => setClasses(res.data.data || []))
      .catch(() => setError("Couldn't load your classes."));
  }, [form.courseId]);

  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  // Loads a draft (fresh or resumed) fully into the wizard state.
  const loadDraft = (paper) => {
    setPaperId(paper._id);
    setForm((f) => ({ ...f, ...paperToForm(paper) }));
  };

  const startPaper = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/testGenerator/start${force ? "?force=true" : ""}`,
        { courseId: form.courseId, classInfoId: form.classInfoId },
        { headers: authHeaders() }
      );

      if (res.data.resumed && !force) {
        // Don't jump in automatically — let the teacher choose.
        setResumeCandidate(res.data.paper);
        return;
      }

      loadDraft(res.data.paper);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't start the paper.");
    } finally {
      setLoading(false);
    }
  };

  const confirmResume = () => {
    const paper = resumeCandidate;
    setResumeCandidate(null);
    loadDraft(paper);
    setStep(stepForDraft(paper));
  };

  const declineResume = () => {
    setResumeCandidate(null);
    startPaper(true); // force a brand-new draft
  };

  const saveDetails = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.patch(
        `${API_BASE}/testGenerator/${paperId}/details`,
        {
          subjectLabel: form.subjectLabel,
          instructor: form.instructor,
          examDate: form.examDate,
        },
        { headers: authHeaders() }
      );
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save paper details.");
    } finally {
      setLoading(false);
    }
  };

  const saveType = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.patch(
        `${API_BASE}/testGenerator/${paperId}/type`,
        {
          paperType: form.paperType,
          totalMarks: Number(form.totalMarks),
          duration: Number(form.duration),
        },
        { headers: authHeaders() }
      );
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save paper type.");
    } finally {
      setLoading(false);
    }
  };

  const saveDistribution = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.patch(
        `${API_BASE}/testGenerator/${paperId}/distribution`,
        { ...form.distribution },
        { headers: authHeaders() }
      );
      patch({ questions: res.data.paper.questions });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Distribution doesn't match total marks.");
    } finally {
      setLoading(false);
    }
  };

  const saveQuestion = async (questionId, payload) => {
    const res = await axios.patch(
      `${API_BASE}/testGenerator/${paperId}/questions/${questionId}`,
      payload,
      { headers: authHeaders() }
    );
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q._id === questionId ? res.data.question : q)),
    }));
  };

  const finalizePaper = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.patch(
        `${API_BASE}/testGenerator/${paperId}/finalize`,
        {},
        { headers: authHeaders() }
      );
      patch({ questions: res.data.paper.questions });
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.message || "Fill in every question before finalizing.");
    } finally {
      setLoading(false);
    }
  };

  if (resumeCandidate) {
    return (
      <div className="tg-layout">
        <div className="tg-panel">
          <h2 className="tg-panel-title">Unfinished paper found</h2>
          <p className="tg-hint">
            You already have a draft in progress for this course and class
            {resumeCandidate.subjectLabel ? ` (${resumeCandidate.subjectLabel})` : ""}. Would
            you like to continue it, or start a brand new paper instead?
          </p>
          <div className="tg-actions">
            <button className="tg-btn tg-btn-primary" onClick={confirmResume}>
              Resume draft
            </button>
            <button className="tg-btn" onClick={declineResume}>
              Start a new paper instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tg-layout">
      <ol className="tg-stepper no-print">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`tg-step ${i === step ? "is-current" : ""} ${i < step ? "is-done" : ""}`}
          >
            <span className="tg-step-index">{i + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className="tg-panel">
        {error && <div className="tg-error no-print">{error}</div>}

        {step === 0 && (
          <CourseStep
            courses={courses}
            classes={classes}
            form={form}
            onChange={patch}
            onNext={() => startPaper(false)}
            loading={loading}
          />
        )}

        {step === 1 && (
          <DetailsStep form={form} onChange={patch} onBack={goBack} onNext={saveDetails} loading={loading} />
        )}

        {step === 2 && (
          <PaperTypeStep form={form} onChange={patch} onBack={goBack} onNext={saveType} loading={loading} />
        )}

        {step === 3 && (
          <DistributionStep
            form={form}
            onChange={patch}
            onBack={goBack}
            onNext={saveDistribution}
            loading={loading}
          />
        )}

        {step === 4 && (
          <QuestionsStep
            form={form}
            onSaveQuestion={saveQuestion}
            onBack={goBack}
            onNext={finalizePaper}
            loading={loading}
          />
        )}

        {step === 5 && <PaperPreview paper={form} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 0 — Course & class                                            */
/* ------------------------------------------------------------------ */

function CourseStep({ courses, classes, form, onChange, onNext, loading }) {
  return (
    <section>
      <h2 className="tg-panel-title">Which course is this paper for?</h2>
      <div className="tg-field">
        <label>Course</label>
        <select value={form.courseId} onChange={(e) => onChange({ courseId: e.target.value, classInfoId: "" })}>
          <option value="">Select a course</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title} {c.code ? `(${c.code})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="tg-field">
        <label>Class / Section</label>
        <select
          value={form.classInfoId}
          onChange={(e) => onChange({ classInfoId: e.target.value })}
          disabled={!form.courseId}
        >
          <option value="">{form.courseId ? "Select a class" : "Select a course first"}</option>
          {classes.map((cls) => (
            <option key={cls._id} value={cls._id}>
              {cls.name || cls.title}
            </option>
          ))}
        </select>
        {form.courseId && classes.length === 0 && (
          <p className="tg-hint">No classes found for this course.</p>
        )}
      </div>

      <div className="tg-actions">
        <button
          className="tg-btn tg-btn-primary"
          disabled={!form.courseId || !form.classInfoId || loading}
          onClick={onNext}
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 1 — Subject / instructor / date / duration / total marks      */
/* ------------------------------------------------------------------ */

function DetailsStep({ form, onChange, onBack, onNext, loading }) {
  const valid = form.subjectLabel && form.instructor && form.examDate && form.duration && form.totalMarks;
  return (
    <section>
      <h2 className="tg-panel-title">Paper details</h2>

      <div className="tg-grid-2">
        <div className="tg-field">
          <label>Subject name (as it appears on the paper)</label>
          <input
            type="text"
            value={form.subjectLabel}
            onChange={(e) => onChange({ subjectLabel: e.target.value })}
            placeholder="e.g. Physics — Mechanics"
          />
        </div>
        <div className="tg-field">
          <label>Instructor name</label>
          <input type="text" value={form.instructor} onChange={(e) => onChange({ instructor: e.target.value })} />
        </div>
        <div className="tg-field">
          <label>Exam date</label>
          <input type="date" value={form.examDate} onChange={(e) => onChange({ examDate: e.target.value })} />
        </div>
        <div className="tg-field">
          <label>Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) => onChange({ duration: e.target.value })}
          />
        </div>
        <div className="tg-field">
          <label>Total marks</label>
          <input
            type="number"
            min="1"
            value={form.totalMarks}
            onChange={(e) => onChange({ totalMarks: e.target.value })}
          />
        </div>
      </div>

      <div className="tg-actions">
        <button className="tg-btn" onClick={onBack}>Back</button>
        <button className="tg-btn tg-btn-primary" disabled={!valid || loading} onClick={onNext}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 2 — Paper type                                                 */
/* ------------------------------------------------------------------ */

function PaperTypeStep({ form, onChange, onBack, onNext, loading }) {
  const options = [
    { value: "MCQ_ONLY", label: "Only MCQs", desc: "Multiple choice questions only." },
    { value: "MCQ_SHORT", label: "MCQs + Short Questions", desc: "Objective + short-answer sections." },
    { value: "MCQ_SHORT_LONG", label: "MCQs + Short + Long Questions", desc: "Full mixed paper." },
  ];
  return (
    <section>
      <h2 className="tg-panel-title">What kind of paper is this?</h2>
      <div className="tg-choice-grid">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`tg-choice-card ${form.paperType === opt.value ? "is-selected" : ""}`}
            onClick={() => onChange({ paperType: opt.value })}
            type="button"
          >
            <h3>{opt.label}</h3>
            <p>{opt.desc}</p>
          </button>
        ))}
      </div>
      <div className="tg-actions">
        <button className="tg-btn" onClick={onBack}>Back</button>
        <button className="tg-btn tg-btn-primary" disabled={!form.paperType || loading} onClick={onNext}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 3 — Marks distribution                                         */
/* ------------------------------------------------------------------ */

function DistributionStep({ form, onChange, onBack, onNext, loading }) {
  const sections = [
    { key: "mcq", label: "MCQs", show: true },
    { key: "short", label: "Short Questions", show: form.paperType !== "MCQ_ONLY" },
    { key: "long", label: "Long Questions", show: form.paperType === "MCQ_SHORT_LONG" },
  ].filter((s) => s.show);

  const setDist = (key, field, value) => {
    onChange({
      distribution: {
        ...form.distribution,
        [key]: { ...form.distribution[key], [field]: Number(value) || 0 },
      },
    });
  };

  const computedTotal = sections.reduce(
    (sum, s) => sum + form.distribution[s.key].count * form.distribution[s.key].marksEach,
    0
  );
  const matches = computedTotal === Number(form.totalMarks);

  return (
    <section>
      <h2 className="tg-panel-title">Marks distribution</h2>
      <p className="tg-hint">Total marks target: {form.totalMarks}</p>

      {sections.map((s) => (
        <div className="tg-grid-2 tg-dist-row" key={s.key}>
          <div className="tg-field">
            <label>{s.label} — how many questions</label>
            <input
              type="number"
              min="0"
              value={form.distribution[s.key].count}
              onChange={(e) => setDist(s.key, "count", e.target.value)}
            />
          </div>
          <div className="tg-field">
            <label>Marks per {s.label.slice(0, -1).toLowerCase()}</label>
            <input
              type="number"
              min="0"
              value={form.distribution[s.key].marksEach}
              onChange={(e) => setDist(s.key, "marksEach", e.target.value)}
            />
          </div>
        </div>
      ))}

      <p className={`tg-total-check ${matches ? "is-ok" : "is-off"}`}>
        Computed total: {computedTotal} {matches ? "✓ matches" : `— should equal ${form.totalMarks}`}
      </p>

      <div className="tg-actions">
        <button className="tg-btn" onClick={onBack}>Back</button>
        <button className="tg-btn tg-btn-primary" disabled={!matches || loading} onClick={onNext}>
          {loading ? "Generating slots…" : "Continue"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 4 — Fill in each question (proper MCQ options UI)              */
/* ------------------------------------------------------------------ */

function QuestionsStep({ form, onSaveQuestion, onBack, onNext, loading }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const questions = form.questions;
  const current = questions[activeIndex];

  const [draft, setDraft] = useState(current);
  useEffect(() => {
    setLocalError("");
    // Guarantee an MCQ always has 4 option rows to fill in, even for
    // older drafts created before options were auto-seeded.
    if (current?.questionType === "MCQ" && (!current.options || current.options.length === 0)) {
      setDraft({
        ...current,
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      });
    } else {
      setDraft(current);
    }
  }, [activeIndex]); // eslint-disable-line

  if (!current) return <p>No question slots yet — go back and set a distribution.</p>;

  const filledCount = questions.filter((q) => q.questionText?.trim()).length;

  const updateOptionText = (i, value) => {
    const options = [...draft.options];
    options[i] = { ...options[i], text: value };
    setDraft({ ...draft, options });
  };

  const markCorrect = (i) => {
    const options = draft.options.map((o, idx) => ({ ...o, isCorrect: idx === i }));
    setDraft({ ...draft, options });
  };

  const addOption = () =>
    setDraft({ ...draft, options: [...draft.options, { text: "", isCorrect: false }] });

  const removeOption = (i) => {
    if (draft.options.length <= 2) return; // keep at least 2
    setDraft({ ...draft, options: draft.options.filter((_, idx) => idx !== i) });
  };

  const validateBeforeSave = () => {
    if (!draft.questionText?.trim()) {
      setLocalError("Question text can't be empty.");
      return false;
    }
    if (draft.questionType === "MCQ") {
      const filled = draft.options.filter((o) => o.text.trim());
      if (filled.length < 2) {
        setLocalError("Add at least 2 options with text.");
        return false;
      }
      if (filled.filter((o) => o.isCorrect).length !== 1) {
        setLocalError("Mark exactly one option as the correct answer.");
        return false;
      }
    }
    setLocalError("");
    return true;
  };

  const saveCurrent = async () => {
    if (!validateBeforeSave()) return;
    setSaving(true);
    try {
      await onSaveQuestion(current._id, {
        questionText: draft.questionText,
        options: draft.options,
        modelAnswer: draft.modelAnswer,
        marks: draft.marks,
      });
      if (activeIndex < questions.length - 1) setActiveIndex((i) => i + 1);
    } catch (err) {
      setLocalError(err.response?.data?.message || "Couldn't save this question.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="tg-q-header">
        <h2 className="tg-panel-title">
          Question {activeIndex + 1} of {questions.length}
          <span className="tg-q-type-badge">{current.questionType}</span>
        </h2>
        <span className="tg-hint">{filledCount}/{questions.length} filled in</span>
      </div>

      <div className="tg-q-pager no-print">
        {questions.map((q, i) => (
          <button
            key={q._id}
            className={`tg-q-dot ${i === activeIndex ? "is-current" : ""} ${
              q.questionText?.trim() ? "is-filled" : ""
            }`}
            onClick={() => setActiveIndex(i)}
            title={`Question ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {localError && <div className="tg-error">{localError}</div>}

      <div className="tg-field">
        <label>Question text ({draft.marks} marks)</label>
        <textarea
          rows={3}
          value={draft.questionText || ""}
          onChange={(e) => setDraft({ ...draft, questionText: e.target.value })}
        />
      </div>

      {draft.questionType === "MCQ" && (
        <div className="tg-field">
          <label>Options — select the correct answer</label>
          {draft.options.map((opt, i) => (
            <div className={`tg-option-row ${opt.isCorrect ? "is-correct" : ""}`} key={i}>
              <span className="tg-option-letter">{String.fromCharCode(65 + i)}</span>
              <input
                type="text"
                value={opt.text}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                onChange={(e) => updateOptionText(i, e.target.value)}
              />
              <label className="tg-option-correct">
                <input
                  type="radio"
                  name={`correct-${current._id}`}
                  checked={!!opt.isCorrect}
                  onChange={() => markCorrect(i)}
                />
                Correct
              </label>
              {draft.options.length > 2 && (
                <button
                  type="button"
                  className="tg-option-remove"
                  onClick={() => removeOption(i)}
                  aria-label="Remove option"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="tg-btn tg-btn-ghost" type="button" onClick={addOption}>
            + Add another option
          </button>
        </div>
      )}

      {(draft.questionType === "Short" || draft.questionType === "Long") && (
        <div className="tg-field">
          <label>Model answer / marking notes (optional, not printed on the paper)</label>
          <textarea
            rows={draft.questionType === "Long" ? 4 : 2}
            value={draft.modelAnswer || ""}
            onChange={(e) => setDraft({ ...draft, modelAnswer: e.target.value })}
          />
        </div>
      )}

      <div className="tg-actions">
        <button className="tg-btn" onClick={onBack}>Back to distribution</button>
        <button className="tg-btn tg-btn-primary" disabled={saving} onClick={saveCurrent}>
          {saving ? "Saving…" : activeIndex < questions.length - 1 ? "Save & next question" : "Save"}
        </button>
        {filledCount === questions.length && (
          <button className="tg-btn tg-btn-accent" disabled={loading} onClick={onNext}>
            {loading ? "Finalizing…" : "Finalize paper"}
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PREVIEW / PDF                                                       */
/* ------------------------------------------------------------------ */

function PaperPreview({ paper }) {
  const mcqs = paper.questions.filter((q) => q.questionType === "MCQ");
  const shorts = paper.questions.filter((q) => q.questionType === "Short");
  const longs = paper.questions.filter((q) => q.questionType === "Long");

  return (
    <div>
      <div className="tg-actions no-print">
        <button className="tg-btn tg-btn-primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="tg-sheet">
        <img className="tg-watermark" src={LOGO_PATH} alt="" />

        <header className="tg-sheet-header">
          <img className="tg-sheet-logo" src={LOGO_PATH} alt="Institute logo" />
          <h1 className="tg-sheet-institute">{INSTITUTE_NAME}</h1>
          <p className="tg-sheet-subject">{paper.subjectLabel}</p>

          <div className="tg-sheet-meta">
            <span><strong>Instructor:</strong> {paper.instructor}</span>
            <span><strong>Date:</strong> {paper.examDate}</span>
            <span><strong>Time Allowed:</strong> {paper.duration} minutes</span>
            <span><strong>Total Marks:</strong> {paper.totalMarks}</span>
          </div>
        </header>

        <section className="tg-student-block">
          <div><span className="tg-line-label">Name:</span><span className="tg-line" /></div>
          <div><span className="tg-line-label">Roll Number:</span><span className="tg-line" /></div>
        </section>

        {mcqs.length > 0 && <QuestionSection title="Section A — Multiple Choice Questions" questions={mcqs} />}
        {shorts.length > 0 && <QuestionSection title="Section B — Short Questions" questions={shorts} />}
        {longs.length > 0 && <QuestionSection title="Section C — Long Questions" questions={longs} />}
      </div>
    </div>
  );
}

function QuestionSection({ title, questions }) {
  return (
    <section className="tg-sheet-section">
      <h2 className="tg-sheet-section-title">{title}</h2>
      <ol start={1} className="tg-sheet-qlist">
        {questions.map((q, i) => (
          <li key={q._id || i} className="tg-sheet-question">
            <div className="tg-sheet-qtext">
              <span>{q.questionText}</span>
              <span className="tg-sheet-marks">[{q.marks}]</span>
            </div>
            {q.questionType === "MCQ" && (
              <ul className="tg-sheet-options">
                {(q.options || []).filter((o) => o.text?.trim()).map((opt, oi) => (
                  <li key={oi}>
                    <span className="tg-opt-letter">{String.fromCharCode(65 + oi)}.</span> {opt.text}
                  </li>
                ))}
              </ul>
            )}
            {q.questionType !== "MCQ" && <div className="tg-answer-space" />}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  LIST — used for both Drafts and Finalized tabs                      */
/* ------------------------------------------------------------------ */

function PaperList({ status }) {
  const [papers, setPapers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/testGenerator?status=${status}`, { headers: authHeaders() })
      .then((res) => setPapers(res.data.papers || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]); // eslint-disable-line

  const openPaper = async (id) => {
    const res = await axios.get(`${API_BASE}/testGenerator/${id}`, { headers: authHeaders() });
    setSelected(res.data.paper);
  };

  const deleteDraft = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    await axios.delete(`${API_BASE}/testGenerator/${id}`, { headers: authHeaders() });
    load();
  };

  if (selected) {
    return (
      <div className="tg-layout">
        <button className="tg-btn no-print tg-back-btn" onClick={() => setSelected(null)}>
          ← Back to list
        </button>
        <PaperPreview paper={selected} />
      </div>
    );
  }

  return (
    <div className="tg-library">
      <h2 className="tg-panel-title">{status === "draft" ? "Unfinished drafts" : "My papers"}</h2>
      {loading && <p>Loading…</p>}
      {!loading && papers.length === 0 && (
        <p className="tg-hint">
          {status === "draft" ? "No drafts in progress." : "No finalized papers yet."}
        </p>
      )}
      <div className="tg-library-grid">
        {papers.map((p) => (
          <div key={p._id} className="tg-library-card-wrap">
            <button className="tg-library-card" onClick={() => openPaper(p._id)}>
              <h3>{p.subjectLabel || p.courseId?.title || "Untitled paper"}</h3>
              <p>{p.classInfoId?.name}</p>
              <p className="tg-hint">{p.totalMarks} marks · {p.duration} min</p>
            </button>
            {status === "draft" && (
              <button className="tg-library-delete" onClick={(e) => deleteDraft(p._id, e)}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}