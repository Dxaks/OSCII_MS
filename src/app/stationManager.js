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

  static getStation(stationName) {
    const stationKey = formatStr(stationName);
    return this.allStations[stationKey];
  }

  static getAllStations() {
    return this.allStations;
  }
}


class Station {
    constructor(name) {
        this.name = name;
        this.checklistItems = [];
        this.questions = [];

        this.questionTimer = {
            enabled: false,
            duration: 0 
        };

        this.checklistTimer = {
            enabled: false,
            duration: 0
        }
    }

    addChecklist(item) {
        this.checklistItems.push(item);
    }

    addQuestion(question) {
        this.questions.push(question);
    }

    toggleChecklistTimer() {
        if(!this.checklistTimer.enabled) {
            this.checklistTimer.enabled = true;
        } else {
            this.checklistTimer.enabled = false;
            this.checklistTimer.duration = 0;
        }
    }

   setChecklistTimer(seconds) {
        this.checklistTimer.duration = seconds;
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


export function createStation(name) {
    const station = new Station(name);
    return station;
};


export function saveStation(station) {

   return StationManagement.saveStation(station);

};

export function getStation(stationName) {
  return StationManagement.getStation(stationName);
}

export function getAllStations() {
  return StationManagement.getAllStations();
}


class Checklist {
    constructor(description, mark) {
        this.id = crypto.randomUUID()
        this.description = description;
        this.mark = mark;
        this.checked = false;
    }
}


class Question {
    constructor(description, options, answer, mark) {
        this.id = crypto.randomUUID();
        this.description = description;
        this.options = options;
        this.answer = answer;
        this.mark = mark;
        this.attempt = false;
    }
}


export function addChecklistToStation(stationName, description, mark) {
  const station = StationManagement.getStation(stationName);

  if (!station) {
    alert("Station not found");
    return false;
  }

  const checklist = new Checklist(description, mark);
  station.addChecklist(checklist);
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