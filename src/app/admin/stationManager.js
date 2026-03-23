import { formatStr } from "../../utilities/utility.js";

const allStations = {};


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

    toogleChecklistTimer() {
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


   toogleQuestionsTimer() {
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
    // check for a station to avoid duplicate
    const formatName = formatStr(station.name);
    const checkStation = allStations[formatName];
    if (!checkStation) {
        allStations[formatName] = station;
        console.log(allStations)
        return true
    } else {
        alert(`${formatName} station already exist!!!`)
    }
};


class Checklist {
    constructor(description, mark) {
        this.id = crypto.randomUUID()
        this.description = description;
        this.mark = mark;
        this.checked = false;
    }
}

class Question {
    constructor(description, option, answer) {
        this.id = crypto.randomUUID();
        this.description = description;
        this.option = option;
        this.answer = answer;
        this.attempt = false;
    }
}

function addChecklistToStation(station, description, mark) {
    const checklist = new Checklist(description, mark);
    station.addChecklist(checklist);
};

function addQuestionToStation(station, description, option, answer) {
    const question = new Question(description, option, answer);
    station.addQuestion(question);
}