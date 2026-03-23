import { formatStr } from "../../utilities/utility.js";

const allStations = {};


class Station {
    constructor(name) {
        this.name = name;
        this.checkListItem = [];
        this.test = [];
    }

    addCheckList(item) {
        this.checkListItem.push(item);
    }

    addQuestion(question) {
        this.test.push(question);
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