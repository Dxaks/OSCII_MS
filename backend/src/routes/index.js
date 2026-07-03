import { Router } from "express";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../lib/auth.js";
import { toCsv } from "../lib/csv.js";
import { makeId, readDb, updateDb } from "../store/db.js";

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

  await updateDb(() => nextDb);
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
  const { name, description = "" } = req.body || {};

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  const db = await readDb();
  const normalized = normalizeStationName(name);

  if (db.stations.some((station) => normalizeStationName(station.name) === normalized)) {
    return res.status(409).json({ message: "station already exists" });
  }

  const station = {
    id: makeId(),
    name,
    description,
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

  const { name, description, questionTimer, procedureTimer } = req.body || {};

  if (name !== undefined) station.name = name;
  if (description !== undefined) station.description = description;
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

  const question = {
    id: makeId(),
    description,
    options,
    answer,
    mark: Number(mark),
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

    if (description !== undefined) question.description = description;
    if (Array.isArray(options)) question.options = options;
    if (answer !== undefined) question.answer = answer;
    if (mark !== undefined) question.mark = Number(mark);

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

  const { description, scoreOptions } = req.body || {};

  if (!description || !Array.isArray(scoreOptions)) {
    return res.status(400).json({ message: "invalid procedure payload" });
  }

  const item = {
    id: makeId(),
    description,
    scoreOptions: scoreOptions.map(Number),
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

    if (description !== undefined) item.description = description;
    if (Array.isArray(scoreOptions)) {
      item.scoreOptions = scoreOptions.map(Number);
    }

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

router.post("/results/snapshot", requireAuth, async (req, res) => {
  try {
    const db = await readDb();
    const incomingResults = Array.isArray(req.body?.results)
      ? req.body.results
      : [];
    db.results = mergeResults(db.results, incomingResults);

    await updateDb(() => db);
    res.json({ results: db.results });
  } catch (error) {
    console.error("Failed to save results snapshot:", error);
    res.status(500).json({ message: "Failed to save results snapshot" });
  }
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
      const procedureTotal = sumScores(result.procedureResults, result.procedureTotal);
      const questionTotal = sumScores(result.questionResults, result.questionTotal);
      const procedurePercentage =
        Number.isFinite(Number(result.procedurePercentage))
          ? Number(result.procedurePercentage)
          : station.procedureItems.length > 0
            ? (procedureTotal / station.procedureItems.length) * 100
            : 0;
      const questionPercentage =
        Number.isFinite(Number(result.questionPercentage))
          ? Number(result.questionPercentage)
          : station.questions.length > 0
            ? (questionTotal / station.questions.length) * 100
            : 0;

      return {
        firstname: student?.firstname || "",
        surname: student?.surname || "",
        admissionNo: student?.admissionNo || "",
        procedureTotal,
        procedurePercentage,
        questionTotal,
        questionPercentage,
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
    status = { procedure: "in-progress", question: "in-progress" },
  } = req.body || {};

  if (!studentId || !stationId) {
    return res.status(400).json({ message: "studentId and stationId are required" });
  }

  const db = await readDb();
  const existingResultIndex = db.results.findIndex(
    (candidate) =>
      candidate.id === id ||
      (candidate.studentId === studentId && candidate.stationId === stationId),
  );
  const result = {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingResultIndex >= 0) {
    db.results[existingResultIndex] = {
      ...db.results[existingResultIndex],
      ...result,
      id: db.results[existingResultIndex].id,
      createdAt: db.results[existingResultIndex].createdAt,
    };
  } else {
    db.results.push(result);
  }

  await updateDb(() => db);

  res.status(201).json({ result });
});

router.patch("/results/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const result = db.results.find((candidate) => candidate.id === req.params.id);

  if (!result) {
    return res.status(404).json({ message: "Result not found" });
  }

  Object.assign(result, req.body || {});
  result.updatedAt = new Date().toISOString();

  await updateDb(() => db);
  res.json({ result });
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

function sumScores(entries, fallback = 0) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return toNumberOrZero(fallback);
  }

  const total = entries.reduce((sum, entry) => sum + Number(entry?.score || 0), 0);
  return Number.isFinite(total) ? total : toNumberOrZero(fallback);
}

function toNumberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStationName(name) {
  return String(name).trim().toLowerCase();
}

function sanitizeFilename(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
}

export default router;
