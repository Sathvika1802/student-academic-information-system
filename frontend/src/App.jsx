import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "./api";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  const departmentOptions = [
    "Computer and Information Sciences",
    "Electrical and Computer Engineering",
    "Data Science",
    "Mechanical Engineering",
    "Civil Engineering"
  ];

  const semesterOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  const [dashboard, setDashboard] = useState(null);
  const [offeredCourses, setOfferedCourses] = useState([]);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const [selectedRegistrationDepartment, setSelectedRegistrationDepartment] =
    useState("");
  const [selectedRegistrationSemester, setSelectedRegistrationSemester] =
    useState("");

  const [facultyDashboard, setFacultyDashboard] = useState(null);
  const [adminDashboard, setAdminDashboard] = useState(null);

  const [selectedRecordId, setSelectedRecordId] = useState("");

  const [studentFilter, setStudentFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const [facultyFilter, setFacultyFilter] = useState("");
  const [facultySearch, setFacultySearch] = useState("");

  const [courseFilter, setCourseFilter] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  const [offeringDepartmentFilter, setOfferingDepartmentFilter] = useState("");

  const [registrationFilter, setRegistrationFilter] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");

  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);

  const [editStudentForm, setEditStudentForm] = useState({
    name: "",
    email: "",
    studentCode: "",
    department: ""
  });

  const [editFacultyForm, setEditFacultyForm] = useState({
    name: "",
    email: "",
    facultyCode: "",
    department: ""
  });

  const [editCourseForm, setEditCourseForm] = useState({
    courseCode: "",
    courseName: "",
    department: "",
    credits: ""
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [error, setError] = useState("");

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    department: "",
    semester: ""
  });

  const [facultyForm, setFacultyForm] = useState({
    name: "",
    email: "",
    password: "",
    facultyCode: "",
    department: ""
  });

  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    department: "",
    credits: ""
  });

  const [offeringForm, setOfferingForm] = useState({
    courseId: "",
    semester: "",
    facultyId: ""
  });

  const [marksForm, setMarksForm] = useState({
    assignmentMarks: "",
    quizMarks: "",
    projectMarks: "",
    finalExamMarks: ""
  });

  const [attendanceForm, setAttendanceForm] = useState({
    classesConducted: "",
    classesAttended: ""
  });

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  async function refreshAdminDashboard() {
    const adminResponse = await api.get("/admin/dashboard");
    setAdminDashboard(adminResponse.data);
  }

  async function refreshStudentDashboard(userId) {
    const dashboardResponse = await api.get(`/student/dashboard/${userId}`);
    setDashboard(dashboardResponse.data);

    const department =
      selectedRegistrationDepartment ||
      dashboardResponse.data.student.department;
    const semester =
      selectedRegistrationSemester || dashboardResponse.data.student.semester;

    const offeredResponse = await api.get(`/student/offered-courses/${userId}`, {
      params: {
        department,
        semester
      }
    });

    setRegistrationOpen(offeredResponse.data.registrationOpen);
    setOfferedCourses(offeredResponse.data.offeredCourses);
    setSelectedRegistrationDepartment(department);
    setSelectedRegistrationSemester(String(semester));
  }

  async function loadOfferedCourses(department, semester) {
    if (!user || user.role !== "student") {
      return;
    }

    clearMessages();

    try {
      const offeredResponse = await api.get(
        `/student/offered-courses/${user.id}`,
        {
          params: {
            department,
            semester
          }
        }
      );

      setRegistrationOpen(offeredResponse.data.registrationOpen);
      setOfferedCourses(offeredResponse.data.offeredCourses);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load offered courses."
      );
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    clearMessages();

    try {
      const response = await api.post("/auth/login", {
        email,
        password
      });

      const loggedInUser = response.data.user;
      setUser(loggedInUser);

      if (loggedInUser.role === "student") {
        const dashboardResponse = await api.get(
          `/student/dashboard/${loggedInUser.id}`
        );

        setDashboard(dashboardResponse.data);

        const defaultDepartment = dashboardResponse.data.student.department;
        const defaultSemester = dashboardResponse.data.student.semester;

        setSelectedRegistrationDepartment(defaultDepartment);
        setSelectedRegistrationSemester(String(defaultSemester));

        const offeredResponse = await api.get(
          `/student/offered-courses/${loggedInUser.id}`,
          {
            params: {
              department: defaultDepartment,
              semester: defaultSemester
            }
          }
        );

        setRegistrationOpen(offeredResponse.data.registrationOpen);
        setOfferedCourses(offeredResponse.data.offeredCourses);
      }

      if (loggedInUser.role === "faculty") {
        const facultyResponse = await api.get(
          `/faculty/dashboard/${loggedInUser.id}`
        );
        setFacultyDashboard(facultyResponse.data);
      }

      if (loggedInUser.role === "admin") {
        const adminResponse = await api.get("/admin/dashboard");
        setAdminDashboard(adminResponse.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  function logout() {
    setUser(null);
    setDashboard(null);
    setOfferedCourses([]);
    setRegistrationOpen(false);
    setSelectedRegistrationDepartment("");
    setSelectedRegistrationSemester("");

    setFacultyDashboard(null);
    setAdminDashboard(null);

    setSelectedRecordId("");

    setStudentFilter("");
    setStudentSearch("");

    setFacultyFilter("");
    setFacultySearch("");

    setCourseFilter("");
    setCourseSearch("");

    setOfferingDepartmentFilter("");

    setRegistrationFilter("");
    setRegistrationSearch("");

    setEditingStudentId(null);
    setEditingFacultyId(null);
    setEditingCourseId(null);

    setMessage("");
    setErrorMessage("");
    setError("");

    setEmail("");
    setPassword("");
  }

  function calculateSemesterGpa(records) {
    const totalCredits = records.reduce(
      (sum, course) => sum + Number(course.credits || 0),
      0
    );

    const weightedPoints = records.reduce(
      (sum, course) =>
        sum + Number(course.grade_points || 0) * Number(course.credits || 0),
      0
    );

    if (totalCredits === 0) {
      return "0.00";
    }

    return (weightedPoints / totalCredits).toFixed(2);
  }

  function getRecordsForSemester(semester) {
    if (!dashboard?.records) {
      return [];
    }

    return dashboard.records.filter(
      (record) => Number(record.semester) === Number(semester)
    );
  }

  function downloadTranscript() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Student Academic Transcript", 14, 18);

    doc.setFontSize(11);
    doc.text(`Name: ${dashboard.student.name}`, 14, 32);
    doc.text(`Student ID: ${dashboard.student.student_id}`, 14, 40);
    doc.text(`Email: ${dashboard.student.email}`, 14, 48);
    doc.text(`Department: ${dashboard.student.department}`, 14, 56);
    doc.text(`Overall CGPA: ${dashboard.summary.overallCgpa}`, 14, 64);
    doc.text(`Total Credits: ${dashboard.summary.totalCredits}`, 14, 72);

    const coursesBySemester = dashboard.records.reduce((groups, course) => {
      const semester = course.semester || "N/A";

      if (!groups[semester]) {
        groups[semester] = [];
      }

      groups[semester].push(course);
      return groups;
    }, {});

    let startY = 86;

    Object.keys(coursesBySemester)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((semester) => {
        const semesterCourses = coursesBySemester[semester];
        const semesterGpa = calculateSemesterGpa(semesterCourses);

        doc.setFontSize(13);
        doc.text(`Semester ${semester}`, 14, startY);

        autoTable(doc, {
          startY: startY + 6,
          head: [
            [
              "Course Code",
              "Course Name",
              "Credits",
              "Total Marks",
              "Grade",
              "Grade Points"
            ]
          ],
          body: semesterCourses.map((course) => [
            course.course_code,
            course.course_name,
            course.credits,
            course.total_marks,
            course.grade,
            course.grade_points
          ])
        });

        startY = doc.lastAutoTable.finalY + 8;

        doc.setFontSize(11);
        doc.text(`Semester GPA: ${semesterGpa}`, 14, startY);

        startY += 14;
      });

    doc.save("student-academic-transcript.pdf");
  }

  async function registerForCourse(offeringId) {
    clearMessages();

    try {
      await api.post("/student/register-course", {
        userId: user.id,
        offeringId
      });

      await refreshStudentDashboard(user.id);
      setMessage("Course registered successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to register course.");
    }
  }

  async function handleRegistrationFilterChange(department, semester) {
    setSelectedRegistrationDepartment(department);
    setSelectedRegistrationSemester(semester);

    if (department && semester) {
      await loadOfferedCourses(department, semester);
    }
  }

  function handleRecordSelection(recordId) {
    setSelectedRecordId(recordId);
    clearMessages();

    const record = facultyDashboard.enrolledStudents.find(
      (item) => String(item.enrollment_id) === String(recordId)
    );

    if (record) {
      setMarksForm({
        assignmentMarks: record.assignment_marks ?? "",
        quizMarks: record.quiz_marks ?? "",
        projectMarks: record.project_marks ?? "",
        finalExamMarks: record.final_exam_marks ?? ""
      });

      setAttendanceForm({
        classesConducted: record.classes_conducted ?? "",
        classesAttended: record.classes_attended ?? ""
      });
    }
  }

  async function updateMarks(e) {
    e.preventDefault();
    clearMessages();

    try {
      const record = facultyDashboard.enrolledStudents.find(
        (item) => String(item.enrollment_id) === String(selectedRecordId)
      );

      if (!record) {
        setErrorMessage("Please select a student and course first.");
        return;
      }

      await api.put("/faculty/marks", {
        studentId: record.student_table_id,
        offeringId: record.offering_id,
        ...marksForm
      });

      const facultyResponse = await api.get(`/faculty/dashboard/${user.id}`);
      setFacultyDashboard(facultyResponse.data);
      setMessage("Marks updated successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to update marks.");
    }
  }

  async function updateAttendance(e) {
    e.preventDefault();
    clearMessages();

    try {
      const record = facultyDashboard.enrolledStudents.find(
        (item) => String(item.enrollment_id) === String(selectedRecordId)
      );

      if (!record) {
        setErrorMessage("Please select a student and course first.");
        return;
      }

      await api.put("/faculty/attendance", {
        studentId: record.student_table_id,
        offeringId: record.offering_id,
        ...attendanceForm
      });

      const facultyResponse = await api.get(`/faculty/dashboard/${user.id}`);
      setFacultyDashboard(facultyResponse.data);
      setMessage("Attendance updated successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to update attendance.");
    }
  }

  async function createStudent(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.post("/admin/create-student", studentForm);
      await refreshAdminDashboard();

      setStudentForm({
        name: "",
        email: "",
        password: "",
        studentId: "",
        department: "",
        semester: ""
      });

      setMessage("Student created successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create student.");
    }
  }

  async function createFaculty(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.post("/admin/create-faculty", facultyForm);
      await refreshAdminDashboard();

      setFacultyForm({
        name: "",
        email: "",
        password: "",
        facultyCode: "",
        department: ""
      });

      setMessage("Faculty created successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create faculty.");
    }
  }

  async function createCourse(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.post("/admin/create-course", courseForm);
      await refreshAdminDashboard();

      setCourseForm({
        courseCode: "",
        courseName: "",
        department: "",
        credits: ""
      });

      setMessage("Course added to catalog successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create course.");
    }
  }

  async function createOffering(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.post("/admin/create-offering", offeringForm);
      await refreshAdminDashboard();

      setOfferingForm({
        courseId: "",
        semester: "",
        facultyId: ""
      });

      setMessage("Course offering created successfully.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to create course offering."
      );
    }
  }

  async function updateOfferingFaculty(offeringId, facultyId) {
    clearMessages();

    try {
      await api.put("/admin/update-offering-faculty", {
        offeringId,
        facultyId
      });

      await refreshAdminDashboard();
      setMessage("Faculty updated for course offering successfully.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          "Failed to update course offering faculty."
      );
    }
  }

  async function updateRegistrationStatus(status) {
    clearMessages();

    try {
      await api.put("/admin/registration-status", {
        registrationOpen: status
      });

      await refreshAdminDashboard();
      setMessage(status ? "Registration opened." : "Registration closed.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to update registration status."
      );
    }
  }

  async function updateStudentSemester(studentId, semester) {
    clearMessages();

    try {
      await api.put("/admin/update-student-semester", {
        studentId,
        semester
      });

      await refreshAdminDashboard();
      setMessage("Student semester updated successfully.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to update student semester."
      );
    }
  }

  function startEditStudent(student) {
    setEditingStudentId(student.id);
    setEditingFacultyId(null);
    setEditingCourseId(null);

    setEditStudentForm({
      name: student.name,
      email: student.email,
      studentCode: student.student_id,
      department: student.department
    });

    clearMessages();
  }

  function cancelEditStudent() {
    setEditingStudentId(null);
    setEditStudentForm({
      name: "",
      email: "",
      studentCode: "",
      department: ""
    });
  }

  async function updateStudentDetails(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.put(`/admin/update-student/${editingStudentId}`, editStudentForm);
      await refreshAdminDashboard();
      cancelEditStudent();
      setMessage("Student details updated successfully.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to update student details."
      );
    }
  }

  function startEditFaculty(faculty) {
    setEditingFacultyId(faculty.id);
    setEditingStudentId(null);
    setEditingCourseId(null);

    setEditFacultyForm({
      name: faculty.name,
      email: faculty.email,
      facultyCode: faculty.faculty_code,
      department: faculty.department
    });

    clearMessages();
  }

  function cancelEditFaculty() {
    setEditingFacultyId(null);
    setEditFacultyForm({
      name: "",
      email: "",
      facultyCode: "",
      department: ""
    });
  }

  async function updateFacultyDetails(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.put(`/admin/update-faculty/${editingFacultyId}`, editFacultyForm);
      await refreshAdminDashboard();
      cancelEditFaculty();
      setMessage("Faculty details updated successfully.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to update faculty details."
      );
    }
  }

  function startEditCourse(course) {
    setEditingCourseId(course.id);
    setEditingStudentId(null);
    setEditingFacultyId(null);

    setEditCourseForm({
      courseCode: course.course_code,
      courseName: course.course_name,
      department: course.department,
      credits: String(course.credits)
    });

    clearMessages();
  }

  function cancelEditCourse() {
    setEditingCourseId(null);
    setEditCourseForm({
      courseCode: "",
      courseName: "",
      department: "",
      credits: ""
    });
  }

  async function updateCourseDetails(e) {
    e.preventDefault();
    clearMessages();

    try {
      await api.put(`/admin/update-course/${editingCourseId}`, editCourseForm);
      await refreshAdminDashboard();
      cancelEditCourse();
      setMessage("Course details updated successfully.");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to update course details."
      );
    }
  }

  async function deleteStudent(studentId) {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    clearMessages();

    try {
      await api.delete(`/admin/delete-student/${studentId}`);
      await refreshAdminDashboard();
      setMessage("Student deleted successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to delete student.");
    }
  }

  async function deleteFaculty(facultyId) {
    if (!window.confirm("Are you sure you want to delete this faculty member?")) {
      return;
    }

    clearMessages();

    try {
      await api.delete(`/admin/delete-faculty/${facultyId}`);
      await refreshAdminDashboard();
      setMessage("Faculty deleted successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to delete faculty.");
    }
  }

  async function deleteCourse(courseId) {
    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    clearMessages();

    try {
      await api.delete(`/admin/delete-course/${courseId}`);
      await refreshAdminDashboard();
      setMessage("Course deleted successfully.");
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to delete course.");
    }
  }

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Student Academic Information System</h1>
          <p>Login to access academic records</p>

          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="error">{error}</p>}

            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    if (!adminDashboard) {
      return <p>Loading admin dashboard...</p>;
    }

    const shouldShowStudents =
      studentFilter !== "" || studentSearch.trim() !== "";

    const filteredStudents = shouldShowStudents
      ? adminDashboard.students.filter((student) => {
          let matchesFilter = true;

          if (studentFilter.startsWith("department:")) {
            const selectedDepartment = studentFilter.replace("department:", "");
            matchesFilter = student.department === selectedDepartment;
          }

          if (studentFilter.startsWith("semester:")) {
            const selectedSemester = studentFilter.replace("semester:", "");
            matchesFilter =
              Number(student.semester) === Number(selectedSemester);
          }

          const searchText = studentSearch.toLowerCase();

          const matchesSearch = searchText
            ? student.name.toLowerCase().includes(searchText) ||
              student.email.toLowerCase().includes(searchText) ||
              student.student_id.toLowerCase().includes(searchText)
            : true;

          return matchesFilter && matchesSearch;
        })
      : [];

    const shouldShowFaculty =
      facultyFilter !== "" || facultySearch.trim() !== "";

    const filteredFaculty = shouldShowFaculty
      ? adminDashboard.faculty.filter((faculty) => {
          let matchesFilter = true;

          if (facultyFilter.startsWith("department:")) {
            const selectedDepartment = facultyFilter.replace("department:", "");
            matchesFilter = faculty.department === selectedDepartment;
          }

          const searchText = facultySearch.toLowerCase();

          const matchesSearch = searchText
            ? faculty.name.toLowerCase().includes(searchText) ||
              faculty.email.toLowerCase().includes(searchText) ||
              faculty.faculty_code.toLowerCase().includes(searchText)
            : true;

          return matchesFilter && matchesSearch;
        })
      : [];

    const shouldShowCourses =
      courseFilter !== "" || courseSearch.trim() !== "";

    const filteredCourses = shouldShowCourses
      ? adminDashboard.courses.filter((course) => {
          let matchesFilter = true;

          if (courseFilter.startsWith("department:")) {
            const selectedDepartment = courseFilter.replace("department:", "");
            matchesFilter = course.department === selectedDepartment;
          }

          const searchText = courseSearch.toLowerCase();

          const matchesSearch = searchText
            ? course.course_code.toLowerCase().includes(searchText) ||
              course.course_name.toLowerCase().includes(searchText)
            : true;

          return matchesFilter && matchesSearch;
        })
      : [];

    const filteredOfferings =
      offeringDepartmentFilter === ""
        ? []
        : offeringDepartmentFilter === "all"
        ? adminDashboard.offerings
        : adminDashboard.offerings.filter(
            (offering) => offering.department === offeringDepartmentFilter
          );

    const shouldShowRegistrations =
      registrationFilter !== "" || registrationSearch.trim() !== "";

    const filteredRegistrations = shouldShowRegistrations
      ? adminDashboard.enrollments.filter((enrollment) => {
          let matchesFilter = true;

          if (registrationFilter.startsWith("department:")) {
            const selectedDepartment = registrationFilter.replace(
              "department:",
              ""
            );
            matchesFilter = enrollment.department === selectedDepartment;
          }

          if (registrationFilter.startsWith("semester:")) {
            const selectedSemester = registrationFilter.replace("semester:", "");
            matchesFilter =
              Number(enrollment.semester) === Number(selectedSemester);
          }

          const searchText = registrationSearch.toLowerCase();

          const matchesSearch = searchText
            ? enrollment.student_name.toLowerCase().includes(searchText) ||
              enrollment.student_id.toLowerCase().includes(searchText) ||
              enrollment.course_code.toLowerCase().includes(searchText) ||
              enrollment.course_name.toLowerCase().includes(searchText)
            : true;

          return matchesFilter && matchesSearch;
        })
      : [];

    return (
      <div className="dashboard-page admin-dashboard-bg">
        <div className="container">
        <div className="header">
          <div>
            <h2>Admin Dashboard</h2>
            <p>{user.name} • Academic Management</p>
          </div>
          <button onClick={logout}>Logout</button>
        </div>

        

        {message && <p className="success-message">{message}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="admin-summary-grid">
          <div className="summary-card">
            <h4>Students</h4>
            <p>{adminDashboard.students.length}</p>
          </div>

          <div className="summary-card">
            <h4>Faculty</h4>
            <p>{adminDashboard.faculty.length}</p>
          </div>

          <div className="summary-card">
            <h4>Catalog Courses</h4>
            <p>{adminDashboard.courses.length}</p>
          </div>

          <div className="summary-card">
            <h4>Offerings</h4>
            <p>{adminDashboard.offerings.length}</p>
          </div>

          <div className="summary-card">
            <h4>Registrations</h4>
            <p>{adminDashboard.enrollments.length}</p>
          </div>
        </div>

        <div className="card">
          <h3>Registration Control</h3>
          <p>
            Current status:{" "}
            <span
              className={
                adminDashboard.registrationOpen
                  ? "status-badge status-open"
                  : "status-badge status-closed"
              }
            >
              {adminDashboard.registrationOpen ? "Open" : "Closed"}
            </span>
          </p>

          <div className="form-grid">
            <button
              type="button"
              onClick={() => updateRegistrationStatus(true)}
            >
              Open Registration
            </button>

            <button
              type="button"
              onClick={() => updateRegistrationStatus(false)}
            >
              Close Registration
            </button>
          </div>
        </div>

        <div className="section-heading">
          <h2>User Management</h2>
          <p>
            Create students and faculty, filter them by department, and manage
            student semester progression.
          </p>
        </div>

        <div className="form-grid">
          <div className="card">
            <h3>Create Student</h3>

            <form onSubmit={createStudent}>
              <label>Name</label>
              <input
                value={studentForm.name}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, name: e.target.value })
                }
                required
              />

              <label>Email</label>
              <input
                type="email"
                value={studentForm.email}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, email: e.target.value })
                }
                required
              />

              <label>Password</label>
              <input
                type="password"
                value={studentForm.password}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, password: e.target.value })
                }
                required
              />

              <label>Student ID</label>
              <input
                placeholder="Example: STU101"
                value={studentForm.studentId}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, studentId: e.target.value })
                }
                required
              />

              <label>Department</label>
              <select
                value={studentForm.department}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, department: e.target.value })
                }
                required
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <label>Current Semester</label>
              <select
                value={studentForm.semester}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, semester: e.target.value })
                }
                required
              >
                <option value="">Select Semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>

              <button type="submit">Create Student</button>
            </form>
          </div>

          <div className="card">
            <h3>Create Faculty</h3>

            <form onSubmit={createFaculty}>
              <label>Name</label>
              <input
                value={facultyForm.name}
                onChange={(e) =>
                  setFacultyForm({ ...facultyForm, name: e.target.value })
                }
                required
              />

              <label>Email</label>
              <input
                type="email"
                value={facultyForm.email}
                onChange={(e) =>
                  setFacultyForm({ ...facultyForm, email: e.target.value })
                }
                required
              />

              <label>Password</label>
              <input
                type="password"
                value={facultyForm.password}
                onChange={(e) =>
                  setFacultyForm({ ...facultyForm, password: e.target.value })
                }
                required
              />

              <label>Faculty Code</label>
              <input
                placeholder="Example: FAC101"
                value={facultyForm.facultyCode}
                onChange={(e) =>
                  setFacultyForm({
                    ...facultyForm,
                    facultyCode: e.target.value
                  })
                }
                required
              />

              <label>Department</label>
              <select
                value={facultyForm.department}
                onChange={(e) =>
                  setFacultyForm({ ...facultyForm, department: e.target.value })
                }
                required
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <button type="submit">Create Faculty</button>
            </form>
          </div>
        </div>

        {editingStudentId && (
          <div className="card">
            <h3>Edit Student Details</h3>

            <form onSubmit={updateStudentDetails}>
              <div className="form-grid">
                <div>
                  <label>Name</label>
                  <input
                    value={editStudentForm.name}
                    onChange={(e) =>
                      setEditStudentForm({
                        ...editStudentForm,
                        name: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    value={editStudentForm.email}
                    onChange={(e) =>
                      setEditStudentForm({
                        ...editStudentForm,
                        email: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label>Student ID</label>
                  <input
                    value={editStudentForm.studentCode}
                    onChange={(e) =>
                      setEditStudentForm({
                        ...editStudentForm,
                        studentCode: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label>Department</label>
                  <select
                    value={editStudentForm.department}
                    onChange={(e) =>
                      setEditStudentForm({
                        ...editStudentForm,
                        department: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit">Update Student</button>
              <button type="button" onClick={cancelEditStudent}>
                Cancel
              </button>
            </form>
          </div>
        )}

        {editingFacultyId && (
          <div className="card">
            <h3>Edit Faculty Details</h3>

            <form onSubmit={updateFacultyDetails}>
              <div className="form-grid">
                <div>
                  <label>Name</label>
                  <input
                    value={editFacultyForm.name}
                    onChange={(e) =>
                      setEditFacultyForm({
                        ...editFacultyForm,
                        name: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    value={editFacultyForm.email}
                    onChange={(e) =>
                      setEditFacultyForm({
                        ...editFacultyForm,
                        email: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label>Faculty Code</label>
                  <input
                    value={editFacultyForm.facultyCode}
                    onChange={(e) =>
                      setEditFacultyForm({
                        ...editFacultyForm,
                        facultyCode: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label>Department</label>
                  <select
                    value={editFacultyForm.department}
                    onChange={(e) =>
                      setEditFacultyForm({
                        ...editFacultyForm,
                        department: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit">Update Faculty</button>
              <button type="button" onClick={cancelEditFaculty}>
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <h3>Students</h3>

          <label>Filter by</label>
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
          >
            <option value="">Select Filter</option>
            <option value="all">All Students</option>

            {departmentOptions.map((department) => (
              <option key={department} value={`department:${department}`}>
                Department: {department}
              </option>
            ))}

            {semesterOptions.map((semester) => (
              <option key={semester} value={`semester:${semester}`}>
                Semester {semester}
              </option>
            ))}
          </select>

          <label>Search by Student Name, Email, or Student ID</label>
          <input
            placeholder="Example: Derek, derek@example.com, STU101"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />

          <p>
            Showing <strong>{filteredStudents.length}</strong> of{" "}
            <strong>{adminDashboard.students.length}</strong> students.
          </p>

          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Current Semester</th>
                <th>Update Semester</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.student_id}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.department}</td>
                  <td>Semester {student.semester}</td>
                  <td>
                    <select
                      value={student.semester}
                      onChange={(e) =>
                        updateStudentSemester(student.id, e.target.value)
                      }
                    >
                      {semesterOptions.map((semester) => (
                        <option key={semester} value={semester}>
                          Semester {semester}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => startEditStudent(student)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudent(student.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7">
                    {!shouldShowStudents
                      ? "Please select a filter or search term to view students."
                      : "No matching students found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Faculty</h3>

          <label>Filter by</label>
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
          >
            <option value="">Select Filter</option>
            <option value="all">All Faculty</option>

            {departmentOptions.map((department) => (
              <option key={department} value={`department:${department}`}>
                Department: {department}
              </option>
            ))}
          </select>

          <label>Search by Faculty Name, Email, or Faculty Code</label>
          <input
            placeholder="Example: Sarah, sarah@example.com, FAC101"
            value={facultySearch}
            onChange={(e) => setFacultySearch(e.target.value)}
          />

          <p>
            Showing <strong>{filteredFaculty.length}</strong> of{" "}
            <strong>{adminDashboard.faculty.length}</strong> faculty members.
          </p>

          <table>
            <thead>
              <tr>
                <th>Faculty Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.map((faculty) => (
                <tr key={faculty.id}>
                  <td>{faculty.faculty_code}</td>
                  <td>{faculty.name}</td>
                  <td>{faculty.email}</td>
                  <td>{faculty.department}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => startEditFaculty(faculty)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFaculty(faculty.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredFaculty.length === 0 && (
                <tr>
                  <td colSpan="5">
                    {!shouldShowFaculty
                      ? "Please select a filter or search term to view faculty."
                      : "No matching faculty found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section-heading">
          <h2>Course Management</h2>
          <p>
            Add master courses to the catalog, then choose which courses are
            offered each semester.
          </p>
        </div>

        <div className="form-grid">
          <div className="card">
            <h3>Add Course to Catalog</h3>

            <form onSubmit={createCourse}>
              <label>Course Code</label>
              <input
                placeholder="Example: CIS001"
                value={courseForm.courseCode}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, courseCode: e.target.value })
                }
                required
              />

              <label>Course Name</label>
              <input
                placeholder="Example: Multimedia Systems"
                value={courseForm.courseName}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, courseName: e.target.value })
                }
                required
              />

              <label>Department</label>
              <select
                value={courseForm.department}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, department: e.target.value })
                }
                required
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <label>Credits</label>
              <input
                type="number"
                value={courseForm.credits}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, credits: e.target.value })
                }
                required
              />

              <button type="submit">Add Course</button>
            </form>
          </div>

          <div className="card">
            <h3>Create Semester Offering</h3>

            <form onSubmit={createOffering}>
              <label>Select Course</label>
              <select
                value={offeringForm.courseId}
                onChange={(e) =>
                  setOfferingForm({ ...offeringForm, courseId: e.target.value })
                }
                required
              >
                <option value="">Select Course</option>
                {adminDashboard.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name} -{" "}
                    {course.department}
                  </option>
                ))}
              </select>

              <label>Semester</label>
              <select
                value={offeringForm.semester}
                onChange={(e) =>
                  setOfferingForm({ ...offeringForm, semester: e.target.value })
                }
                required
              >
                <option value="">Select Semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>

              <label>Assign Faculty</label>
              <select
                value={offeringForm.facultyId}
                onChange={(e) =>
                  setOfferingForm({ ...offeringForm, facultyId: e.target.value })
                }
              >
                <option value="">Not Assigned</option>
                {adminDashboard.faculty.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name} - {faculty.faculty_code} -{" "}
                    {faculty.department}
                  </option>
                ))}
              </select>

              <button type="submit">Create Offering</button>
            </form>
          </div>
        </div>

        <div className="card">
          <h3>Course Catalog</h3>

          <label>Filter by</label>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="">Select Filter</option>
            <option value="all">All Courses</option>

            {departmentOptions.map((department) => (
              <option key={department} value={`department:${department}`}>
                Department: {department}
              </option>
            ))}
          </select>

          <label>Search by Course Code or Course Name</label>
          <input
            placeholder="Example: CIS101, Advanced Data Structures"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
          />

          <p>
            Showing <strong>{filteredCourses.length}</strong> of{" "}
            <strong>{adminDashboard.courses.length}</strong> courses.
          </p>

          <table>
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Department</th>
                <th>Credits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.id}>
                  <td>{course.course_code}</td>
                  <td>{course.course_name}</td>
                  <td>{course.department}</td>
                  <td>{course.credits}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => startEditCourse(course)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCourse(course.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan="5">
                    {!shouldShowCourses
                      ? "Please select a filter or search term to view courses."
                      : "No matching courses found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Semester Course Offerings</h3>

          <label>Filter by Department</label>
          <select
            value={offeringDepartmentFilter}
            onChange={(e) => setOfferingDepartmentFilter(e.target.value)}
          >
            <option value="">Select Department</option>
            <option value="all">All Departments</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Department</th>
                <th>Credits</th>
                <th>Current Faculty</th>
                <th>Change Faculty</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfferings.map((offering) => (
                <tr key={offering.id}>
                  <td>Semester {offering.semester}</td>
                  <td>{offering.course_code}</td>
                  <td>{offering.course_name}</td>
                  <td>{offering.department}</td>
                  <td>{offering.credits}</td>
                  <td>{offering.faculty_name || "Not Assigned"}</td>
                  <td>
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        updateOfferingFaculty(offering.id, e.target.value)
                      }
                    >
                      <option value="">Select Faculty</option>
                      <option value="">Remove Faculty</option>
                      {adminDashboard.faculty
                        .filter(
                          (faculty) => faculty.department === offering.department
                        )
                        .map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name} - {faculty.faculty_code}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}

              {filteredOfferings.length === 0 && (
                <tr>
                  <td colSpan="7">
                    {offeringDepartmentFilter === ""
                      ? "Please select a department to view semester offerings."
                      : "No semester offerings found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section-heading">
          <h2>Student Course Registrations</h2>
          <p>
            Track which students registered for which semester course offerings.
          </p>
        </div>

        <div className="card">
          <h3>Registration Records</h3>

          <label>Filter by</label>
          <select
            value={registrationFilter}
            onChange={(e) => setRegistrationFilter(e.target.value)}
          >
            <option value="">Select Filter</option>
            <option value="all">All Registration Records</option>

            {departmentOptions.map((department) => (
              <option key={department} value={`department:${department}`}>
                Department: {department}
              </option>
            ))}

            {semesterOptions.map((semester) => (
              <option key={semester} value={`semester:${semester}`}>
                Semester {semester}
              </option>
            ))}
          </select>

          <label>Search by Student, ID, Course Code, or Course Name</label>
          <input
            placeholder="Example: Scott, STU101, CIS-001, Computer Security"
            value={registrationSearch}
            onChange={(e) => setRegistrationSearch(e.target.value)}
          />

          <p>
            Showing <strong>{filteredRegistrations.length}</strong> of{" "}
            <strong>{adminDashboard.enrollments.length}</strong> registration
            records.
          </p>

          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Semester</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>{enrollment.student_id}</td>
                  <td>{enrollment.student_name}</td>
                  <td>Semester {enrollment.semester}</td>
                  <td>{enrollment.course_code}</td>
                  <td>{enrollment.course_name}</td>
                  <td>{enrollment.department}</td>
                  <td>{enrollment.status}</td>
                </tr>
              ))}

              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan="7">
                    {!shouldShowRegistrations
                      ? "Please select a filter or search term to view registration records."
                      : "No matching registration records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingCourseId && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Edit Course Details</h3>

              <form onSubmit={updateCourseDetails}>
                <label>Course Code</label>
                <input
                  value={editCourseForm.courseCode}
                  onChange={(e) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      courseCode: e.target.value
                    })
                  }
                  required
                />

                <label>Course Name</label>
                <input
                  value={editCourseForm.courseName}
                  onChange={(e) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      courseName: e.target.value
                    })
                  }
                  required
                />

                <label>Department</label>
                <select
                  value={editCourseForm.department}
                  onChange={(e) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      department: e.target.value
                    })
                  }
                  required
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>

                <label>Credits</label>
                <input
                  type="number"
                  value={editCourseForm.credits}
                  onChange={(e) =>
                    setEditCourseForm({
                      ...editCourseForm,
                      credits: e.target.value
                    })
                  }
                  required
                />

                <div className="modal-actions">
                  <button type="submit">Update Course</button>
                  <button type="button" onClick={cancelEditCourse}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

  if (user.role === "faculty") {
    if (!facultyDashboard) {
      return <p>Loading faculty dashboard...</p>;
    }

    return (
      <div className="dashboard-page faculty-dashboard-bg">
        <div className="container">
        <div className="header">
          <div>
            <h2>Faculty Dashboard</h2>
            <p>
              {facultyDashboard.faculty.name} •{" "}
              {facultyDashboard.faculty.faculty_code}
            </p>
          </div>

          <button onClick={logout}>Logout</button>
        </div>

        {message && <p className="success-message">{message}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="card">
          <h3>Faculty Profile</h3>
          <p>
            <strong>Name:</strong> {facultyDashboard.faculty.name}
          </p>
          <p>
            <strong>Email:</strong> {facultyDashboard.faculty.email}
          </p>
          <p>
            <strong>Department:</strong> {facultyDashboard.faculty.department}
          </p>
          <p>
            <strong>Faculty Code:</strong>{" "}
            {facultyDashboard.faculty.faculty_code}
          </p>
        </div>

        <div className="card">
          <h3>Assigned Course Offerings</h3>

          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Department</th>
                <th>Credits</th>
              </tr>
            </thead>
            <tbody>
              {facultyDashboard.assignedCourses.map((course) => (
                <tr key={course.offering_id}>
                  <td>Semester {course.semester}</td>
                  <td>{course.course_code}</td>
                  <td>{course.course_name}</td>
                  <td>{course.department}</td>
                  <td>{course.credits}</td>
                </tr>
              ))}

              {facultyDashboard.assignedCourses.length === 0 && (
                <tr>
                  <td colSpan="5">No assigned course offerings yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Enrolled Students</h3>

          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Semester</th>
                <th>Course</th>
                <th>Department</th>
                <th>Total Marks</th>
                <th>Grade</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {facultyDashboard.enrolledStudents.map((record) => (
                <tr key={record.enrollment_id}>
                  <td>{record.student_id}</td>
                  <td>{record.student_name}</td>
                  <td>Semester {record.semester}</td>
                  <td>{record.course_name}</td>
                  <td>{record.department}</td>
                  <td>{record.total_marks}</td>
                  <td>{record.grade}</td>
                  <td>{record.attendance_percentage}%</td>
                </tr>
              ))}

              {facultyDashboard.enrolledStudents.length === 0 && (
                <tr>
                  <td colSpan="8">No enrolled students yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="form-grid">
          <div className="card">
            <h3>Marks Entry</h3>

            <form onSubmit={updateMarks}>
              <label>Select Student and Course</label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleRecordSelection(e.target.value)}
                required
              >
                <option value="">Select</option>
                {facultyDashboard.enrolledStudents.map((record) => (
                  <option key={record.enrollment_id} value={record.enrollment_id}>
                    {record.student_name} - {record.course_name} - Semester{" "}
                    {record.semester}
                  </option>
                ))}
              </select>

              <label>Assignment Marks</label>
              <input
                type="number"
                value={marksForm.assignmentMarks}
                onChange={(e) =>
                  setMarksForm({ ...marksForm, assignmentMarks: e.target.value })
                }
                required
              />

              <label>Quiz Marks</label>
              <input
                type="number"
                value={marksForm.quizMarks}
                onChange={(e) =>
                  setMarksForm({ ...marksForm, quizMarks: e.target.value })
                }
                required
              />

              <label>Project Marks</label>
              <input
                type="number"
                value={marksForm.projectMarks}
                onChange={(e) =>
                  setMarksForm({ ...marksForm, projectMarks: e.target.value })
                }
                required
              />

              <label>Final Exam Marks</label>
              <input
                type="number"
                value={marksForm.finalExamMarks}
                onChange={(e) =>
                  setMarksForm({ ...marksForm, finalExamMarks: e.target.value })
                }
                required
              />

              <button type="submit">Update Marks</button>
            </form>
          </div>

          <div className="card">
            <h3>Attendance Update</h3>

            <form onSubmit={updateAttendance}>
              <label>Select Student and Course</label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleRecordSelection(e.target.value)}
                required
              >
                <option value="">Select</option>
                {facultyDashboard.enrolledStudents.map((record) => (
                  <option key={record.enrollment_id} value={record.enrollment_id}>
                    {record.student_name} - {record.course_name} - Semester{" "}
                    {record.semester}
                  </option>
                ))}
              </select>

              <label>Classes Conducted</label>
              <input
                type="number"
                value={attendanceForm.classesConducted}
                onChange={(e) =>
                  setAttendanceForm({
                    ...attendanceForm,
                    classesConducted: e.target.value
                  })
                }
                required
              />

              <label>Classes Attended</label>
              <input
                type="number"
                value={attendanceForm.classesAttended}
                onChange={(e) =>
                  setAttendanceForm({
                    ...attendanceForm,
                    classesAttended: e.target.value
                  })
                }
                required
              />

              <button type="submit">Update Attendance</button>
            </form>
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (!dashboard) {
    return <p>Loading dashboard...</p>;
  }

  const selectedSemesterRecords = getRecordsForSemester(
    selectedRegistrationSemester || dashboard.student.semester
  );

  const registeredCountForSelectedSemester = selectedSemesterRecords.length;

  return (
    <div className="dashboard-page student-dashboard-bg">
      <div className="container">
      <div className="header">
        <div>
          <h2>Student Dashboard</h2>
          <p>
            {dashboard.student.name} • {dashboard.student.student_id}
          </p>
        </div>

        <div className="header-actions">
          <button onClick={downloadTranscript}>Download Transcript</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {message && <p className="success-message">{message}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="grid">
        <div className="card profile-card">
          <h3>Student Profile</h3>
          <p>
            <strong>Name:</strong> {dashboard.student.name}
          </p>
          <p>
            <strong>Email:</strong> {dashboard.student.email}
          </p>
          <p>
            <strong>Department:</strong> {dashboard.student.department}
          </p>
          <p>
            <strong>Current Semester:</strong> Semester{" "}
            {dashboard.student.semester}
          </p>
        </div>

        <div className="card metric">
          <h3>Selected Semester GPA</h3>
          <p>{calculateSemesterGpa(selectedSemesterRecords)}</p>
        </div>

        <div className="card metric">
          <h3>Overall CGPA</h3>
          <p>{dashboard.summary.overallCgpa}</p>
        </div>

        <div className="card metric">
          <h3>Total Credits</h3>
          <p>{dashboard.summary.totalCredits}</p>
        </div>
      </div>

      <div className="card">
        <h3>Course Registration</h3>

        <p>
          Registration status:{" "}
          <strong>{registrationOpen ? "Open" : "Closed"}</strong>
        </p>

        {!registrationOpen && (
          <p>
            Registration is currently closed. You can view your existing semester
            records below.
          </p>
        )}

        <div className="form-grid">
          <div>
            <label>Select Department</label>
            <select
              value={selectedRegistrationDepartment}
              onChange={(e) =>
                handleRegistrationFilterChange(
                  e.target.value,
                  selectedRegistrationSemester
                )
              }
            >
              <option value="">Select Department</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Select Semester</label>
            <select
              value={selectedRegistrationSemester}
              onChange={(e) =>
                handleRegistrationFilterChange(
                  selectedRegistrationDepartment,
                  e.target.value
                )
              }
            >
              <option value="">Select Semester</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p>
          You can register for a maximum of 3 courses in your current semester.
          At least 2 courses must be from your registered department, and 1
          course may be from the same or another department.
        </p>

        <p>
          Currently registered for selected semester:{" "}
          {registeredCountForSelectedSemester}/3
        </p>

        <table>
          <thead>
            <tr>
              <th>Semester</th>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Department</th>
              <th>Credits</th>
              <th>Faculty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {offeredCourses.length === 0 ? (
              <tr>
                <td colSpan="7">No offered courses found.</td>
              </tr>
            ) : (
              offeredCourses.map((course) => (
                <tr key={course.offering_id}>
                  <td>Semester {course.semester}</td>
                  <td>{course.course_code}</td>
                  <td>{course.course_name}</td>
                  <td>{course.department}</td>
                  <td>{course.credits}</td>
                  <td>{course.faculty_name || "Not Assigned"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => registerForCourse(course.offering_id)}
                      disabled={!registrationOpen}
                    >
                      Register
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Registered Courses - Semester {selectedRegistrationSemester}</h3>

        <table>
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Department</th>
              <th>Credits</th>
              <th>Faculty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {selectedSemesterRecords.map((course) => (
              <tr key={course.offering_id}>
                <td>{course.course_code}</td>
                <td>{course.course_name}</td>
                <td>{course.department}</td>
                <td>{course.credits}</td>
                <td>{course.faculty_name || "Not Assigned"}</td>
                <td>{course.status}</td>
              </tr>
            ))}

            {selectedSemesterRecords.length === 0 && (
              <tr>
                <td colSpan="6">No registered courses for this semester.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Marks and Grades - Semester {selectedRegistrationSemester}</h3>

        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Assignments</th>
              <th>Quizzes</th>
              <th>Project</th>
              <th>Final Exam</th>
              <th>Total / 100</th>
              <th>Grade</th>
              <th>Grade Points</th>
            </tr>
          </thead>
          <tbody>
            {selectedSemesterRecords.map((course) => (
              <tr key={course.offering_id}>
                <td>{course.course_name}</td>
                <td>{course.assignment_marks}</td>
                <td>{course.quiz_marks}</td>
                <td>{course.project_marks}</td>
                <td>{course.final_exam_marks}</td>
                <td>{course.total_marks}</td>
                <td>{course.grade}</td>
                <td>{course.grade_points}</td>
              </tr>
            ))}

            {selectedSemesterRecords.length === 0 && (
              <tr>
                <td colSpan="8">No marks available for this semester.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Attendance - Semester {selectedRegistrationSemester}</h3>

        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Classes Conducted</th>
              <th>Classes Attended</th>
              <th>Classes Missed</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {selectedSemesterRecords.map((course) => (
              <tr key={course.offering_id}>
                <td>{course.course_name}</td>
                <td>{course.classes_conducted}</td>
                <td>{course.classes_attended}</td>
                <td>{course.classes_missed}</td>
                <td>{course.attendance_percentage}%</td>
              </tr>
            ))}

            {selectedSemesterRecords.length === 0 && (
              <tr>
                <td colSpan="5">No attendance records for this semester.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
export default App;