import pg from "pg";

const { Pool } = pg;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    const error = new Error("DATABASE_URL 환경변수가 필요합니다.");
    error.statusCode = 500;
    throw error;
  }
  if (!/^postgres(ql)?:\/\//.test(connectionString)) {
    const error = new Error("DATABASE_URL에는 PostgreSQL 연결 URL을 넣어주세요.");
    error.statusCode = 500;
    throw error;
  }
  return connectionString;
}

function getPool() {
  if (!globalThis.__dateInvitePool) {
    globalThis.__dateInvitePool = new Pool({
      connectionString: getConnectionString(),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalThis.__dateInvitePool;
}

export async function ensureSchema() {
  if (!globalThis.__dateInviteSchemaReady) {
    globalThis.__dateInviteSchemaReady = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS date_applications (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          date_value TEXT NOT NULL,
          time_value TEXT NOT NULL,
          note TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS date_applications_created_at_idx
          ON date_applications (created_at DESC, id DESC);
      `)
      .catch((error) => {
        globalThis.__dateInviteSchemaReady = undefined;
        throw error;
      });
  }

  await globalThis.__dateInviteSchemaReady;
}

function tsFromRow(row) {
  if (row.created_at instanceof Date) return row.created_at.getTime();

  const parsed = Date.parse(row.created_at);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function mapApplication(row) {
  return {
    id: String(row.id),
    name: row.name,
    date: row.date,
    time: row.time,
    note: row.note,
    ts: tsFromRow(row),
  };
}

function cleanText(value, field, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    const error = new Error(`${field} 값이 필요합니다.`);
    error.statusCode = 400;
    throw error;
  }
  if (text.length > maxLength) {
    const error = new Error(`${field} 값이 너무 깁니다.`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function cleanDate(value) {
  const date = cleanText(value, "date", 10);
  if (!DATE_RE.test(date)) {
    const error = new Error("date 형식은 YYYY-MM-DD 여야 합니다.");
    error.statusCode = 400;
    throw error;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    const error = new Error("유효한 날짜를 입력해주세요.");
    error.statusCode = 400;
    throw error;
  }

  return date;
}

function cleanTime(value) {
  const time = cleanText(value, "time", 5);
  if (!TIME_RE.test(time)) {
    const error = new Error("time 형식은 HH:MM 이어야 합니다.");
    error.statusCode = 400;
    throw error;
  }

  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59) {
    const error = new Error("유효한 시간을 입력해주세요.");
    error.statusCode = 400;
    throw error;
  }

  return time;
}

function validateApplication(input) {
  return {
    name: cleanText(input?.name, "name", 80),
    date: cleanDate(input?.date),
    time: cleanTime(input?.time),
    note: cleanText(input?.note, "note", 1000),
  };
}

export async function listApplications() {
  await ensureSchema();

  const { rows } = await getPool().query(`
    SELECT
      id::text AS id,
      name,
      date_value AS date,
      time_value AS time,
      note,
      created_at
    FROM date_applications
    ORDER BY created_at DESC, id DESC
  `);

  return rows.map(mapApplication);
}

export async function createApplication(input) {
  await ensureSchema();

  const application = validateApplication(input);
  const { rows } = await getPool().query(
    `
      INSERT INTO date_applications (name, date_value, time_value, note)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id::text AS id,
        name,
        date_value AS date,
        time_value AS time,
        note,
        created_at
    `,
    [application.name, application.date, application.time, application.note],
  );

  return mapApplication(rows[0]);
}

export async function deleteApplication(id) {
  await ensureSchema();

  const cleanId = String(id || "");
  if (!/^\d+$/.test(cleanId)) {
    const error = new Error("유효한 신청 ID가 아닙니다.");
    error.statusCode = 400;
    throw error;
  }

  const result = await getPool().query("DELETE FROM date_applications WHERE id = $1", [
    cleanId,
  ]);

  return result.rowCount > 0;
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);

  const rawBody = await new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });

  return rawBody ? JSON.parse(rawBody) : {};
}

export function sendApiError(res, error) {
  const status = error?.statusCode || 500;
  if (status >= 500) console.error(error);

  res.status(status).json({
    error: status >= 500 ? "서버에서 문제가 발생했습니다." : error.message,
  });
}
