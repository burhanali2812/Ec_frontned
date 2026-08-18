import React, { useMemo, useState } from "react";
import { useAppContext } from "../../contextApi/AppContext";
import axios from "axios"; //  swap for your project's axios instance
import "./UploadTestAndSyllabus.css";
import Sidebar from "../Sidebar";
import ViewTestAndSyllabus from "../Student/ViewTestAndSyllabus"; // for date formatting
import { useNavigate } from "react-router-dom";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const API_BASE = "https://ec-backend-phi.vercel.app/api/testScheduleAndSyllabus"; //  adjust to your mount path

function buildDateRange(from, to) {
    const dates = [];
    let cur = new Date(from);
    const end = new Date(to);
    while (cur <= end) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function UploadTestAndSyllabus() {
    const { allcourses, classOptions } = useAppContext();

    const [step, setStep] = useState(1);
    const [sheetTitle, setSheetTitle] = useState(""); // e.g. "Monthly Test - August"
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [classInfo, setClassInfo] = useState("");
    const [rows, setRows] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    const [isShowingScheduleTest, setIsShowingScheduleTest] = useState(false);
    const [buttonText, setButtonText] = useState("Show Test Schedule");
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));



    const goToStep3 = () => {
        if (!from || !to) return;
        const dates = buildDateRange(from, to);
        setRows(
            dates.map((d) => ({
                date: d,
                dayName: DAYS[d.getDay()],
                isSunday: d.getDay() === 0,
                courseId: "",
                syllabus: "",
            }))
        );
        setStep(3);
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const updateRow = (idx, field, value) => {
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };

    const activeRows = rows.filter((r) => !r.isSunday);
    const readyCount = activeRows.filter((r) => r.courseId).length;

    const handleSubmit = async () => {
        setError("");

        const schedules = activeRows
            .filter((r) => r.courseId)
            .map((r) => ({
                courseId: r.courseId,
                testDate: r.date,
                testDay: r.dayName,
                syllabus: r.syllabus,
            }));

        if (schedules.length === 0) {
            setError("Fill in a subject for at least one row before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(
                `${API_BASE}/addTestScheduleByAdmin`,
                { classInfo, title: sheetTitle, schedules },
                { headers: getAuthHeaders() }
            );
            setDone(true);
        } catch (err) {
            setError(err?.response?.data?.message || "Something went wrong. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setStep(1);
        setSheetTitle("");
        setFrom("");
        setTo("");
        setClassInfo("");
        setRows([]);
        setDone(false);
        setError("");
    };

    const selectedClassName =
        (classOptions || []).find((c) => (c._id || c) === classInfo)?.name || "";

        console.log("allcourses:", allcourses);
console.log("rows:", rows);
    return (
        <Sidebar>
            <div className="uts-page">
                <div className="uts-container">
                  <div className="uts-topbar">
                        <div className="uts-steps">
                            {[1, 2, 3].map((s) => (
                                <React.Fragment key={s}>
                                    <div className={`uts-step-dot ${step >= s ? "active" : ""}`}>{s}</div>
                                    {s < 3 && <div className={`uts-step-line ${step > s ? "active" : ""}`} />}
                                </React.Fragment>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="uts-view-link"
                            onClick={() => navigate("/viewTestAndSyllabus")}
                        >
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            View All Schedules
                        </button>
                    </div>

                    <div className="uts-header">
                        <h1>Add Test Schedule &amp; Syllabus</h1>
                        <p>
                            {step === 1 && "Name this test sheet and pick the date range it covers."}
                            {step === 2 && "Which class is this for?"}
                            {step === 3 && "Assign a subject and syllabus for each test day."}
                            {done && "All set."}
                        </p>
                    </div>


                    {/* Recap strip — shows once user has entered something */}
                    {(sheetTitle || from) && step > 1 && !done && (
                        <div className="uts-recap">
                            <span className="uts-recap-item">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                                </svg>
                                {sheetTitle}
                            </span>
                            {from && to && (
                                <span className="uts-recap-item">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                                    </svg>
                                    {new Date(from).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                                    {" – "}
                                    {new Date(to).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                                </span>
                            )}
                            {step > 2 && selectedClassName && (
                                <span className="uts-recap-item">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                                        <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
                                    </svg>
                                    {selectedClassName}
                                </span>
                            )}
                        </div>
                    )}

                    {/* STEP 1: title + dates */}
                    {step === 1 && (
                        <div className="uts-card uts-card-split">
                            <div className="uts-card-main">
                                <div className="uts-card-heading">
                                    <span className="uts-card-eyebrow">Step 1 of 3</span>
                                    <h2>Sheet Details</h2>
                                    <p>Give this test period a name and set the dates it should cover.</p>
                                </div>

                                <div className="uts-field" style={{ marginBottom: 20 }}>
                                    <label>Sheet Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Monthly Test - August, Weekly Test Schedule"
                                        value={sheetTitle}
                                        onChange={(e) => setSheetTitle(e.target.value)}
                                    />
                                </div>
                                <div className="uts-grid-2">
                                    <div className="uts-field">
                                        <label>From</label>
                                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                                    </div>
                                    <div className="uts-field">
                                        <label>To</label>
                                        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                                    </div>
                                </div>
                                <div className="uts-actions" style={{ justifyContent: "flex-end" }}>
                                    <button
                                        className="uts-btn uts-btn-primary"
                                        disabled={!sheetTitle.trim() || !from || !to}
                                        onClick={() => setStep(2)}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>

                            <aside className="uts-card-aside">
                                <div className="uts-aside-icon">
                                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                                    </svg>
                                </div>
                                <h3>What happens next</h3>
                                <ul className="uts-aside-list">
                                    <li><span className="uts-aside-num">1</span> Pick the class this sheet applies to</li>
                                    <li><span className="uts-aside-num">2</span> Assign a subject &amp; syllabus to each date</li>
                                    <li><span className="uts-aside-num">3</span> Sundays are detected automatically and skipped</li>
                                </ul>
                            </aside>
                        </div>
                    )}

                    {/* STEP 2: class picker */}
                    {step === 2 && (
                        <div className="uts-card uts-card-split">
                            <div className="uts-card-main">
                                <div className="uts-card-heading">
                                    <span className="uts-card-eyebrow">Step 2 of 3</span>
                                    <h2>Select Class</h2>
                                    <p>This schedule will be visible only to students in the class you choose.</p>
                                </div>

                                <div className="uts-class-grid">
                                    {(classOptions || []).map((c) => (
                                        <button
                                            key={c._id || c}
                                            className={`uts-class-btn ${classInfo === (c._id || c) ? "selected" : ""}`}
                                            onClick={() => setClassInfo(c._id || c)}
                                        >
                                            <span className="uts-class-icon">
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                                                    <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
                                                </svg>
                                            </span>
                                            {c.name || c}
                                        </button>
                                    ))}
                                </div>

                                <div className="uts-actions">
                                    <button className="uts-btn uts-btn-secondary" onClick={() => setStep(1)}>Back</button>
                                    <button className="uts-btn uts-btn-primary" disabled={!classInfo} onClick={goToStep3}>Continue</button>
                                </div>
                            </div>

                            <aside className="uts-card-aside">
                                <div className="uts-aside-icon">
                                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <h3>Why it matters</h3>
                                <p className="uts-aside-note">
                                    Every test day you add in the next step will only pull subjects that
                                    belong to this class — so double check before continuing.
                                </p>
                            </aside>
                        </div>
                    )}
                       
                    {/* STEP 3: table, no per-row title anymore */}
                    {step === 3 && !done && (
                        <div className="uts-card">
                            <div className="uts-sheet-badge">{sheetTitle}</div>

                            <div className="uts-table-wrap">
                                <table className="uts-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Day</th>
                                            <th>Subject</th>
                                            <th>Syllabus</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, idx) => (
                                            <tr key={idx} className={r.isSunday ? "sunday-row" : ""}>
                                                <td>{r.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</td>
                                                <td>
                                                    <span className={`uts-day-pill ${r.isSunday ? "off" : "ok"}`}>{r.dayName}</span>
                                                </td>
                                                {r.isSunday ? (
                                                    <td colSpan={2} className="uts-muted">Holiday — no test</td>
                                                ) : (
                                                    <>
                                                        <td>
                                                            <select value={r.courseId} onChange={(e) => updateRow(idx, "courseId", e.target.value)}>
                                                                <option value="">Select</option>
                                                                {allcourses.map((c) => (
                                                                    <option key={c._id} value={c._id}>{c.title}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input
                                                                value={r.syllabus}
                                                                placeholder="Chapters / topics"
                                                                onChange={(e) => updateRow(idx, "syllabus", e.target.value)}
                                                            />
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {error && <div className="uts-error">{error}</div>}

                            <div className="uts-actions">
                                <button className="uts-btn uts-btn-secondary" onClick={() => setStep(2)}>Back</button>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <span className="uts-progress">{readyCount} of {activeRows.length} filled</span>
                                    <button
                                        className="uts-btn uts-btn-primary"
                                        disabled={submitting || readyCount === 0}
                                        onClick={handleSubmit}
                                    >
                                        {submitting ? "Saving..." : "Save Schedule"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    

                    {done && (
                        <div className="uts-card uts-done">
                            <div className="uts-done-icon">✓</div>
                            <h2>"{sheetTitle}" saved</h2>
                            <p>Students in this class can now see it.</p>
                            <button className="uts-btn uts-btn-primary" onClick={reset}>Add another</button>
                        </div>
                    )}
                </div>

           {isShowingScheduleTest === true && (
            <ViewTestAndSyllabus/>
           )}
            </div>
            
        </Sidebar>
    );
}

export default UploadTestAndSyllabus;