const API_PREFIX = "/api";
const TOKEN_KEY = "oscii_auth_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    headers = {},
    body,
    ...rest
  } = options;

  const requestHeaders = { ...headers };

  if (auth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let requestBody = body;

  if (body && typeof body === "object" && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function loadBootstrapSnapshot() {
  return apiRequest("/bootstrap", { auth: false, method: "GET" });
}

export async function saveBootstrapSnapshot(snapshot) {
  return apiRequest("/bootstrap", {
    auth: false,
    method: "POST",
    body: snapshot,
  });
}

export async function loginWithBackend(username, password) {
  return apiRequest("/auth/login", {
    auth: false,
    method: "POST",
    body: { username, password },
  });
}

export async function createUserRemote(payload) {
  return apiRequest("/users", {
    method: "POST",
    body: payload,
  });
}

export async function syncStationsSnapshot(stations) {
  return apiRequest("/stations/snapshot", {
    method: "POST",
    body: { stations: normalizeCollection(stations) },
  });
}

export async function createStationRemote(name, description) {
  return apiRequest("/stations", {
    method: "POST",
    body: { name, description },
  });
}

export async function deleteStationRemote(stationId) {
  return apiRequest(`/stations/${stationId}`, {
    method: "DELETE",
  });
}

export async function updateStationRemote(stationId, payload) {
  return apiRequest(`/stations/${stationId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function createQuestionRemote(stationId, payload) {
  return apiRequest(`/stations/${stationId}/questions`, {
    method: "POST",
    body: payload,
  });
}

export async function updateQuestionRemote(stationId, questionId, payload) {
  return apiRequest(`/stations/${stationId}/questions/${questionId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteQuestionRemote(stationId, questionId) {
  return apiRequest(`/stations/${stationId}/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function createProcedureItemRemote(stationId, payload) {
  return apiRequest(`/stations/${stationId}/procedure-items`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProcedureItemRemote(stationId, itemId, payload) {
  return apiRequest(`/stations/${stationId}/procedure-items/${itemId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteProcedureItemRemote(stationId, itemId) {
  return apiRequest(`/stations/${stationId}/procedure-items/${itemId}`, {
    method: "DELETE",
  });
}


export async function createResultRemote(payload) {
  return apiRequest("/results", {
    method: "POST",
    body: payload,
  });
}

export async function updateResultRemote(resultId, payload) {
  return apiRequest(`/results/${resultId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function syncUsersSnapshot(users) {
  return apiRequest("/users/snapshot", {
    method: "POST",
    body: { users: normalizeCollection(users) },
  });
}

export async function deleteUserRemote(userId) {
  return apiRequest(`/users/${userId}`, {
    method: "DELETE",
  });
}

export async function updateUserRemote(userId, payload) {
  return apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });
}

function normalizeCollection(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

async function readErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload.message || response.statusText;
  } catch {
    return response.statusText;
  }
}
