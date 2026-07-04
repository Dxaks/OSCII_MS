import { addResultToLocalStorage } from "./localStorage.js";
import { createResultRemote } from "./backendApi.js";
import { makeId } from "../utilities/id.js";

class ResultManagement {
  static allResults = {};

  // Keep result records in memory; localStorage mirrors this store for now.
  static saveResult(result) {
    this.allResults[result.id] = result;
    return true;
  }

  static getResult(resultId) {
    return this.allResults[resultId];
  }

  static getAllResults() {
    return this.allResults;
  }

  static reset() {
    this.allResults = {};
  }
}

class Result {
  constructor(studentId, stationId, id) {
    this.id = id || makeId();

    this.studentId = studentId;
    this.stationId = stationId;

    this.procedureResults = [];
    this.questionResults = [];

    this.procedureTotal = 0;
    this.questionTotal = 0;

    this.procedurePercentage = 0;
    this.questionPercentage = 0;

    this.status = {
      procedure: "in-progress",
      question: "in-progress",
    };

    this.studentAnswers = {};
    this.currentQuestionIndex = 0;
    this.timeRemaining = null;

    this.procedureTimeRemaining = null;
    this.procedureScores = {};
  }

  // Recalculate totals and percentages from the recorded scores.
  calculateTotal(totalProcedureMarks, totalQuestionMarks) {
    this.procedureTotal = this.procedureResults.reduce(
      (sum, item) => sum + item.score,
      0,
    );

    this.questionTotal = this.questionResults.reduce(
      (sum, item) => sum + item.score,
      0,
    );

    this.procedurePercentage =
      totalProcedureMarks > 0
        ? (this.procedureTotal / totalProcedureMarks) * 100
        : 0;

    this.questionPercentage =
      totalQuestionMarks > 0
        ? (this.questionTotal / totalQuestionMarks) * 100
        : 0;
  }
}

export function createResult(studentId, stationId, resultId, saveToLocal = true) {
  const result = new Result(studentId, stationId, resultId);

  ResultManagement.saveResult(result);

  // Hydration paths pass saveToLocal = false so restored records do not loop back.
  if (saveToLocal) {

    void createResultRemote({
      id: result.id,
      studentId: result.studentId,
      stationId: result.stationId,
      procedureResults: result.procedureResults,
      questionResults: result.questionResults,
      procedureTotal: result.procedureTotal,
      questionTotal: result.questionTotal,
      procedurePercentage: result.procedurePercentage,
      questionPercentage: result.questionPercentage,
      status: result.status,
    }).catch((error) => {
      console.error("Failed to create backend result:", error);
    });
  }

  return result;
}

export function getResult(resultId) {
  return ResultManagement.getResult(resultId);
}

export function getAllResults() {
  return ResultManagement.getAllResults();
}

export function resetResults() {
  ResultManagement.reset();
}

export function addProcedureScore(resultId, procedureId, score) {
  const result = ResultManagement.getResult(resultId);

  if (!result) return false;

  result.procedureResults.push({ procedureId, score });
  return true;
}

export function addQuestionScore(resultId, questionId, score) {
  const result = ResultManagement.getResult(resultId);

  if (!result) return false;

  result.questionResults.push({
    questionId,
    score,
  });

  return true;
}

export function calculateResult(
  resultId,
  totalProcedureMarks,
  totalQuestionMarks,
) {
  const result = ResultManagement.getResult(resultId);

  if (!result) return false;

  result.calculateTotal(totalProcedureMarks, totalQuestionMarks);

  return true;
}

export function getStudentResults(studentId, stationId) {
  return Object.values(ResultManagement.getAllResults()).find(
    (result) =>
      result.studentId === studentId && result.stationId === stationId,
  );
}

export function getStationResults(stationId) {
  return Object.values(ResultManagement.getAllResults()).filter(
    (result) => result.stationId === stationId,
  );
}

export function removeResultsByStudent(studentId) {
  const results = ResultManagement.getAllResults();
  let changed = false;

  for (const [resultId, result] of Object.entries(results)) {
    if (result.studentId === studentId) {
      delete results[resultId];
      changed = true;
    }
  }

  return changed;
}
