const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { exec } = require("child_process");

const app = express();
app.use(bodyParser.json());
app.use(cors());
const APIPORT = process.env.APIPORT || 3000;
const WEBPORT = process.env.WEBPORT || 9000;

const db = new sqlite3.Database("./SocialMedIA.db", (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.run(
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    content TEXT,
    timestamp TEXT
  )`,
);

function getRandomUsername() {
  const firstNames = [
    "john",
    "sarah",
    "michael",
    "emily",
    "william",
    "julia",
    "olivia",
    "max",
    "lucy",
    "daniel",
  ];
  const lastNames = [
    "smith",
    "jones",
    "johnson",
    "brown",
    "davis",
    "miller",
    "wilson",
    "moore",
    "taylor",
  ];
  const years = ["1992", "2003", "1989", "1994", "2001", "1995"];
  const numbers = Math.floor(Math.random() * 1000);

  const randomFirstName =
    firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomLastName =
    lastNames[Math.floor(Math.random() * lastNames.length)];
  const randomYear = years[Math.floor(Math.random() * years.length)];

  return `${randomFirstName}.${randomLastName}${randomYear}`;
}

app.get("/posts", (req, res) => {
  db.all("SELECT * FROM posts ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("DB Select Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

function autoPost() {
  axios
    .post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma3",
        prompt:
          "Pretend you are a Twitter user. Write one post about anything like a Twitter user would. There must only be one post. Nothing else. Your response should only be the post. You must not include any prefixes to your tweet such as 'Okay, here is my tweet:' or 'Okay, here is my post:'. You should use slang terms and have some occasional spelling mistakes.",
        stream: false,
        options: {
          temperature: 1.0,
          top_p: 0.95,
        },
      },
      { timeout: 15000 },
    )
    .then((response) => {
      const finalContent = response.data.response;
      const username = getRandomUsername();
      const timestamp = new Date().toISOString();

      db.run(
        "INSERT INTO posts (username, content, timestamp) VALUES (?, ?, ?)",
        [username, finalContent, timestamp],
        function (err) {
          if (err) {
            console.error("DB Insert Error in autoPost:", err);
          } else {
            console.log(`Auto-post created with ID: ${this.lastID}`);
          }
        },
      );
    })
    .catch((error) => {
      console.error("Error in autoPost generating AI content:", error);
    });
}

setInterval(autoPost, 4000);

app.listen(APIPORT, WEBPORT, () => {
  console.log(`SocialMedIA AI/Post API is on port ${APIPORT}.`);
  console.log(`SocialMedIA web interface is on port ${WEBPORT}.`);

  exec(`npx http-server -p ${WEBPORT}`, (err, stderr) => {
    if (err) {
      console.error("Error starting http-server:", err);
      return;
    }
    if (stderr) console.error(stderr);
  });
});
