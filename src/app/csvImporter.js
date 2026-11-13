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
import { getProcedureScoreOptions } from "../../shared/scoring.js";

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

          const options = data.slice(1, 5).map((option) => option?.trim()).filter((option) => option !== "");

          // const options = [data[1], data[2], data[3], data[4]];

          const answer = data[5]?.trim();
          const mark = Number(data[6]);


          // Validate the question before sending it to the backend.
          if (!description) {
            notyf.error("Question description is required.");
            continue;
          }

          if (options.length < 2) {
            notyf.error(`"${description}" must have at least two options.`);
            continue;
          }

          if (!answer || !options.includes(answer)) {
            notyf.error(
              `The correct answer for "${description}" must match one of its options.`,
            );
            continue;
          }

          if (!Number.isFinite(mark) || mark <= 0) {
            notyf.error(`"${description}" has an invalid mark.`);
            continue;
          }


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

          const description = data[0]?.trim();
          const rawMark = data[1]?.trim();
          const maximumMark = Number(rawMark);
          if (
            !description ||
            rawMark === "" ||
            !Number.isFinite(maximumMark) ||
            maximumMark < 0
          ) {
            notyf.error("Each procedure row needs a description and a non-negative mark.");
            continue;
          }
          const kind = maximumMark === 0 ? "heading" : "scored";
          const scoreOptions = getProcedureScoreOptions(maximumMark);

          try {
            const response = await createProcedureItemRemote(stationId, {
              description,
              scoreOptions,
              kind,
            });

            addProcedureToStation(
              stationId,
              description,
              scoreOptions,
              response?.item?.id,
              kind,
            );
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
