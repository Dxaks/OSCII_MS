import { createStation, getAllStations } from "./stationManager.js";

// save station to localStorage

export function saveStationToLocalStorage(allStations) {

   let storage = localStorage.getItem("allStations");

   if(storage !== null) {
    console.log(allStations)
    localStorage.setItem("allStations", JSON.stringify(allStations));
   } 
   else {
    const stations = getAllStations()
    localStorage.setItem("allStations", JSON.stringify(stations));
   }
}


export function retrieveStationsFromLocalStorage() {

    const storage = localStorage.getItem("allStations");

    if (storage !== null) {

        console.log("retrieving station....")

        const allStations = JSON.parse(storage);

        console.log(allStations)
        Object.values(allStations).forEach((station) => {
            const stn = createStation(station.name, station.description, station.id);

            Object.assign(stn, station)

        })

        return true;
    }
    return false;
}