const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { initDb, get, all, run } = require("./database");

const app = express();
const PORT = 5050;
const JWT_SECRET = "student_information_system_secret_key";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Student Academic Information System API is running");
});

// Login API
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

// Admin Dashboard API
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const registrationSetting = await get(
      "SELECT setting_value FROM settings WHERE setting_key = ?",
      ["registration_open"]
    );

    const students = await all(
      `SELECT 
        s.id,
        s.student_id,
        s.department,
        s.semester,
        u.name,
        u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.semester, s.department, u.name`
    );

    const faculty = await all(
      `SELECT 
        f.id,
        f.faculty_code,
        f.department,
        u.name,
        u.email
       FROM faculty f
       JOIN users u ON f.user_id = u.id
       ORDER BY f.department, u.name`
    );

    const courses = await all(
      `SELECT 
        id,
        course_code,
        course_name,
        department,
        credits
       FROM courses
       ORDER BY department, course_code`
    );

    const offerings = await all(
      `SELECT 
        co.id,
        co.semester,
        co.department,
        co.is_offered,
        c.course_code,
        c.course_name,
        c.credits,
        f.faculty_code,
        u.name AS faculty_name
       FROM course_offerings co
       JOIN courses c ON co.course_id = c.id
       LEFT JOIN faculty f ON co.faculty_id = f.id
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY co.semester, c.department, c.course_code`
    );

    const enrollments = await all(
      `SELECT 
        e.id,
        e.status,
        s.student_id,
        su.name AS student_name,
        co.semester,
        c.course_code,
        c.course_name,
        COALESCE(e.course_department, c.department) AS department
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN users su ON s.user_id = su.id
       JOIN course_offerings co ON e.offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       ORDER BY co.semester, COALESCE(e.course_department, c.department), su.name`
    );

    res.json({
      registrationOpen: registrationSetting?.setting_value === "true",
      students,
      faculty,
      courses,
      offerings,
      enrollments
    });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);

    res.status(500).json({
    message: "Failed to load admin dashboard",
    error: error.message
    });
  }
});

// Admin Create Student API
app.post("/api/admin/create-student", async (req, res) => {
  try {
    const { name, email, password, studentId, department, semester } = req.body;

    const existingUser = await get("SELECT id FROM users WHERE email = ?", [
      email
    ]);

    if (existingUser) {
      return res.status(400).json({
        message: "This email is already used by another user"
      });
    }

    const existingStudent = await get(
      "SELECT id FROM students WHERE student_id = ?",
      [studentId]
    );

    if (existingStudent) {
      return res.status(400).json({
        message: "This student ID already exists"
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const userResult = await run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "student"]
    );

    await run(
      "INSERT INTO students (user_id, student_id, department, semester) VALUES (?, ?, ?, ?)",
      [userResult.lastID, studentId, department, semester]
    );

    res.json({ message: "Student created successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create student",
      error: error.message
    });
  }
});

// Admin Create Faculty API
app.post("/api/admin/create-faculty", async (req, res) => {
  try {
    const { name, email, password, facultyCode, department } = req.body;

    const existingUser = await get("SELECT id FROM users WHERE email = ?", [
      email
    ]);

    if (existingUser) {
      return res.status(400).json({
        message: "This email is already used by another user"
      });
    }

    const existingFaculty = await get(
      "SELECT id FROM faculty WHERE faculty_code = ?",
      [facultyCode]
    );

    if (existingFaculty) {
      return res.status(400).json({
        message: "This faculty code already exists"
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const userResult = await run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "faculty"]
    );

    await run(
      "INSERT INTO faculty (user_id, faculty_code, department) VALUES (?, ?, ?)",
      [userResult.lastID, facultyCode, department]
    );

    res.json({ message: "Faculty created successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create faculty",
      error: error.message
    });
  }
});

// Admin Create Course Catalog API
app.post("/api/admin/create-course", async (req, res) => {
  try {
    const { courseCode, courseName, department, credits } = req.body;

    const existingCourse = await get(
      "SELECT id FROM courses WHERE course_code = ?",
      [courseCode]
    );

    if (existingCourse) {
      return res.status(400).json({
        message: "This course code already exists"
      });
    }

    await run(
      `INSERT INTO courses 
       (course_code, course_name, department, credits)
       VALUES (?, ?, ?, ?)`,
      [courseCode, courseName, department, credits]
    );

    res.json({ message: "Course added to catalog successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create course",
      error: error.message
    });
  }
});

// Admin Update Course API
app.put("/api/admin/update-course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const { courseCode, courseName, department, credits } = req.body;

    const course = await get("SELECT id FROM courses WHERE id = ?", [courseId]);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const existingCourse = await get(
      "SELECT id FROM courses WHERE course_code = ? AND id != ?",
      [courseCode, courseId]
    );

    if (existingCourse) {
      return res.status(400).json({
        message: "This course code already exists"
      });
    }

    await run(
      `UPDATE courses
       SET course_code = ?,
           course_name = ?,
           department = ?,
           credits = ?
       WHERE id = ?`,
      [courseCode, courseName, department, credits, courseId]
    );

    await run(
      "UPDATE course_offerings SET department = ? WHERE course_id = ?",
      [department, courseId]
    );

    await run(
      `UPDATE course_offerings
       SET faculty_id = NULL
       WHERE course_id = ?
       AND faculty_id IS NOT NULL
       AND faculty_id NOT IN (
         SELECT id FROM faculty WHERE department = ?
       )`,
      [courseId, department]
    );

    res.json({ message: "Course details updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update course details",
      error: error.message
    });
  }
});

// Admin Create Course Offering API
app.post("/api/admin/create-offering", async (req, res) => {
  try {
    const { courseId, semester, facultyId } = req.body;

    const course = await get("SELECT * FROM courses WHERE id = ?", [courseId]);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (facultyId) {
      const faculty = await get("SELECT * FROM faculty WHERE id = ?", [
        facultyId
      ]);

      if (!faculty) {
        return res.status(404).json({ message: "Faculty not found" });
      }

      if (faculty.department !== course.department) {
        return res.status(400).json({
          message:
            "Faculty can only be assigned to courses in their own department"
        });
      }
    }

    const existingOffering = await get(
      `SELECT * FROM course_offerings 
       WHERE course_id = ? AND semester = ?`,
      [courseId, semester]
    );

    if (existingOffering) {
      return res.status(400).json({
        message: "This course is already offered for this semester"
      });
    }

    await run(
      `INSERT INTO course_offerings
       (course_id, department, semester, faculty_id, is_offered)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, course.department, semester, facultyId || null, 1]
    );

    res.json({ message: "Course offering created successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create course offering",
      error: error.message
    });
  }
});

// Admin Update Faculty for Course Offering API
app.put("/api/admin/update-offering-faculty", async (req, res) => {
  try {
    const { offeringId, facultyId } = req.body;

    const offering = await get(
      `SELECT 
        co.id,
        co.course_id,
        c.department AS course_department
       FROM course_offerings co
       JOIN courses c ON co.course_id = c.id
       WHERE co.id = ?`,
      [offeringId]
    );

    if (!offering) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    if (!facultyId) {
      await run("UPDATE course_offerings SET faculty_id = NULL WHERE id = ?", [
        offeringId
      ]);

      return res.json({ message: "Faculty removed from course offering" });
    }

    const faculty = await get("SELECT * FROM faculty WHERE id = ?", [facultyId]);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (faculty.department !== offering.course_department) {
      return res.status(400).json({
        message:
          "Faculty can only be assigned to courses in their own department"
      });
    }

    await run("UPDATE course_offerings SET faculty_id = ? WHERE id = ?", [
      facultyId,
      offeringId
    ]);

    res.json({ message: "Faculty updated for course offering successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update course offering faculty",
      error: error.message
    });
  }
});

// Admin Registration Open/Close API
app.put("/api/admin/registration-status", async (req, res) => {
  try {
    const { registrationOpen } = req.body;

    await run(
      "UPDATE settings SET setting_value = ? WHERE setting_key = ?",
      [registrationOpen ? "true" : "false", "registration_open"]
    );

    res.json({
      message: registrationOpen
        ? "Registration opened successfully"
        : "Registration closed successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update registration status",
      error: error.message
    });
  }
});

app.put("/api/admin/update-student-semester", async (req, res) => {
  try {
    const { studentId, semester } = req.body;

    if (!studentId || !semester) {
      return res.status(400).json({
        message: "Student ID and semester are required"
      });
    }

    const newSemester = Number(semester);

    if (Number.isNaN(newSemester) || newSemester < 1 || newSemester > 8) {
      return res.status(400).json({
        message: "Invalid semester selected"
      });
    }

    const student = await get(
      "SELECT id, semester FROM students WHERE id = ?",
      [studentId]
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    const currentSemester = Number(student.semester);

    if (newSemester <= currentSemester) {
      await run("UPDATE students SET semester = ? WHERE id = ?", [
        newSemester,
        studentId
      ]);

      return res.json({
        message: "Student semester updated successfully"
      });
    }
    const requiredCourses = (newSemester - 1) * 3;

    const result = await get(
      `
      SELECT COUNT(*) AS completedCourseCount
      FROM enrollments
      WHERE student_id = ?
      `,
      [studentId]
    );

    const completedCourseCount = result.completedCourseCount || 0;

    if (completedCourseCount < requiredCourses) {
      return res.status(400).json({
        message: `Student is not eligible to move to Semester ${newSemester}. Required completed courses: ${requiredCourses}. Current completed courses: ${completedCourseCount}.`
      });
    }

    await run("UPDATE students SET semester = ? WHERE id = ?", [
      newSemester,
      studentId
    ]);

    res.json({
      message: "Student semester updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update student semester",
      error: error.message
    });
  }
});

// Admin Update Student Details API
app.put("/api/admin/update-student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, email, studentCode, department } = req.body;

    const student = await get("SELECT user_id FROM students WHERE id = ?", [
      studentId
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const existingUser = await get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, student.user_id]
    );

    if (existingUser) {
      return res.status(400).json({
        message: "This email is already used by another user"
      });
    }

    const existingStudent = await get(
      "SELECT id FROM students WHERE student_id = ? AND id != ?",
      [studentCode, studentId]
    );

    if (existingStudent) {
      return res.status(400).json({
        message: "This student ID already exists"
      });
    }

    await run("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name,
      email,
      student.user_id
    ]);

    await run(
      "UPDATE students SET student_id = ?, department = ? WHERE id = ?",
      [studentCode, department, studentId]
    );

    res.json({ message: "Student details updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update student details",
      error: error.message
    });
  }
});

// Admin Update Faculty Details API
app.put("/api/admin/update-faculty/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { name, email, facultyCode, department } = req.body;

    const faculty = await get("SELECT user_id FROM faculty WHERE id = ?", [
      facultyId
    ]);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const existingUser = await get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, faculty.user_id]
    );

    if (existingUser) {
      return res.status(400).json({
        message: "This email is already used by another user"
      });
    }

    const existingFaculty = await get(
      "SELECT id FROM faculty WHERE faculty_code = ? AND id != ?",
      [facultyCode, facultyId]
    );

    if (existingFaculty) {
      return res.status(400).json({
        message: "This faculty code already exists"
      });
    }

    await run("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name,
      email,
      faculty.user_id
    ]);

    await run(
      "UPDATE faculty SET faculty_code = ?, department = ? WHERE id = ?",
      [facultyCode, department, facultyId]
    );

    res.json({ message: "Faculty details updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update faculty details",
      error: error.message
    });
  }
});

// Admin Delete Student API
app.delete("/api/admin/delete-student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await get("SELECT user_id FROM students WHERE id = ?", [
      studentId
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await run("DELETE FROM marks WHERE student_id = ?", [studentId]);
    await run("DELETE FROM attendance WHERE student_id = ?", [studentId]);
    await run("DELETE FROM enrollments WHERE student_id = ?", [studentId]);
    await run("DELETE FROM students WHERE id = ?", [studentId]);
    await run("DELETE FROM users WHERE id = ?", [student.user_id]);

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete student",
      error: error.message
    });
  }
});

// Admin Delete Faculty API
app.delete("/api/admin/delete-faculty/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;

    const faculty = await get("SELECT user_id FROM faculty WHERE id = ?", [
      facultyId
    ]);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    await run(
      "UPDATE course_offerings SET faculty_id = NULL WHERE faculty_id = ?",
      [facultyId]
    );

    await run("DELETE FROM faculty WHERE id = ?", [facultyId]);
    await run("DELETE FROM users WHERE id = ?", [faculty.user_id]);

    res.json({ message: "Faculty deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete faculty",
      error: error.message
    });
  }
});

// Admin Delete Course API
app.delete("/api/admin/delete-course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await get("SELECT id FROM courses WHERE id = ?", [courseId]);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const offerings = await all(
      "SELECT id FROM course_offerings WHERE course_id = ?",
      [courseId]
    );

    for (const offering of offerings) {
      await run("DELETE FROM marks WHERE offering_id = ?", [offering.id]);
      await run("DELETE FROM attendance WHERE offering_id = ?", [offering.id]);
      await run("DELETE FROM enrollments WHERE offering_id = ?", [offering.id]);
    }

    await run("DELETE FROM course_offerings WHERE course_id = ?", [courseId]);
    await run("DELETE FROM courses WHERE id = ?", [courseId]);

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete course",
      error: error.message
    });
  }
});

// Student Dashboard API
app.get("/api/student/dashboard/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const student = await get(
      `SELECT 
        s.id,
        s.student_id,
        s.department,
        s.semester,
        u.name,
        u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const records = await all(
      `SELECT 
        co.id AS offering_id,
        co.semester,
        c.course_code,
        c.course_name,
        COALESCE(e.course_department, c.department) AS department,
        c.credits,
        e.status,
        COALESCE(e.faculty_name, fu.name, 'Not Assigned') AS faculty_name,
        m.assignment_marks,
        m.quiz_marks,
        m.project_marks,
        m.final_exam_marks,
        m.total_marks,
        m.grade,
        m.grade_points,
        a.classes_conducted,
        a.classes_attended,
        a.classes_missed,
        a.attendance_percentage
       FROM enrollments e
       JOIN course_offerings co ON e.offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       LEFT JOIN faculty f ON co.faculty_id = f.id
       LEFT JOIN users fu ON f.user_id = fu.id
       LEFT JOIN marks m ON m.student_id = e.student_id AND m.offering_id = e.offering_id
       LEFT JOIN attendance a ON a.student_id = e.student_id AND a.offering_id = e.offering_id
       WHERE e.student_id = ?
       ORDER BY co.semester, c.course_code`,
      [student.id]
    );

    const totalCredits = records.reduce((sum, course) => {
      return sum + Number(course.credits || 0);
    }, 0);

    const weightedGradePoints = records.reduce((sum, course) => {
      return sum + Number(course.grade_points || 0) * Number(course.credits || 0);
    }, 0);

    const overallCgpa =
      totalCredits > 0
        ? Number((weightedGradePoints / totalCredits).toFixed(2))
        : 0;

    res.json({
      student,
      records,
      summary: {
        totalRegisteredCourses: records.length,
        totalCredits,
        overallCgpa
      }
    });
  } catch (error) {
    console.error("Student dashboard error:", error.message);

  res.status(500).json({
    message: "Failed to load student dashboard",
    error: error.message
    });
  }
});

// Student Offered Courses API
app.get("/api/student/offered-courses/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { department, semester } = req.query;

    const registrationSetting = await get(
      "SELECT setting_value FROM settings WHERE setting_key = ?",
      ["registration_open"]
    );

    const student = await get(
      `SELECT id, semester, department FROM students WHERE user_id = ?`,
      [userId]
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const targetSemester = semester || student.semester;

    const offeredCourses = await all(
      `SELECT 
        co.id AS offering_id,
        co.semester,
        c.course_code,
        c.course_name,
        c.department,
        c.credits,
        u.name AS faculty_name
       FROM course_offerings co
       JOIN courses c ON co.course_id = c.id
       LEFT JOIN faculty f ON co.faculty_id = f.id
       LEFT JOIN users u ON f.user_id = u.id
       WHERE co.semester = ?
       AND co.is_offered = 1
       AND co.course_id NOT IN (
         SELECT previous_co.course_id
         FROM enrollments e
         JOIN course_offerings previous_co ON e.offering_id = previous_co.id
         WHERE e.student_id = ?
       )
       AND (? = '' OR c.department = ?)
       ORDER BY c.department, c.course_code`,
      [targetSemester, student.id, department || "", department || ""]
    );

    res.json({
      registrationOpen: registrationSetting?.setting_value === "true",
      studentDepartment: student.department,
      currentSemester: student.semester,
      selectedDepartment: department || "",
      selectedSemester: Number(targetSemester),
      offeredCourses
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load offered courses",
      error: error.message
    });
  }
});

// Student Register Course Offering API
app.post("/api/student/register-course", async (req, res) => {
  try {
    const { userId, offeringId } = req.body;

    const registrationSetting = await get(
      "SELECT setting_value FROM settings WHERE setting_key = ?",
      ["registration_open"]
    );

    if (registrationSetting?.setting_value !== "true") {
      return res.status(400).json({ message: "Registration is closed" });
    }

    const student = await get(
      `SELECT id, semester, department FROM students WHERE user_id = ?`,
      [userId]
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

   const offering = await get(
  `SELECT
    co.id,
    co.course_id,
    co.semester,
    c.department,
    fu.name AS faculty_name
  FROM course_offerings co
  JOIN courses c ON co.course_id = c.id
  LEFT JOIN faculty f ON co.faculty_id = f.id
  LEFT JOIN users fu ON f.user_id = fu.id
  WHERE co.id = ?`,
  [offeringId]
);

    if (!offering) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    if (Number(offering.semester) !== Number(student.semester)) {
      return res.status(400).json({
        message: "You can only register for courses in your current semester"
      });
    }

    const existingEnrollment = await get(
      `SELECT * FROM enrollments WHERE student_id = ? AND offering_id = ?`,
      [student.id, offeringId]
    );

    if (existingEnrollment) {
      return res.status(400).json({
        message: "You are already registered for this course"
      });
    }

    const previousCourseEnrollment = await get(
      `SELECT e.id
       FROM enrollments e
       JOIN course_offerings co ON e.offering_id = co.id
       WHERE e.student_id = ? AND co.course_id = ?`,
      [student.id, offering.course_id]
    );

    if (previousCourseEnrollment) {
      return res.status(400).json({
        message:
          "You have already registered for this course in a previous or current semester"
      });
    }

    const registeredCourses = await all(
      `SELECT 
        c.department
       FROM enrollments e
       JOIN course_offerings co ON e.offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       WHERE e.student_id = ? AND co.semester = ?`,
      [student.id, student.semester]
    );

    const totalRegistered = registeredCourses.length;

    if (totalRegistered >= 3) {
      return res.status(400).json({
        message: "You can register for a maximum of 3 courses per semester"
      });
    }

    const ownDepartmentCount = registeredCourses.filter(
      (course) => course.department === student.department
    ).length;

    const outsideDepartmentCount = registeredCourses.filter(
      (course) => course.department !== student.department
    ).length;

    const isOwnDepartmentCourse = offering.department === student.department;

    if (!isOwnDepartmentCourse && outsideDepartmentCount >= 1) {
      return res.status(400).json({
        message:
          "You can register for only 1 out-of-department course per semester"
      });
    }

    if (
      totalRegistered === 2 &&
      ownDepartmentCount < 2 &&
      !isOwnDepartmentCourse
    ) {
      return res.status(400).json({
        message: "At least 2 courses must be from your own department"
      });
    }
await run(
  `
  INSERT INTO enrollments
  (student_id, offering_id, status, course_department, faculty_name)
  VALUES (?, ?, ?, ?, ?)
  `,
  [
    student.id,
    offeringId,
    "Registered",
    offering.department,
    offering.faculty_name || "Not Assigned"
  ]
);
    await run(
      `INSERT INTO marks
       (student_id, offering_id, assignment_marks, quiz_marks, project_marks, final_exam_marks, total_marks, grade, grade_points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student.id, offeringId, 0, 0, 0, 0, 0, "N/A", 0]
    );

    await run(
      `INSERT INTO attendance
       (student_id, offering_id, classes_conducted, classes_attended, classes_missed, attendance_percentage)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student.id, offeringId, 0, 0, 0, 0]
    );

    res.json({ message: "Course registered successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to register course",
      error: error.message
    });
  }
});

// Faculty Dashboard API
app.get("/api/faculty/dashboard/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const faculty = await get(
      `SELECT 
        f.id,
        f.faculty_code,
        f.department,
        u.name,
        u.email
       FROM faculty f
       JOIN users u ON f.user_id = u.id
       WHERE f.user_id = ?`,
      [userId]
    );

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const assignedCourses = await all(
      `SELECT 
        co.id AS offering_id,
        co.semester,
        c.course_code,
        c.course_name,
        c.department,
        c.credits
       FROM course_offerings co
       JOIN courses c ON co.course_id = c.id
       WHERE co.faculty_id = ?
       ORDER BY co.semester, c.course_code`,
      [faculty.id]
    );

    const enrolledStudents = await all(
      `SELECT
        e.id AS enrollment_id,
        s.id AS student_table_id,
        s.student_id,
        u.name AS student_name,
        co.id AS offering_id,
        co.semester,
        c.course_code,
        c.course_name,
        c.department,
        m.assignment_marks,
        m.quiz_marks,
        m.project_marks,
        m.final_exam_marks,
        m.total_marks,
        m.grade,
        m.grade_points,
        a.classes_conducted,
        a.classes_attended,
        a.classes_missed,
        a.attendance_percentage
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN course_offerings co ON e.offering_id = co.id
       JOIN courses c ON co.course_id = c.id
       LEFT JOIN marks m ON m.student_id = s.id AND m.offering_id = co.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.offering_id = co.id
       WHERE co.faculty_id = ?
       ORDER BY co.semester, c.course_code, u.name`,
      [faculty.id]
    );

    res.json({
      faculty,
      assignedCourses,
      enrolledStudents
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load faculty dashboard",
      error: error.message
    });
  }
});

// Faculty Marks Update API
app.put("/api/faculty/marks", async (req, res) => {
  try {
    const {
      studentId,
      offeringId,
      assignmentMarks,
      quizMarks,
      projectMarks,
      finalExamMarks
    } = req.body;

    const totalMarks =
      Number(assignmentMarks) +
      Number(quizMarks) +
      Number(projectMarks) +
      Number(finalExamMarks);

    let grade = "F";
    let gradePoints = 0;

    if (totalMarks >= 90) {
      grade = "A";
      gradePoints = 4;
    } else if (totalMarks >= 80) {
      grade = "B";
      gradePoints = 3;
    } else if (totalMarks >= 70) {
      grade = "C";
      gradePoints = 2;
    } else if (totalMarks >= 60) {
      grade = "D";
      gradePoints = 1;
    }

    await run(
      `UPDATE marks
       SET assignment_marks = ?,
           quiz_marks = ?,
           project_marks = ?,
           final_exam_marks = ?,
           total_marks = ?,
           grade = ?,
           grade_points = ?
       WHERE student_id = ? AND offering_id = ?`,
      [
        assignmentMarks,
        quizMarks,
        projectMarks,
        finalExamMarks,
        totalMarks,
        grade,
        gradePoints,
        studentId,
        offeringId
      ]
    );

    res.json({ message: "Marks updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update marks",
      error: error.message
    });
  }
});

// Faculty Attendance Update API
app.put("/api/faculty/attendance", async (req, res) => {
  try {
    const { studentId, offeringId, classesConducted, classesAttended } =
      req.body;

    const classesMissed = Number(classesConducted) - Number(classesAttended);

    const attendancePercentage =
      Number(classesConducted) > 0
        ? Number(
            ((Number(classesAttended) / Number(classesConducted)) * 100).toFixed(
              2
            )
          )
        : 0;

    await run(
      `UPDATE attendance
       SET classes_conducted = ?,
           classes_attended = ?,
           classes_missed = ?,
           attendance_percentage = ?
       WHERE student_id = ? AND offering_id = ?`,
      [
        classesConducted,
        classesAttended,
        classesMissed,
        attendancePercentage,
        studentId,
        offeringId
      ]
    );

    res.json({ message: "Attendance updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update attendance",
      error: error.message
    });
  }
});

initDb().then(async () => {
  await run("ALTER TABLE enrollments ADD COLUMN course_department TEXT").catch((err) => {
    if (!err.message.includes("duplicate column name")) {
      console.error("Failed to add course_department column:", err.message);
    }
  });

  await run("ALTER TABLE enrollments ADD COLUMN faculty_name TEXT").catch((err) => {
    if (!err.message.includes("duplicate column name")) {
      console.error("Failed to add faculty_name column:", err.message);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});