const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "academic.db");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (error, row) {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (error, rows) {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      student_id TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      faculty_code TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT NOT NULL UNIQUE,
      course_name TEXT NOT NULL,
      department TEXT NOT NULL,
      credits INTEGER NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS course_offerings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      faculty_id INTEGER,
      is_offered INTEGER DEFAULT 1,
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(faculty_id) REFERENCES faculty(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      offering_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Registered',
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(offering_id) REFERENCES course_offerings(id),
      UNIQUE(student_id, offering_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      offering_id INTEGER NOT NULL,
      assignment_marks INTEGER DEFAULT 0,
      quiz_marks INTEGER DEFAULT 0,
      project_marks INTEGER DEFAULT 0,
      final_exam_marks INTEGER DEFAULT 0,
      total_marks INTEGER DEFAULT 0,
      grade TEXT DEFAULT 'N/A',
      grade_points REAL DEFAULT 0,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(offering_id) REFERENCES course_offerings(id),
      UNIQUE(student_id, offering_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      offering_id INTEGER NOT NULL,
      classes_conducted INTEGER DEFAULT 0,
      classes_attended INTEGER DEFAULT 0,
      classes_missed INTEGER DEFAULT 0,
      attendance_percentage REAL DEFAULT 0,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(offering_id) REFERENCES course_offerings(id),
      UNIQUE(student_id, offering_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL
    )
  `);

  const existingAdmin = await get("SELECT * FROM users WHERE role = ?", [
    "admin"
  ]);

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync("Admindemo@0520", 10);

    await run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ["System Admin", "admin@example.com", hashedPassword, "admin"]
    );
  }

  const registrationSetting = await get(
    "SELECT * FROM settings WHERE setting_key = ?",
    ["registration_open"]
  );

  if (!registrationSetting) {
    await run(
      "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)",
      ["registration_open", "false"]
    );
  }

  console.log("Database initialized successfully.");
}

module.exports = {
  initDb,
  get,
  all,
  run
};