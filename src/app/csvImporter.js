import Papa, { parse } from "papaparse";
import { notyf } from "../utilities/utility.js";
import { createUser } from "./users.js";
import {
  addProcedureToStation,
  addQuestionToStation,
} from "./stationManager.js";

export function importUsers(csvData, onComplete) {
  Papa.parse(csvData, {
    header: false,
    skipFirstNLines: 1,
    skipEmptyLines: true,
    complete: function (result) {
      // Expect 6 columns: surname, firstname, admissionNo, username, password, role.
      result.data.forEach((data) => {
        if (data.length !== 6) {
          notyf.error("Incomplete data, check the csv");
          return;
        }

        createUser(
          data[0],
          data[1],
          data[2],
          data[3],
          data[4],
          data[5],
          null,
          null,
        );
      });

      // this will serve as a callback to re-render the users table
      onComplete();

      notyf.success("user uploaded successfully");
    },
    error: function (error, result) {
      notyf.error(error.message);
    },
  });
}

export function importQuestions(csvData, whichStation, onComplete) {
  Papa.parse(csvData, {
    header: false,
    skipFirstNLines: 1,
    skipEmptyLines: true,
    complete: function (result) {
      // Expect 7 columns: description, option1-4, answer, mark.
      result.data.forEach((data) => {
        if (data.length !== 7) {
          notyf.error("Incomplete data, check the csv");

          return;
        }

        const description = data[0];
        const options = [data[1], data[2], data[3], data[4]];
        const answer = data[5];
        const mark = Number(data[6]);

        addQuestionToStation(whichStation, description, options, answer, mark);
      });

      // this will serve as a callback to re-render the questions
      onComplete();

      notyf.success(`${result.data.length} question(s) uploaded successfully`);
    },

    error: function (error, result) {
      notyf.error(error.message);
    },
  });
}

export function importProcedureItems(csvData, whichStation, onComplete) {
  Papa.parse(csvData, {
    header: false,
    skipFirstNLines: 1,
    skipEmptyLines: true,
    complete: function (result) {
      // Expect 2 columns: description and mark.
      result.data.forEach((data) => {
        if (data.length !== 2) {
          notyf.error("Incomplete data, check the csv");

          return;
        }

        const description = data[0];
        const scoreOptions = [0, Number(data[1])];

        const proc = addProcedureToStation(
          whichStation,
          description,
          scoreOptions,
        );
      });

      // this will serve as a callback to re-render the procedure items
      onComplete();

      notyf.success(
        `${result.data.length} procedure items uploaded successfully`,
      );
    },

    error: function (error, result) {
      notyf.error(error.message);
    },
  });
}
