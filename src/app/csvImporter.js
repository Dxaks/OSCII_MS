import Papa, { parse } from "papaparse";
import { notyf, withLoadingOverlay } from "../utilities/utility.js";
import { createUser } from "./users.js";
import { addUserToLocalStorage } from "./localStorage.js";
import {
  addProcedureToStation,
  addQuestionToStation,
} from "./stationManager.js";
import {
  createUserRemote,
  createQuestionRemote,
  createProcedureItemRemote,
} from "./backendApi.js";

export function importUsers(csvData, onComplete) {
  Papa.parse(csvData, {
    header: false,
    skipFirstNLines: 1,
    skipEmptyLines: true,
    complete: function (result) {
      // Expect 6 columns: surname, firstname, admissionNo, username, password, role.
      withLoadingOverlay("Importing users", async () => {
        for (const data of result.data) {
          if (data.length !== 6) {
            notyf.error("Incomplete data, check the csv");
            continue;
          }

          try {
            const payload = {
              surname: data[0],
              firstname: data[1],
              admissionNo: data[2],
              username: data[3],
              password: data[4],
              role: data[5],
              image: "",
            };

            const response = await createUserRemote(payload);

            createUser(
              response.user.surname,
              response.user.firstname,
              response.user.admissionNo,
              response.user.username,
              null,
              response.user.role,
              response.user.id,
              response.user.image,
              false,
            );
          } catch (error) {
            notyf.error(error.message || "Failed to upload a user");
          }
        }

        onComplete();
        notyf.success("user uploaded successfully");
      }).catch((error) => {
        notyf.error(error.message || "Failed to upload users");
      });
    },
    error: function (error, result) {
      notyf.error(error.message);
    },
  });
}

export function importQuestions(csvData, stationId, onComplete) {
  Papa.parse(csvData, {
    header: false,
    skipFirstNLines: 1,
    skipEmptyLines: true,
    complete: function (result) {
      // Expect 7 columns: description, option1-4, answer, mark.
      withLoadingOverlay("Importing questions", async () => {
        for (const data of result.data) {
          if (data.length !== 7) {
            notyf.error("Incomplete data, check the csv");
            continue;
          }

          const description = data[0];
          const options = [data[1], data[2], data[3], data[4]];
          const answer = data[5];
          const mark = Number(data[6]);

          try {
            await createQuestionRemote(stationId, {
              description,
              options,
              answer,
              mark,
            });

            addQuestionToStation(stationId, description, options, answer, mark);
          } catch (error) {
            notyf.error(error.message || "Failed to upload a question");
          }
        }

        onComplete();
        notyf.success(`${result.data.length} question(s) uploaded successfully`);
      }).catch((error) => {
        notyf.error(error.message || "Failed to upload questions");
      });
    },

    error: function (error, result) {
      notyf.error(error.message);
    },
  });
}

export function importProcedureItems(csvData, stationId, onComplete) {
  Papa.parse(csvData, {
    header: false,
    skipFirstNLines: 1,
    skipEmptyLines: true,
    complete: function (result) {
      // Expect 2 columns: description and mark.
      withLoadingOverlay("Importing procedure items", async () => {
        for (const data of result.data) {
          if (data.length !== 2) {
            notyf.error("Incomplete data, check the csv");
            continue;
          }

          const description = data[0];
          const scoreOptions = [0, Number(data[1])];

          try {
            await createProcedureItemRemote(stationId, {
              description,
              scoreOptions,
            });

            addProcedureToStation(stationId, description, scoreOptions);
          } catch (error) {
            notyf.error(error.message || "Failed to upload a procedure item");
          }
        }

        onComplete();
        notyf.success(
          `${result.data.length} procedure items uploaded successfully`,
        );
      }).catch((error) => {
        notyf.error(error.message || "Failed to upload procedure items");
      });
    },

    error: function (error, result) {
      notyf.error(error.message);
    },
  });
}
