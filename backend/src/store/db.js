import crypto from "node:crypto";
import { Pool } from "pg";
import { DATABASE_URL } from "../config.js";

const connectionString =
  DATABASE_URL || "postgres://oscii_ms:oscii_ms@127.0.0.1:5432/oscii_ms";

const pool = new Pool({
  connectionString,
  max: Number(process.env.PGPOOL_MAX || 10),
});

// Snapshot rewrites must coordinate with result writes across all backend
// processes. Shared locks let student saves proceed concurrently; the
// exclusive lock prevents a snapshot rewrite from racing those saves.
const WRITE_LOCK_NAMESPACE = 19796;
const WRITE_LOCK_ID = 1;

let schemaReady = false;

export async function ensureDb() {
  if (schemaReady) {
    return;
  }

  const client = await connectSchemaClient();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        surname text NOT NULL,
        firstname text NOT NULL,
        username text NOT NULL UNIQUE,
        role text NOT NULL,
        admission_no text,
        image text NOT NULL DEFAULT '',
        password_hash jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id text PRIMARY KEY,
        name text NOT NULL UNIQUE,
        description text NOT NULL DEFAULT '',
        question_name TEXT NOT NULL DEFAULT '',
        procedure_name TEXT NOT NULL DEFAULT '',
        procedure_items jsonb NOT NULL DEFAULT '[]'::jsonb,
        questions jsonb NOT NULL DEFAULT '[]'::jsonb,
        question_timer jsonb NOT NULL DEFAULT '{"enabled":false,"duration":0}'::jsonb,
        procedure_timer jsonb NOT NULL DEFAULT '{"enabled":false,"duration":0}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      ALTER TABLE stations
      ADD COLUMN IF NOT EXISTS question_name text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS procedure_name text NOT NULL DEFAULT ''
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS results (
        id text PRIMARY KEY,
        student_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        station_id text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
        procedure_results jsonb NOT NULL DEFAULT '[]'::jsonb,
        question_results jsonb NOT NULL DEFAULT '[]'::jsonb,
        procedure_total numeric NOT NULL DEFAULT 0,
        question_total numeric NOT NULL DEFAULT 0,
        procedure_percentage numeric NOT NULL DEFAULT 0,
        question_percentage numeric NOT NULL DEFAULT 0,
        status jsonb NOT NULL DEFAULT '{"procedure":"in-progress","question":"in-progress"}'::jsonb,
        student_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
        current_question_index integer NOT NULL DEFAULT 0,
        time_remaining integer,
        procedure_time_remaining integer,
        procedure_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(student_id, station_id)
      );
    `);

    await client.query("COMMIT");
    schemaReady = true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function connectSchemaClient() {
  try {
    return await pool.connect();
  } catch (error) {
    if (!isMissingDatabaseError(error)) {
      throw error;
    }

    await createDatabaseIfMissing();
    return pool.connect();
  }
}

async function createDatabaseIfMissing() {
  const databaseName = getDatabaseName(connectionString);

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  const maintenanceConnectionString = setDatabaseName(connectionString, "postgres");
  const maintenancePool = new Pool({
    connectionString: maintenanceConnectionString,
    max: 1,
  });

  const client = await maintenancePool.connect();

  try {
    const exists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (exists.rowCount > 0) {
      return;
    }

    await client.query(`CREATE DATABASE ${escapeIdentifier(databaseName)}`);
  } finally {
    client.release();
    await maintenancePool.end();
  }
}

function getDatabaseName(url) {
  try {
    const parsed = new URL(url);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    return databaseName || "";
  } catch {
    return "";
  }
}

function setDatabaseName(url, databaseName) {
  const parsed = new URL(url);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function escapeIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function isMissingDatabaseError(error) {
  return (
    error?.code === "3D000" ||
    /database .* does not exist/i.test(error?.message || "")
  );
}


// export async function readDb(queryClient = pool) {
//   await ensureDb();

//   const [usersResult, stationsResult, resultsResult] = await Promise.all([
//     queryClient.query("SELECT * FROM users ORDER BY created_at ASC"),
//     queryClient.query("SELECT * FROM stations ORDER BY created_at ASC"),
//     queryClient.query("SELECT * FROM results ORDER BY created_at ASC"),
//   ]);

//   return {
//     users: usersResult.rows.map(mapUserRow),
//     stations: stationsResult.rows.map(mapStationRow),
//     results: resultsResult.rows.map(mapResultRow),
//   };
// }

export async function readDb(queryClient = pool) {
  await ensureDb();

  const usersResult = await queryClient.query(
    "SELECT * FROM users ORDER BY created_at ASC"
  );

  const stationsResult = await queryClient.query(
    "SELECT * FROM stations ORDER BY created_at ASC"
  );

  const resultsResult = await queryClient.query(
    "SELECT * FROM results ORDER BY created_at ASC"
  );

  return {
    users: usersResult.rows.map(mapUserRow),
    stations: stationsResult.rows.map(mapStationRow),
    results: resultsResult.rows.map(mapResultRow),
  };
}



export async function writeDb(db, queryClient = null) {
  await ensureDb();

  const users = normalizeCollection(db?.users);
  const stations = normalizeCollection(db?.stations);
  const results = filterValidResults(
    dedupeResults(normalizeCollection(db?.results)),
    users,
    stations,
  );

  const ownsClient = queryClient == null;
  const client = queryClient || await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE results, stations, users RESTART IDENTITY CASCADE");

    for (const user of users) {
      await client.query(
        `
          INSERT INTO users (
            id,
            surname,
            firstname,
            username,
            role,
            admission_no,
            image,
            password_hash,
            created_at,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          user.id || makeId(),
          user.surname || "",
          user.firstname || "",
          user.username || "",
          user.role || "student",
          user.admissionNo ?? user.admission_no ?? null,
          user.image || "",
          user.passwordHash || user.password_hash || null,
          user.createdAt || user.created_at || new Date().toISOString(),
          user.updatedAt || user.updated_at || new Date().toISOString(),
        ],
      );
    }

    for (const station of stations) {
      await client.query(
        `
          INSERT INTO stations (
            id,
            name,
            description,
            question_name,
            procedure_name,
            procedure_items,
            questions,
            question_timer,
            procedure_timer,
            created_at,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,$10,$11)
        `,
        [
          station.id || makeId(),
          station.name || "",
          station.description || "",
          station.questionName || station.question_name || `Question ${station.name}`,
          station.procedureName || station.procedure_name || `Procedure ${station.name}`,
          JSON.stringify(normalizeCollection(station.procedureItems ?? station.procedure_items)),
          JSON.stringify(normalizeCollection(station.questions)),
          JSON.stringify(station.questionTimer ?? station.question_timer ?? { enabled: false, duration: 0 }),
          JSON.stringify(station.procedureTimer ?? station.procedure_timer ?? { enabled: false, duration: 0 }),
          station.createdAt || station.created_at || new Date().toISOString(),
          station.updatedAt || station.updated_at || new Date().toISOString(),
        ],
      );
    }

    for (const result of results) {
      await client.query(
        `
          INSERT INTO results (
            id,
            student_id,
            station_id,
            procedure_results,
            question_results,
            procedure_total,
            question_total,
            procedure_percentage,
            question_percentage,
            status,
            student_answers,
            current_question_index,
            time_remaining,
            procedure_time_remaining,
            procedure_scores,
            created_at,
            updated_at
          ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb,$16,$17)
        `,
        [
          result.id || makeId(),
          result.studentId || result.student_id,
          result.stationId || result.station_id,
          JSON.stringify(normalizeCollection(result.procedureResults ?? result.procedure_results)),
          JSON.stringify(normalizeCollection(result.questionResults ?? result.question_results)),
          numberOrZero(result.procedureTotal ?? result.procedure_total),
          numberOrZero(result.questionTotal ?? result.question_total),
          numberOrZero(result.procedurePercentage ?? result.procedure_percentage),
          numberOrZero(result.questionPercentage ?? result.question_percentage),
          JSON.stringify(result.status || { procedure: "in-progress", question: "in-progress" }),
          JSON.stringify(result.studentAnswers ?? result.student_answers ?? {}),
          Number(result.currentQuestionIndex ?? result.current_question_index ?? 0),
          result.timeRemaining ?? result.time_remaining ?? null,
          result.procedureTimeRemaining ?? result.procedure_time_remaining ?? null,
          JSON.stringify(result.procedureScores ?? result.procedure_scores ?? {}),
          result.createdAt || result.created_at || new Date().toISOString(),
          result.updatedAt || result.updated_at || new Date().toISOString(),
        ],
      );
    }

    await client.query("COMMIT");
    return structuredClone({
      users: users.map(normalizeUserLike),
      stations: stations.map(normalizeStationLike),
      results: results.map(normalizeResultLike),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
}

export async function updateDb(mutator, { preserveResults = true } = {}) {
  await ensureDb();
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await acquireWriteLock(client, false);
    lockAcquired = true;

    // Read and rewrite while holding the exclusive lock. Result POST/PATCH
    // operations use the matching shared lock, so no result save can slip
    // between this read and the TRUNCATE/reinsert transaction.
    const db = await readDb(client);
    const nextDb = await mutator(db) || db;

    // Current admin mutations change users/stations, not results. Preserve
    // result rows read under the lock so callbacks holding an older snapshot
    // cannot restore stale answers, scores, or statuses.
    if (preserveResults) {
      nextDb.results = db.results;
    }

    return await writeDb(nextDb, client);
  } finally {
    if (lockAcquired) {
      await releaseWriteLock(client, false);
    } else {
      client.release();
    }
  }
}

export function makeId() {
  return crypto.randomUUID();
}

async function acquireWriteLock(client, shared) {
  const lockFunction = shared ? "pg_advisory_lock_shared" : "pg_advisory_lock";
  await client.query(`SELECT ${lockFunction}($1, $2)`, [
    WRITE_LOCK_NAMESPACE,
    WRITE_LOCK_ID,
  ]);
}

async function releaseWriteLock(client, shared) {
  const unlockFunction = shared
    ? "pg_advisory_unlock_shared"
    : "pg_advisory_unlock";

  try {
    const result = await client.query(
      `SELECT ${unlockFunction}($1, $2) AS unlocked`,
      [WRITE_LOCK_NAMESPACE, WRITE_LOCK_ID],
    );

    if (!result.rows[0]?.unlocked) {
      throw new Error("PostgreSQL write lock was not held by this connection.");
    }

    client.release();
  } catch (error) {
    // Destroy the connection if its session lock could not be released.
    client.release(error);
    throw error;
  }
}

function mapUserRow(row) {
  return {
    id: row.id,
    surname: row.surname,
    firstname: row.firstname,
    username: row.username,
    role: row.role,
    admissionNo: row.admission_no,
    image: row.image || "",
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStationRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    questionName: row.question_name || `Question ${row.name}`,
    procedureName: row.procedure_name || `Procedure ${row.name}`,
    procedureItems: parseJson(row.procedure_items, []),
    questions: parseJson(row.questions, []),
    questionTimer: parseJson(row.question_timer, { enabled: false, duration: 0 }),
    procedureTimer: parseJson(row.procedure_timer, { enabled: false, duration: 0 }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResultRow(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    stationId: row.station_id,
    procedureResults: parseJson(row.procedure_results, []),
    questionResults: parseJson(row.question_results, []),
    procedureTotal: numberOrZero(row.procedure_total),
    questionTotal: numberOrZero(row.question_total),
    procedurePercentage: numberOrZero(row.procedure_percentage),
    questionPercentage: numberOrZero(row.question_percentage),
    status: parseJson(row.status, { procedure: "in-progress", question: "in-progress" }),
    studentAnswers: parseJson(row.student_answers, {}),
    currentQuestionIndex: Number(row.current_question_index || 0),
    timeRemaining: row.time_remaining,
    procedureTimeRemaining: row.procedure_time_remaining,
    procedureScores: parseJson(row.procedure_scores, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


export async function updateResultById(resultId, payload) {
  await ensureDb();
  const client = await pool.connect();
  let lockAcquired = false;

  try {
  await acquireWriteLock(client, true);
  lockAcquired = true;

  const result = await client.query(
    `
      UPDATE results
      SET
        procedure_results = COALESCE($1::jsonb, procedure_results),
        question_results = COALESCE($2::jsonb, question_results),
        procedure_total = COALESCE($3::numeric, procedure_total),
        question_total = COALESCE($4::numeric, question_total),
        procedure_percentage = COALESCE($5::numeric, procedure_percentage),
        question_percentage = COALESCE($6::numeric, question_percentage),
        status = COALESCE($7::jsonb, status),
        student_answers = COALESCE($8::jsonb, student_answers),
        current_question_index = COALESCE($9::integer, current_question_index),
        time_remaining = COALESCE($10::integer, time_remaining),
        procedure_time_remaining = COALESCE($11::integer, procedure_time_remaining),
        procedure_scores = COALESCE($12::jsonb, procedure_scores),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `,
    [
      payload.procedureResults == null
        ? null
        : JSON.stringify(payload.procedureResults),

      payload.questionResults == null
        ? null
        : JSON.stringify(payload.questionResults),

      payload.procedureTotal ?? null,
      payload.questionTotal ?? null,
      payload.procedurePercentage ?? null,
      payload.questionPercentage ?? null,

      payload.status == null
        ? null
        : JSON.stringify(payload.status),

      payload.studentAnswers == null
        ? null
        : JSON.stringify(payload.studentAnswers),

      payload.currentQuestionIndex ?? null,
      payload.timeRemaining ?? null,
      payload.procedureTimeRemaining ?? null,

      payload.procedureScores == null
        ? null
        : JSON.stringify(payload.procedureScores),

      resultId,
    ],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapResultRow(result.rows[0]);
  } finally {
    if (lockAcquired) {
      await releaseWriteLock(client, true);
    } else {
      client.release();
    }
  }
}


export async function createResultIfNotExists(result) {
    await ensureDb();
    const client = await pool.connect();
    let lockAcquired = false;

    try {
    await acquireWriteLock(client, true);
    lockAcquired = true;

    const queryResult = await client.query(
        `
        INSERT INTO results (
            id,
            student_id,
            station_id,
            procedure_results,
            question_results,
            procedure_total,
            question_total,
            procedure_percentage,
            question_percentage,
            status,
            student_answers,
            current_question_index,
            time_remaining,
            procedure_time_remaining,
            procedure_scores,
            created_at,
            updated_at
        )
        VALUES (
            $1, $2, $3, $4::jsonb, $5::jsonb,
            $6, $7, $8, $9, $10::jsonb,
            $11::jsonb, $12, $13, $14,
            $15::jsonb, NOW(), NOW()
        )
        ON CONFLICT (student_id, station_id)
        DO UPDATE SET id = results.id
        RETURNING *
        `,
        [
            result.id,
            result.studentId,
            result.stationId,
            JSON.stringify(result.procedureResults),
            JSON.stringify(result.questionResults),
            result.procedureTotal,
            result.questionTotal,
            result.procedurePercentage,
            result.questionPercentage,
            JSON.stringify(result.status),
            JSON.stringify(result.studentAnswers),
            result.currentQuestionIndex,
            result.timeRemaining,
            result.procedureTimeRemaining,
            JSON.stringify(result.procedureScores),
        ],
    );

    return mapResultRow(queryResult.rows[0]);
    } finally {
      if (lockAcquired) {
        await releaseWriteLock(client, true);
      } else {
        client.release();
      }
    }
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

function dedupeResults(results) {
  const deduped = new Map();

  for (const result of results) {
    if (!result || typeof result !== "object") {
      continue;
    }

    const key =
      result.id ||
      (result.studentId && result.stationId
        ? `${result.studentId}:${result.stationId}`
        : makeId());

    deduped.set(key, result);
  }

  return Array.from(deduped.values());
}

function filterValidResults(results, users, stations) {
  const validUserIds = new Set(users.map((user) => user?.id).filter(Boolean));
  const validStationIds = new Set(
    stations.map((station) => station?.id).filter(Boolean),
  );

  return results.filter((result) => {
    if (!result || typeof result !== "object") {
      return false;
    }

    return (
      validUserIds.has(result.studentId) &&
      validStationIds.has(result.stationId)
    );
  });
}

function parseJson(value, fallback) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUserLike(user) {
  return {
    id: user.id,
    surname: user.surname,
    firstname: user.firstname,
    username: user.username,
    role: user.role,
    admissionNo: user.admissionNo ?? null,
    image: user.image || "",
    passwordHash: user.passwordHash || null,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
  };
}

function normalizeStationLike(station) {
  return {
    id: station.id,
    name: station.name,
    description: station.description || "",
    procedureItems: normalizeCollection(station.procedureItems),
    questions: normalizeCollection(station.questions),
    questionTimer: station.questionTimer || { enabled: false, duration: 0 },
    procedureTimer: station.procedureTimer || { enabled: false, duration: 0 },
    createdAt: station.createdAt || new Date().toISOString(),
    updatedAt: station.updatedAt || new Date().toISOString(),
  };
}

function normalizeResultLike(result) {
  return {
    id: result.id,
    studentId: result.studentId,
    stationId: result.stationId,
    procedureResults: normalizeCollection(result.procedureResults),
    questionResults: normalizeCollection(result.questionResults),
    procedureTotal: numberOrZero(result.procedureTotal),
    questionTotal: numberOrZero(result.questionTotal),
    procedurePercentage: numberOrZero(result.procedurePercentage),
    questionPercentage: numberOrZero(result.questionPercentage),
    status: result.status || { procedure: "in-progress", question: "in-progress" },
    studentAnswers: result.studentAnswers || {},
    currentQuestionIndex: Number(result.currentQuestionIndex || 0),
    timeRemaining: result.timeRemaining ?? null,
    procedureTimeRemaining: result.procedureTimeRemaining ?? null,
    procedureScores: result.procedureScores || {},
    createdAt: result.createdAt || new Date().toISOString(),
    updatedAt: result.updatedAt || new Date().toISOString(),
  };
}
