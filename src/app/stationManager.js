import { formatStr } from "../utilities/utility.js";

class StationManagement {
  static allStations = {};

  static saveStation(station) {
    const stationKey = formatStr(station.name);

    if (this.allStations[stationKey]) {
      alert(`${station.name} already exists`);
      return false;
    }

    this.allStations[stationKey] = station;
    return true;
  }

  static getStationById(id) {
    return Object.values(this.allStations)
    .find((station) => station.id === id);
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
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.id = crypto.randomUUID()
        this.procedureItems = [];
        this.questions = [];

        this.questionTimer = {
            enabled: false,
            duration: 0 
        };

        this.procedureTimer = {
            enabled: false,
            duration: 0
        }
    }

    addProcedure(item) {
        this.procedureItems.push(item);
    }

    addQuestion(question) {
        this.questions.push(question);
    }

    toggleProcedureTimer() {
        if(!this.procedureTimer.enabled) {
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

};


export function createStation(name, description) {
    const station = new Station(name, description);
    return station;
};


export function saveStation(station) {

   return StationManagement.saveStation(station);

};


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
        this.id = crypto.randomUUID()
        this.description = description;
        this.scoreOptions = scoreOptions;
        this.selectedScore = null;
    }
}


class Question {
    constructor(description, options, answer, mark) {
        this.id = crypto.randomUUID();
        this.description = description;
        this.options = options;
        this.answer = answer;
        this.mark = mark;
    }
}


export function addProcedureToStation(stationName, description, scoreOptions) {
  const station = StationManagement.getStation(stationName);

  if (!station) {
    alert("Station not found");
    return false;
  }

  const procedureItem = new ProcedureItem(description, scoreOptions);
  station.addProcedure(procedureItem);
  return true;
}


export function addQuestionToStation(stationName, description, options, answer, mark) {
  const station = StationManagement.getStation(stationName);

  if (!station) {
    alert("Station not found");
    return false;
  }

  const question = new Question(description, options, answer, mark);
  station.addQuestion(question);
  return true;
}