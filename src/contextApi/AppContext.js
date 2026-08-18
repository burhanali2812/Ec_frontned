import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import axios from "axios";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [classOptions, setClassOptions] = useState([]);
  const [students, setStudents] = useState([]);
  const [allcourses, setAllCourses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState([]);
  const [isTodaySunday, setIsTodaySunday] = useState(false);
    const [notifications, setNotifications] = useState([]);
      const [error, setError] = useState("");

  const API_BASE_URL = "https://ec-backend-phi.vercel.app/api";
  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  function authHeaders(overrideToken) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${overrideToken ?? token}`,
    };
  }

  const getLocalToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ---- individual fetchers now accept an optional token override,
  // so they can be called immediately after login before state settles ----

  const fetchClasses = async (overrideToken) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/classes/getClasses`, {
        headers: authHeaders(overrideToken),
      });
      if (!res.data.success) {
        console.error(res.data.message || "Failed to fetch classes");
      }
      setClassOptions(res.data.data || []);
    } catch (err) {
      console.error(err.message || "Error fetching classes");
    }
  };

  const fetchStudents = async (overrideToken) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/students/getAllStudents`, {
        params: { institutionType: "Academy" },
        headers: authHeaders(overrideToken),
      });
      if (res.data?.success) {
        setStudents(res.data.students || []);
      } else {
        console.error(res.data?.message || "Failed to load students");
      }
    } catch (error) {
      console.error(error, "Unable to load students. Please refresh.");
    }
  };

  const fetchAllCourses = async (overrideToken) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/courses/getAllCourses`, {
        headers: authHeaders(overrideToken),
      });
      if (res.data?.success) {
        setAllCourses(res.data.courses || []);
      } else {
        console.error(res.data?.message || "Failed to load courses");
      }
    } catch (error) {
      console.error(error, "Unable to load courses. Please refresh.");
    }
  };

  const fetchCourses = async (overrideToken) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/courses/allCourses`, {
        headers: authHeaders(overrideToken),
      });
      if (res.data?.success) {
        setCourses(res.data.courses || []);
      } else {
        console.error(res.data?.message || "Failed to load courses");
      }
    } catch (error) {
      console.error(error, "Unable to load courses. Please refresh.");
    }
  };

  const fetchTeachers = async (overrideToken) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/teacher/getAllTeachers`, {
        params: { institutionType: "academy" },
        headers: authHeaders(overrideToken),
      });
      if (res.data?.success) {
        setTeachers(res.data.teachers || []);
      }
    } catch (error) {
      console.error(error, "Unable to load teachers. Please refresh.");
    }
  };

  const isFetchingAttendance = useRef(false);

  const fetchTodayAttendanceStatus = useCallback(async () => {
    if (!allcourses || allcourses.length === 0 || !classOptions || classOptions.length === 0) {
      return;
    }
    if (isFetchingAttendance.current) return;
    isFetchingAttendance.current = true;

    try {
      const isTodaySundayCheck = new Date().getDay() === 0;
      if (isTodaySundayCheck) {
        setIsTodaySunday(true);
        setTodayAttendanceStatus([]);
        return;
      }
      setIsTodaySunday(false);

      const today = getLocalToday();
      const requestQueue = [];
      const requestMap = {};
      const courseMap = {};

      for (const course of allcourses) {
        const assignmentClasses = Array.isArray(course.assignments)
          ? course.assignments.filter(Boolean).flatMap((item) => item?.targetClasses || [])
          : [];

        const allowedClassIds = new Set(
          assignmentClasses.map((c) => (c && c._id ? String(c._id) : String(c))).filter(Boolean),
        );

        courseMap[course._id] = {
          courseId: course._id,
          courseName: course.title || course.name,
          classes: {},
        };

        for (const classItem of classOptions) {
          courseMap[course._id].classes[String(classItem._id)] = allowedClassIds.has(
            String(classItem._id),
          )
            ? "pending"
            : "not-assigned";
        }

        const relevantClasses = classOptions.filter((cls) => allowedClassIds.has(String(cls._id)));
        if (relevantClasses.length === 0) continue;

        for (const classItem of relevantClasses) {
          const requestKey = `${course._id}|${classItem._id}`;
          requestMap[requestKey] = {
            courseId: course._id,
            classInfo: String(classItem._id),
          };

          requestQueue.push(
            axios
              .get(`${API_BASE_URL}/attendance/session`, {
                params: {
                  courseId: course._id,
                  classInfo: classItem._id,
                  date: today,
                  fetchedBy: "adminDailyAttendanceCheck",
                },
                headers: authHeaders(),
                timeout: 8000,
              })
              .then((res) => ({ ok: true, data: res.data }))
              .catch(() => ({ ok: false })),
          );
        }
      }

      const responses = await Promise.all(requestQueue);

      responses.forEach((res, idx) => {
        const requestKey = Object.keys(requestMap)[idx];
        const { courseId, classInfo } = requestMap[requestKey];

        let status = "pending";
        if (res.ok && res.data?.success && res.data?.hasAttendanceToday === true) {
          status = "done";
        } else if (res.ok && res.data?.success && res.data?.totalStudents === 0) {
          status = "no-students";
        }
        courseMap[courseId].classes[classInfo] = status;
      });

      setTodayAttendanceStatus(Object.values(courseMap));
    } catch (error) {
      console.error("Error fetching today attendance status:", error);
    } finally {
      isFetchingAttendance.current = false;
    }
  }, [allcourses, classOptions]);

    const fetchNotifications = useCallback(async (overrideToken) => {
   
      setError("");
      try {
        const res = await fetch(`${API_BASE}/notifications`, { headers: authHeaders(overrideToken) });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to load notifications.");
        setNotifications(data.notifications);
      } catch (err) {
        setError(err.message || "Something went wrong while loading notifications.");
      }
    }, []);

  // ---- single entry point that loads everything, called on login ----
  const loadAllAppData = useCallback(async (overrideToken, userData) => {
    console.log("Loading all app data with token:", overrideToken);
    if (!overrideToken) {
      console.error("No token provided for loadAllAppData");
      return;
    }
    console.log("User role before loading data", userData);
   if(userData && userData?.role === "admin") {
     await Promise.all([
      fetchClasses(overrideToken),
      fetchStudents(overrideToken),
      fetchAllCourses(overrideToken),
      fetchCourses(overrideToken),
      fetchTeachers(overrideToken),
    ]);
   }
   console.log("User role after loading data", userData);
if (
  userData &&
  (userData.role === "teacher" || userData.role === "student" || userData.role === "Teacher" || userData.role === "Student")
) {
  await Promise.all([
    fetchClasses(overrideToken),
    fetchNotifications(overrideToken),
  ]);
}

  }, []);

  // ---- call this from your login handler ----
 const login = useCallback(
  async (newToken, userData) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData || null));
    setToken(newToken);
    if (userData) setUser(userData);
    await loadAllAppData(newToken, userData);
  },
  [loadAllAppData],
);

 const logout = useCallback(() => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  setToken("");
  setUser(null);
  setClassOptions([]);
  setStudents([]);
  setAllCourses([]);
  setCourses([]);
  setTeachers([]);
  setNotifications([]);
  setError("");
  setTeachers([]);
  setTodayAttendanceStatus([]);
}, []);

  // If the user is already logged in on app load (token exists in localStorage),
  // load data once on mount.
useEffect(() => {
  if (token) {
    const storedUser = localStorage.getItem("user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    loadAllAppData(token, parsedUser);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  return (
    <AppContext.Provider
      value={{
        // variables
        user,
        token,
        classOptions,
        students,
        allcourses,
        courses,
        teachers,
        todayAttendanceStatus,
        isTodaySunday,
        notifications,
        error,

        // setters
        setCourses,
        setTeachers,
        setUser,
        setNotifications,
      setError,

        // functions
        login,
        logout,
        fetchClasses,
        fetchStudents,
        fetchCourses,
        fetchTeachers,
        fetchTodayAttendanceStatus,
        getLocalToday,
        fetchNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};