class Result {
  constructor(studentId, stationId) {
    this.id = crypto.randomUUID();
    this.studentId = studentId;
    this.stationId = stationId;
    this.checklistScores = [];
    this.questionScores = [];
    this.checklistTotal = 0;
    this.questionTotal = 0;
    this.grandTotal = 0;
  }

  calculateTotal() {
    this.checklistTotal = this.checklistScores.reduce((sum, item) => sum + item.score, 0);
    this.questionTotal = this.questionScores.reduce((sum, item) => sum + item.score, 0);
    this.grandTotal = this.checklistTotal + this.questionTotal;
  }
}