import { formatStr, notyf, updateResult } from "../utilities/utility.js";
import { makeId } from "../utilities/id.js";
import { saveStationToLocalStorage } from "./localStorage.js";
import { getAllResults } from "./result.js";
import {
  updateStationRemote,
  deleteStationRemote,
  updateQuestionRemote,
  deleteQuestionRemote,
  updateProcedureItemRemote,
  deleteProcedureItemRemote,
} from "./backendApi.js";

class StationManagement {
  static allStations = {};

  // Stations are keyed by a normalized name so the UI can look them up fast.
  static saveStation(station) {
    const stationKey = formatStr(station.name);

    if (this.allStations[stationKey]) {
      notyf.error(`${station.name} already exist`);
      return false;
    }

    this.allStations[stationKey] = station;
    return true;
  }

  static getStationById(id) {
    return Object.values(this.allStations).find((station) => station.id === id);
  }

  static getStation(stationName) {
    const stationKey = formatStr(stationName);
    return this.allStations[stationKey];
  }

  static getAllStations() {
    return this.allStations;
  }

  static reset() {
    this.allStations = {};
  }
}

class Station {
  constructor(name, description, id) {
    this.name = name;
    this.description = description;
    this.id = id || makeId();
    this.procedureItems = [];
    this.questions = [];

    this.questionTimer = {
      enabled: false,
      duration: 0,
    };

    this.procedureTimer = {
      enabled: false,
      duration: 0,
    };
  }

  addProcedure(item) {
    this.procedureItems.push(item);
  }

  addQuestion(question) {
    this.questions.push(question);
  }

  toggleProcedureTimer() {
    if (!this.procedureTimer.enabled) {
      this.procedureTimer.enabled = true;
    } else {
      this.procedureTimer.enabled = false;
      this.procedureTimer.duration = 0;
    }
  }

  setProcedureTimer(seconds) {
    this.procedureTimer.duration = seconds;
  }

  toggleQuestionsTimer() {
    if (!this.questionTimer.enabled) {
      this.questionTimer.enabled = true;
    } else {
      this.questionTimer.enabled = false;
      this.questionTimer.duration = 0;
    }
  }
  setQuestionsTimer(seconds) {
    this.questionTimer.duration = seconds;
  }
}

export function createStation(name, description, id, saveToLocal = true) {
  const station = new Station(name, description, id);
  StationManagement.saveStation(station);

  return station;
}

export function getStation(stationName) {
  return StationManagement.getStation(stationName);
}

export function getStationById(id) {
  return StationManagement.getStationById(id);
}

export function getAllStations() {
  return StationManagement.getAllStations();
}

export function resetStations() {
  StationManagement.reset();
}

class ProcedureItem {
  constructor(description, scoreOptions) {
    this.id = makeId();
    this.description = description;
    this.scoreOptions = scoreOptions;
  }
}

class Question {
  constructor(description, options, answer, mark, id) {
    this.id = id || makeId();
    this.description = description;
    this.options = options;
    this.answer = answer;
    this.mark = mark;
  }
}

export function addProcedureToStation(stationId, description, scoreOptions) {
  // const station = StationManagement.getStation(stationName);
  const station = StationManagement.getStationById(stationId)

  const procedureItem = new ProcedureItem(description, scoreOptions);
  station.addProcedure(procedureItem);

  return true;
}

export function addQuestionToStation(
  stationId,
  description,
  options,
  answer,
  mark,
) {
  const station = StationManagement.getStationById(stationId)

  const question = new Question(description, options, answer, mark);
  station.addQuestion(question);

  return true;
}

export async function toggleProcedureTimer(stationId) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.toggleProcedureTimer();

  await persistStationTimers(station);
  return true;
}

export async function setProcedureTimerDuration(stationId, seconds) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.setProcedureTimer(seconds);

  await persistStationTimers(station);
  return true;
}

export async function setQuestionTimerDuration(stationId, seconds) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.setQuestionsTimer(seconds);

  await persistStationTimers(station);
  return true;
}

export async function toggleQuestionTimer(stationId) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.toggleQuestionsTimer();

  await persistStationTimers(station);
  return true;
}

export async function updateProcedureItem(
  stationId,
  procedureId,
  description,
  scoreOptions,
) {
  const station = StationManagement.getStationById(stationId);
  if (!station) return false;

  const procedureItem = station.procedureItems.find(
    (item) => item.id === procedureId,
  );

  if (!procedureItem) return false;

  procedureItem.description = description;
  procedureItem.scoreOptions = scoreOptions;

  try {
    await updateProcedureItemRemote(stationId, procedureId, {
      description,
      scoreOptions,
    });
  } catch (error) {
    notyf.error(error.message || "Failed to update procedure item");
  }

  return true;
}

export async function deleteProcedureItem(stationId, procedureId) {
  const station = StationManagement.getStationById(stationId);
  if (!station) return false;

  station.procedureItems = station.procedureItems.filter(
    (item) => item.id !== procedureId,
  );

  try {
    await deleteProcedureItemRemote(stationId, procedureId);
  } catch (error) {
    notyf.error(error.message || "Failed to delete procedure item");
  }

  return true;
}

export async function updateQuestionItem(
  stationId,
  questionId,
  description,
  options,
  answer,
  mark,
) {
  const station = StationManagement.getStationById(stationId);
  if (!station) return false;

  const question = station.questions.find((item) => item.id === questionId);

  if (!question) return false;

  question.description = description;
  question.options = options;
  question.answer = answer;
  question.mark = mark;

  try {
    await updateQuestionRemote(stationId, questionId, {
      description,
      options,
      answer,
      mark,
    });
  } catch (error) {
    notyf.error(error.message || "Failed to update question");
  }

  return true;
}

export async function deleteQuestionItem(stationId, questionId) {
  const station = StationManagement.getStationById(stationId);
  if (!station) return false;

  station.questions = station.questions.filter(
    (question) => question.id !== questionId,
  );


  try {
    await deleteQuestionRemote(stationId, questionId);
  } catch (error) {
    notyf.error(error.message || "Failed to delete question");
  }

  return true;
}

export async function deleteStation(stationId) {
  const station = getStationById(stationId);
  if (!station) {
    return false;
  }

  const stationProp = formatStr(station.name);
  const allStations = getAllStations();

  // Remove the station from the in-memory store.
  delete allStations[stationProp];

  // Cascade delete related results because they no longer belong to a valid station.
  const results = getAllResults();

  for (const key in results) {
    const stationReslt = results[key];
    if (stationReslt.stationId === stationId) {
      delete results[key];
    }
  }

  try {
    await deleteStationRemote(stationId);
  } catch (error) {
    notyf.error(error.message || "Failed to delete station on backend");
  }

  return true;
}

async function persistStationTimers(station) {
  try {
    await updateStationRemote(station.id, {
      questionTimer: station.questionTimer,
      procedureTimer: station.procedureTimer,
    });
  } catch (error) {
    notyf.error(error.message || "Failed to update station timers");
  }
}
