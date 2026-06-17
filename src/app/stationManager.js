import { formatStr, notyf, updateResult } from "../utilities/utility.js";
import { saveStationToLocalStorage } from "./localStorage.js";
import { getAllResults } from "./result.js";

class StationManagement {
  static allStations = {};

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
}

class Station {
  constructor(name, description, id) {
    this.name = name;
    this.description = description;
    this.id = id || crypto.randomUUID();
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

  if (saveToLocal) {
    saveStationToLocalStorage();
  }

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

class ProcedureItem {
  constructor(description, scoreOptions) {
    this.id = crypto.randomUUID();
    this.description = description;
    this.scoreOptions = scoreOptions;
  }
}

class Question {
  constructor(description, options, answer, mark, id) {
    this.id = id || crypto.randomUUID();
    this.description = description;
    this.options = options;
    this.answer = answer;
    this.mark = mark;
  }
}

export function addProcedureToStation(stationName, description, scoreOptions) {
  const station = StationManagement.getStation(stationName);

  const procedureItem = new ProcedureItem(description, scoreOptions);
  station.addProcedure(procedureItem);

  saveStationToLocalStorage();
  return true;
}

export function addQuestionToStation(
  stationName,
  description,
  options,
  answer,
  mark,
) {
  const station = StationManagement.getStation(stationName);

  const question = new Question(description, options, answer, mark);
  station.addQuestion(question);

  saveStationToLocalStorage();
  return true;
}

export function toggleProcedureTimer(stationId) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.toggleProcedureTimer();

  saveStationToLocalStorage();
  return true;
}

export function setProcedureTimerDuration(stationId, seconds) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.setProcedureTimer(seconds);

  saveStationToLocalStorage();
  return true;
}

export function setQuestionTimerDuration(stationId, seconds) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.setQuestionsTimer(seconds);

  saveStationToLocalStorage();
  return true;
}

export function toggleQuestionTimer(stationId) {
  const station = StationManagement.getStationById(stationId);

  if (!station) return false;

  station.toggleQuestionsTimer();

  saveStationToLocalStorage();
  return true;
}

export function deleteStation(stationId) {
  const station = getStationById(stationId);
  if (!station) {
    return;
  }

  const stationProp = formatStr(station.name);
  const allStations = getAllStations();

  // delete the target station
  delete allStations[stationProp];

  // now check if there are any results in this station and delete it
  const results = getAllResults();

  for (const key in results) {
    const stationReslt = results[key];
    if (stationReslt.stationId === stationId) {
      delete results[key];
    }
  }

  saveStationToLocalStorage();
  updateResult();
}
