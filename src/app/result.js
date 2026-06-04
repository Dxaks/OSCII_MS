class ResultManagement {

    static allResults = {};

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

}



class Result {
  constructor(studentId, stationId) {
    this.id = crypto.randomUUID();

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
        question: "in-progress"
    }

    this.studentAnswers = {};

    this.currentQuestionIndex = 0;

    this.timeRemaining = null;

  }

  calculateTotal(totalProcedureMarks, totalQuestionMarks) {

    this.procedureTotal =
      this.procedureResults.reduce(
        (sum, item) => sum + item.score,
        0
      );

    this.questionTotal =
      this.questionResults.reduce(
        (sum, item) => sum + item.score,
        0
      );

    this.procedurePercentage = totalProcedureMarks > 0
        ? (this.procedureTotal / totalProcedureMarks) * 100 : 0;

    //   (this.procedureTotal /
    //    totalProcedureMarks) * 100;

    this.questionPercentage = totalQuestionMarks > 0
        ? (this.questionTotal / totalQuestionMarks) * 100 : 0;

    //   (this.questionTotal /
    //    totalQuestionMarks) * 100;
  }
}




export function createResult(studentId,stationId) {

    const result = new Result(studentId, stationId);

    ResultManagement.saveResult(result);

    return result;
}


export function getResult(resultId) {
    return ResultManagement.getResult(resultId);
}


export function getAllResults() {
    return ResultManagement.getAllResults();
}


export function addProcedureScore(resultId, procedureId, score) {

    const result = ResultManagement.getResult(resultId);

    if (!result) return false;

    result.procedureResults.push({procedureId, score});
    return true;
}


export function addQuestionScore(resultId, questionId, score) {

    const result = ResultManagement.getResult(resultId);

    if (!result) return false;

    result.questionResults.push({
        questionId,
        score
    });

    return true;
}



export function calculateResult(
    resultId,
    totalProcedureMarks,
    totalQuestionMarks
) {

    const result =
      ResultManagement.getResult(
        resultId
      );

    if (!result) return false;

    result.calculateTotal(
        totalProcedureMarks,
        totalQuestionMarks
    );

    return true;
}



export function getStudentResults(studentId, stationId) {

    return Object.values(
        ResultManagement.getAllResults()
    ).find(result => result.studentId === studentId && result.stationId === stationId);
}




export function getStationResults(
    stationId
) {

    return Object.values(
        ResultManagement.getAllResults()
    ).filter(
        result =>
        result.stationId === stationId
    );
}


