import { Router } from "express";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../lib/auth.js";
import { toCsv } from "../lib/csv.js";
import { makeId, readDb, updateDb, updateResultById, createResultIfNotExists } from "../store/db.js";
import { formatScore, getStationScoreMetrics } from "../../../shared/scoring.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "oscii-ms-backend" });
});

router.get("/bootstrap", async (_req, res) => {
  const db = await readDb();
  res.json(db);
});

router.post("/bootstrap", async (req, res) => {
  const nextDb = sanitizeBootstrapPayload(req.body || {});

        if (
          nextDb.users.length === 0 &&
          nextDb.stations.length === 0 &&
          nextDb.results.length === 0
      ) {
          return res.status(400).json({
              message: "Refusing to overwrite the database with an empty snapshot."
          });
      }

  // Bootstrap is the explicit full-snapshot import path. Regular admin
  // mutations preserve the latest assessment rows during snapshot writes.
  await updateDb(() => nextDb, { preserveResults: false });
  res.json(nextDb);
});


router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const db = await readDb();
  const user = db.users.find((candidate) => candidate.username === username);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordRecord = user.passwordHash || user.password;
  const passwordMatches =
    typeof passwordRecord === "string"
      ? verifyPassword(password, passwordRecord)
      : verifyPassword(password, passwordRecord);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(
    { sub: user.id, role: user.role, username: user.username },
    process.env.AUTH_SECRET || "change-me-in-production",
  );

  res.json({ token, user: sanitizeUser(user) });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const db = await readDb();
  const user = db.users.find((candidate) => candidate.id === req.auth.sub);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ user: sanitizeUser(user) });
});

router.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const db = await readDb();
  res.json({ users: db.users.map(sanitizeUser) });
});

router.post("/users/snapshot", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  db.users = sanitizeUsers(req.body?.users || []);

  await updateDb(() => db);
  res.json({ users: db.users.map(sanitizeUser) });
});

router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const {
    id,
    surname,
    firstname,
    username,
    password,
    role,
    admissionNo = null,
    image = "",
  } = req.body || {};

  if (!surname || !firstname || !username || !password || !role) {
    return res.status(400).json({ message: "missing required fields" });
  }

  const db = await readDb();
  if (db.users.some((user) => user.username === username)) {
    return res.status(409).json({ message: "username already exists" });
  }

  const passwordHash = hashPassword(password);
  const user = {
    id: id || makeId(),
    surname,
    firstname,
    username,
    role,
    admissionNo: role === "student" ? admissionNo : null,
    image,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.push(user);
  await updateDb(() => db);

  res.status(201).json({ user: sanitizeUser(user) });
});

router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  const user = db.users.find((candidate) => candidate.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { surname, firstname, username, role, admissionNo, image, password } = req.body || {};

  if (surname !== undefined) user.surname = surname;
  if (firstname !== undefined) user.firstname = firstname;
  if (username !== undefined) user.username = username;
  if (role !== undefined) user.role = role;
  if (admissionNo !== undefined) user.admissionNo = admissionNo;
  if (image !== undefined) user.image = image;
  if (password) user.passwordHash = hashPassword(password);

  user.updatedAt = new Date().toISOString();

  await updateDb(() => db);
  res.json({ user: sanitizeUser(user) });
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  const before = db.users.length;
  db.users = db.users.filter((user) => user.id !== req.params.id);

  if (db.users.length === before) {
    return res.status(404).json({ message: "User not found" });
  }

  db.results = db.results.filter((result) => result.studentId !== req.params.id);

  await updateDb(() => db);
  res.status(204).end();
});

router.get("/stations", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json({ stations: db.stations });
});

router.post("/stations/snapshot", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  db.stations = Array.isArray(req.body?.stations) ? req.body.stations : [];

  await updateDb(() => db);
  res.json({ stations: db.stations });
});

router.post("/stations", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, description = "", questionName, procedureName } = req.body || {};

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  const stationName = name.trim();

  const db = await readDb();
  const normalized = normalizeStationName(name);

  if (db.stations.some((station) => normalizeStationName(station.name) === normalized)) {
    return res.status(409).json({ message: "station already exists" });
  }

  const station = {
    id: makeId(),
    name,
    description,
    questionName: questionName?.trim() || `Question ${stationName}`,
    procedureName: procedureName?.trim() || `Procedure ${stationName}`,
    procedureItems: [],
    questions: [],
    questionTimer: { enabled: false, duration: 0 },
    procedureTimer: { enabled: false, duration: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.stations.push(station);
  await updateDb(() => db);

  res.status(201).json({ station });
});

router.get("/stations/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const station = db.stations.find((candidate) => candidate.id === req.params.id);

  if (!station) {
    return res.status(404).json({ message: "Station not found" });
  }

  res.json({ station });
});

router.patch("/stations/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  const station = db.stations.find((candidate) => candidate.id === req.params.id);

  if (!station) {
    return res.status(404).json({ message: "Station not found" });
  }

  const { name, description, questionName, procedureName, questionTimer, procedureTimer } = req.body || {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Station name cannot be empty",
      });
    }

    const normalized = normalizeStationName(name.trim());

    const duplicate = db.stations.some(
      (candidate) =>
        candidate.id !== station.id &&
        normalizeStationName(candidate.name) === normalized
    );

    if (duplicate) {
      return res.status(409).json({
        message: "station already exists",
      });
    }

    station.name = name.trim();
  }

  if (description !== undefined) station.description = description;
  if (questionName !== undefined) station.questionName = questionName;
  if (procedureName !== undefined) station.procedureName = procedureName;
  if (questionTimer !== undefined) station.questionTimer = questionTimer;
  if (procedureTimer !== undefined) station.procedureTimer = procedureTimer;

  station.updatedAt = new Date().toISOString();
  await updateDb(() => db);

  res.json({ station });
});

router.delete("/stations/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  const before = db.stations.length;
  db.stations = db.stations.filter((station) => station.id !== req.params.id);
  db.results = db.results.filter((result) => result.stationId !== req.params.id);

  if (db.stations.length === before) {
    return res.status(404).json({ message: "Station not found" });
  }

  await updateDb(() => db);
  res.status(204).end();
});

router.post("/stations/:id/questions", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  const station = db.stations.find((candidate) => candidate.id === req.params.id);

  if (!station) {
    return res.status(404).json({ message: "Station not found" });
  }

  const { description, options, answer, mark } = req.body || {};

  if (!description || !Array.isArray(options) || !answer || mark === undefined) {
    return res.status(400).json({ message: "invalid question payload" });
  }

  const questionMark = Number(mark);
  if (!Number.isFinite(questionMark) || questionMark <= 0) {
    return res.status(400).json({ message: "question mark must be a positive number" });
  }

  const question = {
    id: makeId(),
    description,
    options,
    answer,
    mark: questionMark,
  };

  station.questions.push(question);
  station.updatedAt = new Date().toISOString();
  await updateDb(() => db);

  res.status(201).json({ question });
});

router.patch(
  "/stations/:stationId/questions/:questionId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const db = await readDb();
    const station = db.stations.find(
      (candidate) => candidate.id === req.params.stationId,
    );

    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    const question = station.questions.find(
      (candidate) => candidate.id === req.params.questionId,
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const { description, options, answer, mark } = req.body || {};

    if (mark !== undefined) {
      const questionMark = Number(mark);
      if (!Number.isFinite(questionMark) || questionMark <= 0) {
        return res.status(400).json({ message: "question mark must be a positive number" });
      }
      question.mark = questionMark;
    }

    if (description !== undefined) question.description = description;
    if (Array.isArray(options)) question.options = options;
    if (answer !== undefined) question.answer = answer;

    station.updatedAt = new Date().toISOString();
    await updateDb(() => db);

    res.json({ question });
  },
);

router.delete(
  "/stations/:stationId/questions/:questionId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const db = await readDb();
    const station = db.stations.find(
      (candidate) => candidate.id === req.params.stationId,
    );

    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    const before = station.questions.length;
    station.questions = station.questions.filter(
      (question) => question.id !== req.params.questionId,
    );

    if (station.questions.length === before) {
      return res.status(404).json({ message: "Question not found" });
    }

    station.updatedAt = new Date().toISOString();
    await updateDb(() => db);

    res.status(204).end();
  },
);

router.post("/stations/:id/procedure-items", requireAuth, requireRole("admin"), async (req, res) => {
  const db = await readDb();
  const station = db.stations.find((candidate) => candidate.id === req.params.id);

  if (!station) {
    return res.status(404).json({ message: "Station not found" });
  }

  const { description, scoreOptions, kind = "scored" } = req.body || {};

  if (
    !description ||
    !Array.isArray(scoreOptions) ||
    !["scored", "heading"].includes(kind)
  ) {
    return res.status(400).json({ message: "invalid procedure payload" });
  }

  const normalizedScoreOptions = scoreOptions.map(Number);
  if (kind === "scored" && (
      normalizedScoreOptions.length < 2 ||
      normalizedScoreOptions.some((score) => !Number.isFinite(score) || score < 0)
    )) {
    return res.status(400).json({ message: "procedure score options must be non-negative numbers" });
  }

  const item = {
    id: makeId(),
    description,
    scoreOptions: kind === "heading" ? [] : normalizedScoreOptions,
    kind,
  };

  station.procedureItems.push(item);
  station.updatedAt = new Date().toISOString();
  await updateDb(() => db);

  res.status(201).json({ item });
});

router.patch(
  "/stations/:stationId/procedure-items/:itemId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const db = await readDb();
    const station = db.stations.find(
      (candidate) => candidate.id === req.params.stationId,
    );

    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    const item = station.procedureItems.find(
      (candidate) => candidate.id === req.params.itemId,
    );

    if (!item) {
      return res.status(404).json({ message: "Procedure item not found" });
    }

    const { description, scoreOptions } = req.body || {};

    if (scoreOptions !== undefined) {
      if (!Array.isArray(scoreOptions)) {
        return res.status(400).json({ message: "invalid procedure score options" });
      }
      const normalizedScoreOptions = scoreOptions.map(Number);
      if (
        normalizedScoreOptions.length < 2 ||
        normalizedScoreOptions.some((score) => !Number.isFinite(score) || score < 0)
      ) {
        return res.status(400).json({ message: "procedure score options must be non-negative numbers" });
      }
      item.scoreOptions = normalizedScoreOptions;
    }

    if (description !== undefined) item.description = description;

    station.updatedAt = new Date().toISOString();
    await updateDb(() => db);

    res.json({ item });
  },
);

router.delete(
  "/stations/:stationId/procedure-items/:itemId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const db = await readDb();
    const station = db.stations.find(
      (candidate) => candidate.id === req.params.stationId,
    );

    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    const before = station.procedureItems.length;
    station.procedureItems = station.procedureItems.filter(
      (item) => item.id !== req.params.itemId,
    );

    if (station.procedureItems.length === before) {
      return res.status(404).json({ message: "Procedure item not found" });
    }

    station.updatedAt = new Date().toISOString();
    await updateDb(() => db);

    res.status(204).end();
  },
);

router.get("/stations/:id/results", requireAuth, async (req, res) => {
  const db = await readDb();
  const results = db.results.filter((result) => result.stationId === req.params.id);
  res.json({ results });
});

router.get("/results", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json({ results: db.results });
});

router.get("/results.csv", requireAuth, async (_req, res) => {
  const db = await readDb();
  const stations = db.stations;
  const resultsByStudentStation = new Map(
    db.results.map((result) => [
      `${result.studentId}:${result.stationId}`,
      result,
    ]),
  );
  const rows = db.users
    .filter((user) => user.role === "student")
    .map((student) => {
      const row = {
        admissionNo: student.admissionNo || "",
        firstname: student.firstname,
        surname: student.surname,
      };
      let cumulativeEarned = 0;
      let cumulativeMaximum = 0;

      for (const station of stations) {
        const result = resultsByStudentStation.get(
          `${student.id}:${station.id}`,
        );
        const prefix = station.name;
        const metrics = getStationScoreMetrics(station, result);
        cumulativeEarned += metrics.earned;
        cumulativeMaximum += metrics.maximum;

        row[`${prefix} - Procedure Score`] = formatScore(metrics.procedureEarned);
        row[`${prefix} - Procedure Percentage`] = formatPercentage(metrics.procedurePercentage);
        row[`${prefix} - Question Score`] = metrics.questionEarned.toFixed(2);
        row[`${prefix} - Question Percentage`] = formatPercentage(metrics.questionPercentage);
      }

      const cumulativePercentage = cumulativeMaximum > 0
        ? (cumulativeEarned / cumulativeMaximum) * 100
        : null;
      row["Cumulative Percentage"] = formatPercentage(cumulativePercentage);
      row.Remark = cumulativePercentage === null
        ? "N/A"
        : cumulativePercentage < 50 ? "Failed" : "Passed";

      return row;
    });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="oscii-all-stations-results.csv"',
  );
  res.send(toCsv(rows));
});


router.get("/stations/:id/results.csv", requireAuth, async (req, res) => {
  const db = await readDb();
  const station = db.stations.find((candidate) => candidate.id === req.params.id);

  if (!station) {
    return res.status(404).json({ message: "Station not found" });
  }

  const rows = db.results
    .filter((result) => result.stationId === req.params.id)
    .map((result) => {
      const student = db.users.find((user) => user.id === result.studentId);
      const metrics = getStationScoreMetrics(station, result);

      return {
        firstname: student?.firstname || "",
        surname: student?.surname || "",
        admissionNo: student?.admissionNo || "",
        procedureTotal: formatScore(metrics.procedureEarned),
        procedurePercentage: formatPercentage(metrics.procedurePercentage),
        questionTotal: metrics.questionEarned.toFixed(2),
        questionPercentage: formatPercentage(metrics.questionPercentage),
        statusProcedure: result.status?.procedure || "",
        statusQuestion: result.status?.question || "",
      };
    });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitizeFilename(station.name)}-results.csv"`,
  );
  res.send(toCsv(rows));
});


router.post("/results", requireAuth, async (req, res) => {
    try {
        const {
            id,
            studentId,
            stationId,
            procedureResults = [],
            questionResults = [],
            procedureTotal = 0,
            questionTotal = 0,
            procedurePercentage = 0,
            questionPercentage = 0,
            status = {
                procedure: "in-progress",
                question: "in-progress",
            },
        } = req.body || {};

        if (!studentId || !stationId) {
            return res.status(400).json({
                message: "studentId and stationId are required",
            });
        }

        const result = await createResultIfNotExists({
            id: id || makeId(),
            studentId,
            stationId,
            procedureResults,
            questionResults,
            procedureTotal,
            questionTotal,
            procedurePercentage,
            questionPercentage,
            status,
            studentAnswers: {},
            currentQuestionIndex: 0,
            timeRemaining: null,
            procedureTimeRemaining: null,
            procedureScores: {},
        });

        return res.status(200).json({ result });
    } catch (error) {
        console.error("Failed to create result:", error);

        return res.status(500).json({
            message: "Failed to create result",
        });
    }
});


router.patch("/results/:id", requireAuth, async (req, res) => {
  try {
    const result = await updateResultById(
      req.params.id,
      req.body || {},
    );

    if (!result) {
      return res.status(404).json({
        message: "Result not found",
      });
    }

    return res.json({ result });
  } catch (error) {
    console.error("Failed to update result:", error);

    return res.status(500).json({
      message: "Failed to save result",
    });
  }
});


function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token, process.env.AUTH_SECRET || "change-me-in-production");

  if (!payload) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.auth = payload;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

function sanitizeUser(user) {
  const { passwordHash, password, ...safeUser } = user;
  return safeUser;
}

function sanitizeUsers(users) {
  return normalizeCollection(users).map((user) => {
    if (user.passwordHash) {
      return {
        id: user.id || makeId(),
        surname: user.surname || "",
        firstname: user.firstname || "",
        username: user.username || "",
        role: user.role || "student",
        admissionNo: user.admissionNo || null,
        image: user.image || "",
        passwordHash: user.passwordHash,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const password = user.password || "";
    return {
      id: user.id || makeId(),
      surname: user.surname || "",
      firstname: user.firstname || "",
      username: user.username || "",
      role: user.role || "student",
      admissionNo: user.admissionNo || null,
      image: user.image || "",
      passwordHash: hashPassword(password),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

function sanitizeBootstrapPayload(payload) {
  return {
    users: sanitizeUsers(payload.users),
    stations: normalizeCollection(payload.stations),
    results: normalizeCollection(payload.results),
  };
}

function normalizeCollection(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value);
  }

  return [];
}

function mergeResults(existingResults, incomingResults) {
  const mergedById = new Map();

  for (const result of normalizeCollection(existingResults)) {
    const key = getResultMergeKey(result);
    if (key) {
      mergedById.set(key, result);
    }
  }

  for (const result of normalizeCollection(incomingResults)) {
    const key = getResultMergeKey(result);
    if (key) {
      mergedById.set(key, result);
      continue;
    }

    const generatedId = makeId();
    mergedById.set(generatedId, { ...result, id: generatedId });
  }

  return Array.from(mergedById.values());
}

function getResultMergeKey(result) {
  if (!result || typeof result !== "object") {
    return "";
  }

  if (result.studentId && result.stationId) {
    return `student:${result.studentId}:station:${result.stationId}`;
  }

  if (result.id) {
    return `id:${result.id}`;
  }

  return "";
}

function toNumberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercentage(value) {
  return value == null ? "N/A" : Number(value).toFixed(2);
}

function normalizeStationName(name) {
  return String(name).trim().toLowerCase();
}

function sanitizeFilename(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
}

export default router;
