import { createResult, getAllResults } from "./result.js";
import { createStation, getAllStations } from "./stationManager.js";
import { createUser, getAllUsers } from "./users.js";

// Serialize the current station store so the browser can restore it on reload.
export function saveStationToLocalStorage() {
  const stations = getAllStations();
  localStorage.setItem("allStations", JSON.stringify(stations));
}

// Rebuild station instances from the JSON snapshot stored in localStorage.
export function retrieveStationsFromLocalStorage() {
  const storage = localStorage.getItem("allStations");

  if (storage) {
    const allStations = JSON.parse(storage);

    Object.values(allStations).forEach((station) => {
      const stn = createStation(
        station.name,
        station.description,
        station.id,
        false,
      );

      Object.assign(stn, station);
    });

    return true;
  }
  return false;
}

// Persist the current user store to localStorage.
export function addUserToLocalStorage() {
  const allUsers = getAllUsers();

  if (allUsers) {
    localStorage.setItem("allUsers", JSON.stringify(allUsers));
  }
}

// Recreate users from localStorage so login continues to work after refresh.
export function retrieveUsers() {
  const allUsers = localStorage.getItem("allUsers");

  if (allUsers !== null) {
    const myUsers = JSON.parse(allUsers);

    Object.values(myUsers).forEach((user) => {
      const userConstructor = createUser(
        user.surname,
        user.firstname,
        user.admissionNo,
        user.username,
        user.password,
        user.role,
        user.id,
        null,
        false,
      );
    });
  }
}

// Persist assessment results so in-progress work is not lost on refresh.
export function addResultToLocalStorage() {
  const results = getAllResults();

  localStorage.setItem("allResults", JSON.stringify(results));

  return true;
}

// Recreate result objects from localStorage and restore their progress state.
export function retrieveResults() {
  const results = localStorage.getItem("allResults");

  if (results) {
    const localResult = JSON.parse(results);

    Object.values(localResult).forEach((result) => {
      const resultConstructor = createResult(
        result.studentId,
        result.stationId,
        result.id,
        false,
      );

      Object.assign(resultConstructor, result);
    });
  }
}
