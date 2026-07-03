import crypto from "node:crypto";

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_DIGEST = "sha256";

export function hashPassword(password, salt = randomSalt()) {
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, PASSWORD_DIGEST)
    .toString("hex");

  return {
    salt,
    hash,
    iterations: PASSWORD_ITERATIONS,
    digest: PASSWORD_DIGEST,
  };
}

export function verifyPassword(password, record) {
  if (!record) return false;

  if (record.hash && record.salt) {
    const computed = crypto
      .pbkdf2Sync(
        password,
        record.salt,
        record.iterations || PASSWORD_ITERATIONS,
        64,
        record.digest || PASSWORD_DIGEST,
      )
      .toString("hex");

    const computedBuffer = Buffer.from(computed, "hex");
    const storedBuffer = Buffer.from(record.hash, "hex");

    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
  }

  if (typeof record === "string") {
    return record === password;
  }

  return false;
}

export function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifyToken(token, secret) {
  if (!token || !token.includes(".")) return null;

  const [body, signature] = token.split(".");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  if (
    !signature ||
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function randomSalt() {
  return crypto.randomBytes(16).toString("hex");
}
