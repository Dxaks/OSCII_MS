import { createResult, getAllResults, resetResults } from "./result.js";
import { createStation, getAllStations, resetStations } from "./stationManager.js";
import { createUser, getAllUsers, resetUsers } from "./users.js";
import {
  loadBootstrapSnapshot,
  syncResultsSnapshot,
} from "./backendApi.js";



// Rebuild station instances from the JSON snapshot stored in localStorage.
export async function retrieveStations() {
  await hydrateAppState();
  return true;
}



// Recreate users from localStorage so login continues to work after refresh.
export async function retrieveUsers() {
  await hydrateAppState();
  return true;
}

// Recreate result objects from localStorage and restore their progress state.
export async function retrieveResults() {
  await hydrateAppState();
  return true;
}

let hydrationPromise = null;

async function hydrateAppState() {
  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    try {
      const backendSnapshot = await loadBootstrapSnapshot();

      if (hasMeaningfulData(backendSnapshot)) {
        applySnapshot(backendSnapshot);

        return backendSnapshot;
      }
    } catch {
      // Continue to the local cache below.
    }

    const emptySnapshot = { users: [], stations: [], results: [] };
    applySnapshot(emptySnapshot);

    return emptySnapshot;
  })();

  return hydrationPromise;
}

function applySnapshot(snapshot) {
  resetStations();
  resetUsers();
  resetResults();

  const stations = normalizeStations(snapshot.stations);
  const users = Array.isArray(snapshot.users) ? snapshot.users : [];
  const results = normalizeResults(snapshot.results);

  stations.forEach((station) => {
    const stn = createStation(
      station.name,
      station.description,
      station.id,
      false,
    );

    Object.assign(stn, station);
  });

  users.forEach((user) => {
    createUser(
      user.surname,
      user.firstname,
      user.admissionNo,
      user.username,
      user.password ?? null,
      user.role,
      user.id,
      user.image,
      false,
    );
  });

  results.forEach((result) => {
    const resultConstructor = createResult(
      result.studentId,
      result.stationId,
      result.id,
      false,
    );

    Object.assign(resultConstructor, result);
  });
}


function hasAnyData(snapshot) {
  return (
    normalizeStations(snapshot?.stations).length > 0 ||
    Array.isArray(snapshot?.users) && snapshot.users.length > 0 ||
    normalizeResults(snapshot?.results).length > 0
  );
}

function hasMeaningfulData(snapshot) {
  if (!hasAnyData(snapshot)) {
    return false;
  }

  const users = Array.isArray(snapshot?.users) ? snapshot.users : [];
  const stations = normalizeStations(snapshot?.stations);
  const results = normalizeResults(snapshot?.results);

  if (stations.length > 0 || results.length > 0) {
    return true;
  }

  if (users.length === 0) {
    return false;
  }

  if (users.length === 1) {
    const [user] = users;
    return user.username !== "admin";
  }

  return true;
}


function normalizeStations(stations) {
  if (Array.isArray(stations)) return stations;
  if (stations && typeof stations === "object") return Object.values(stations);
  return [];
}


function normalizeResults(results) {
  if (Array.isArray(results)) return results;
  if (results && typeof results === "object") return Object.values(results);
  return [];
}
