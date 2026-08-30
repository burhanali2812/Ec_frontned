import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../contextApi/AppContext";
import axios from "axios"; 
import "./ViewTestAndSyllabus.css";
import Sidebar from "../Sidebar";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const API_BASE = "https://api.theecportal.com/api/testScheduleAndSyllabus"; 

function formatDate(d) {
    return new Date(d).toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function toDateInputValue(d) {
    return new Date(d).toISOString().split("T")[0];
}

function ViewTestAndSyllabus() {
    const { allcourses, classOptions, user } = useAppContext();
    const isAdmin = user?.role === "admin";

    const [sheets, setSheets] = useState([]);
    const [classFilter, setClassFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editingSheetId, setEditingSheetId] = useState(null);
    const [sheetTitleDraft, setSheetTitleDraft] = useState("");

    const [editingEntry, setEditingEntry] = useState(null);
    const [entryDraft, setEntryDraft] = useState({ courseId: "", testDate: "", testDay: "", syllabus: "" });

    const [busyId, setBusyId] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

   
    const loadSheets = () => {
        setLoading(true);
        setError("");

        const request = isAdmin
            ? axios.get(`${API_BASE}/getAllTestSchedules`, { headers: getAuthHeaders() })
            : axios.get(`${API_BASE}/getTestScheduleAndSyllabusByclassInfo/${user?.classInfo}`, {
                  headers: getAuthHeaders(),
              });

        request
            .then((res) => setSheets(res.data.sheets || []))
            .catch(() => setError("Couldn't load the schedule. Try again."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!isAdmin && !user?.classInfo) return; 
        loadSheets();
  
    }, [isAdmin, user?.classInfo]);

    const filtered = useMemo(() => {
        if (!isAdmin || classFilter === "all") return sheets;
        return sheets.filter((s) => (s.classInfo?._id || s.classInfo) === classFilter);
    }, [sheets, classFilter, isAdmin]);

    const totalEntries = (sheet) => sheet.schedules?.length || 0;


    const startEditSheet = (sheet) => {
        setEditingSheetId(sheet._id);
        setSheetTitleDraft(sheet.title);
    };

    const cancelEditSheet = () => {
        setEditingSheetId(null);
        setSheetTitleDraft("");
    };

    const saveSheetTitle = async (sheetId) => {
        if (!sheetTitleDraft.trim()) return;
        setBusyId(sheetId);
        try {
            await axios.put(
                `${API_BASE}/updateTestSchedule/${sheetId}`,
                { title: sheetTitleDraft },
                { headers: getAuthHeaders() }
            );
            setSheets((prev) => prev.map((s) => (s._id === sheetId ? { ...s, title: sheetTitleDraft } : s)));
            cancelEditSheet();
        } catch (err) {
            setError(err?.response?.data?.message || "Couldn't update the title.");
        } finally {
            setBusyId(null);
        }
    };


    const deleteSheet = async (sheetId) => {
        if (!window.confirm("Delete this entire test sheet and all its dates? This can't be undone.")) return;
        setBusyId(sheetId);
        try {
            await axios.delete(`${API_BASE}/deleteTestSchedule/${sheetId}`, { headers: getAuthHeaders() });
            setSheets((prev) => prev.filter((s) => s._id !== sheetId));
        } catch (err) {
            setError(err?.response?.data?.message || "Couldn't delete the sheet.");
        } finally {
            setBusyId(null);
        }
    };

  
    const startEditEntry = (sheetId, entry) => {
        setEditingEntry({ sheetId, entryId: entry._id });
        setEntryDraft({
            courseId: entry.course?._id || entry.course,
            testDate: toDateInputValue(entry.testDate),
            testDay: entry.testDay,
            syllabus: entry.syllabus,
        });
    };

    const cancelEditEntry = () => {
        setEditingEntry(null);
        setEntryDraft({ courseId: "", testDate: "", testDay: "", syllabus: "" });
    };

    const onEntryDateChange = (value) => {
        const day = DAYS[new Date(value).getDay()];
        setEntryDraft((prev) => ({ ...prev, testDate: value, testDay: day }));
    };

    const saveEntry = async () => {
        const { sheetId, entryId } = editingEntry;
        setBusyId(entryId);
        try {
            const res = await axios.put(
                `${API_BASE}/updateScheduleEntry/${sheetId}/${entryId}`,
                {
                    courseId: entryDraft.courseId,
                    testDate: entryDraft.testDate,
                    testDay: entryDraft.testDay,
                    syllabus: entryDraft.syllabus,
                },
                { headers: getAuthHeaders() }
            );
            setSheets((prev) => prev.map((s) => (s._id === sheetId ? res.data.sheet : s)));
            cancelEditEntry();
        } catch (err) {
            setError(err?.response?.data?.message || "Couldn't update this entry.");
        } finally {
            setBusyId(null);
        }
    };

    const deleteEntry = async (sheetId, entryId) => {
        if (!window.confirm("Delete this test date?")) return;
        setBusyId(entryId);
        try {
            const res = await axios.delete(`${API_BASE}/deleteScheduleEntry/${sheetId}/${entryId}`, {
                headers: getAuthHeaders(),
            });
            setSheets((prev) => prev.map((s) => (s._id === sheetId ? res.data.sheet : s)));
        } catch (err) {
            setError(err?.response?.data?.message || "Couldn't delete this entry.");
        } finally {
            setBusyId(null);
        }
    };
    

    return (
        <Sidebar>
            <div className="vts-page">
                <div className="vts-container">
                    <div className="vts-header">
                        <div>
                            <h1>Test Schedules &amp; Syllabus</h1>
                            <p>
                                {isAdmin
                                    ? "Everything you've created — edit or remove entries anytime."
                                    : "Upcoming tests and syllabus for your class."}
                            </p>
                        </div>
                        {isAdmin && (
                            <div className="vts-filter">
                                <label htmlFor="classFilter">Class</label>
                                <select
                                    id="classFilter"
                                    value={classFilter}
                                    onChange={(e) => setClassFilter(e.target.value)}
                                >
                                    <option value="all">All classes</option>
                                    {(classOptions || []).map((c) => (
                                        <option key={c._id || c} value={c._id || c}>
                                            {c.name || c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {error && <div className="vts-error">{error}</div>}

                    {loading && (
                        <div className="vts-card">
                            {[1, 2, 3].map((i) => <div key={i} className="vts-skeleton-row" />)}
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="vts-card">
                            <div className="vts-empty">
                                <div className="vts-empty-icon">📋</div>
                                No test schedules{isAdmin && classFilter !== "all" ? " for this class" : ""} yet.
                            </div>
                        </div>
                    )}

                    {!loading &&
                        filtered.map((sheet) => (
                            <div className="vts-sheet" key={sheet._id}>
                                <div className="vts-sheet-header">
                                    <div className="vts-sheet-title-block">
                                        {isAdmin && editingSheetId === sheet._id ? (
                                            <div className="vts-inline-edit">
                                                <input
                                                    type="text"
                                                    value={sheetTitleDraft}
                                                    onChange={(e) => setSheetTitleDraft(e.target.value)}
                                                    autoFocus
                                                />
                                                <button
                                                    className="vts-icon-btn vts-icon-save"
                                                    disabled={busyId === sheet._id}
                                                    onClick={() => saveSheetTitle(sheet._id)}
                                                    title="Save"
                                                >
                                                    ✓
                                                </button>
                                                <button className="vts-icon-btn" onClick={cancelEditSheet} title="Cancel">
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <h2>{sheet.title}</h2>
                                                {isAdmin && (
                                                    <button
                                                        className="vts-icon-btn"
                                                        onClick={() => startEditSheet(sheet)}
                                                        title="Rename sheet"
                                                    >
                                                        ✎
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {isAdmin && <span className="vts-class-pill">{sheet.classInfo?.name || "—"}</span>}
                                        <span className="vts-count-pill">
                                            {totalEntries(sheet)} test{totalEntries(sheet) !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            className="vts-btn-delete-sheet"
                                            disabled={busyId === sheet._id}
                                            onClick={() => deleteSheet(sheet._id)}
                                        >
                                            Delete Sheet
                                        </button>
                                    )}
                                </div>

                                <div className="vts-table-wrap">
                                    <table className="vts-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Day</th>
                                                <th>Subject</th>
                                                <th>Syllabus</th>
                                                {isAdmin && <th className="vts-actions-col">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(sheet.schedules || []).map((entry) => {
                                                const isEditing =
                                                    isAdmin &&
                                                    editingEntry?.sheetId === sheet._id &&
                                                    editingEntry?.entryId === entry._id;

                                                return (
                                                    <tr key={entry._id}>
                                                        {isEditing ? (
                                                            <>
                                                                <td>
                                                                    <input
                                                                        type="date"
                                                                        value={entryDraft.testDate}
                                                                        onChange={(e) => onEntryDateChange(e.target.value)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <span className="vts-day-pill">{entryDraft.testDay}</span>
                                                                </td>
                                                                <td>
                                                                    <select
                                                                        value={entryDraft.courseId}
                                                                        onChange={(e) =>
                                                                            setEntryDraft((p) => ({ ...p, courseId: e.target.value }))
                                                                        }
                                                                    >
                                                                        <option value="">Select</option>
                                                                        {(allcourses || []).map((c) => (
                                                                            <option key={c._id} value={c._id}>{c.title}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={entryDraft.syllabus}
                                                                        onChange={(e) =>
                                                                            setEntryDraft((p) => ({ ...p, syllabus: e.target.value }))
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="vts-actions-col">
                                                                    <button
                                                                        className="vts-icon-btn vts-icon-save"
                                                                        disabled={busyId === entry._id}
                                                                        onClick={saveEntry}
                                                                        title="Save"
                                                                    >
                                                                        ✓
                                                                    </button>
                                                                    <button className="vts-icon-btn" onClick={cancelEditEntry} title="Cancel">
                                                                        ✕
                                                                    </button>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="vts-date-cell">{formatDate(entry.testDate)}</td>
                                                                <td><span className="vts-day-pill">{entry.testDay}</span></td>
                                                                <td className="vts-subject">{entry.course?.title || entry.course?.name || "—"}</td>
                                                                <td className="vts-syllabus">{entry.syllabus || "—"}</td>
                                                                {isAdmin && (
                                                                    <td className="vts-actions-col">
                                                                        <button
                                                                            className="vts-icon-btn"
                                                                            onClick={() => startEditEntry(sheet._id, entry)}
                                                                            title="Edit"
                                                                        >
                                                                            ✎
                                                                        </button>
                                                                        <button
                                                                            className="vts-icon-btn vts-icon-danger"
                                                                            disabled={busyId === entry._id}
                                                                            onClick={() => deleteEntry(sheet._id, entry._id)}
                                                                            title="Delete"
                                                                        >
                                                                            🗑
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </Sidebar>
    );
}

export default ViewTestAndSyllabus;