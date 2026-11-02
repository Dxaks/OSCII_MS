function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sumScores(entries, fallback = 0) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return toFiniteNumber(fallback);
  }

  return entries.reduce((total, entry) => total + toFiniteNumber(entry?.score), 0);
}

export function getMaximumQuestionMarks(station) {
  return (station?.questions || []).reduce(
    (total, question) => total + Math.max(0, toFiniteNumber(question?.mark)),
    0,
  );
}

export function getMaximumProcedureMarks(station) {
  return (station?.procedureItems || []).reduce((total, item) => {
    const options = Array.isArray(item?.scoreOptions)
      ? item.scoreOptions.map(toFiniteNumber)
      : [];
    return total + (options.length ? Math.max(0, ...options) : 0);
  }, 0);
}

export function getQuestionMarksEarned(station, result) {
  if (!result) return 0;

  if (result.status?.question === "completed") {
    return sumScores(result.questionResults, result.questionTotal);
  }

  const answers = result.studentAnswers || {};
  const hasSavedAnswers = Object.keys(answers).length > 0;
  if (!hasSavedAnswers) {
    return sumScores(result.questionResults, result.questionTotal);
  }

  return (station?.questions || []).reduce((total, question) => {
    return answers[question.id] === question.answer
      ? total + Math.max(0, toFiniteNumber(question.mark))
      : total;
  }, 0);
}

export function getProcedureMarksEarned(station, result) {
  if (!result) return 0;

  if (result.status?.procedure === "completed") {
    return sumScores(result.procedureResults, result.procedureTotal);
  }

  const scores = result.procedureScores || {};
  const hasSavedScores = Object.keys(scores).length > 0;
  if (!hasSavedScores) {
    return sumScores(result.procedureResults, result.procedureTotal);
  }

  return (station?.procedureItems || []).reduce((total, item) => {
    const score = scores[item.id];
    return score == null ? total : total + toFiniteNumber(score);
  }, 0);
}

function getSavedMaximum(entries, fallbackMaximum) {
  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    entries.some(
      (entry) =>
        entry?.possibleMark == null ||
        !Number.isFinite(Number(entry.possibleMark)),
    )
  ) {
    return fallbackMaximum;
  }

  return entries.reduce(
    (total, entry) => total + Math.max(0, toFiniteNumber(entry.possibleMark)),
    0,
  );
}

export function getStationScoreMetrics(station, result) {
  const currentProcedureMaximum = getMaximumProcedureMarks(station);
  const currentQuestionMaximum = getMaximumQuestionMarks(station);
  const procedureMaximum = result?.status?.procedure === "completed"
    ? getSavedMaximum(result.procedureResults, currentProcedureMaximum)
    : currentProcedureMaximum;
  const questionMaximum = result?.status?.question === "completed"
    ? getSavedMaximum(result.questionResults, currentQuestionMaximum)
    : currentQuestionMaximum;
  const procedureEarned = getProcedureMarksEarned(station, result);
  const questionEarned = getQuestionMarksEarned(station, result);

  return {
    procedureEarned,
    procedureMaximum,
    procedurePercentage:
      procedureMaximum > 0 ? (procedureEarned / procedureMaximum) * 100 : null,
    questionEarned,
    questionMaximum,
    questionPercentage:
      questionMaximum > 0 ? (questionEarned / questionMaximum) * 100 : null,
    earned: procedureEarned + questionEarned,
    maximum: procedureMaximum + questionMaximum,
  };
}
