export class VizPointsDto {
  freeVizPoints: number;
  usedFreeCredit = 0;
  subscriptionVizPoints: number;
  usedPaidCredit = 0;

  constructor(
    freeVizPoints: number,
    subscriptionVizPoints: number,
    usedFreeCredit?: number,
    usedPaidCredit?: number,
  ) {
    this.freeVizPoints = freeVizPoints;
    this.subscriptionVizPoints = subscriptionVizPoints;
    this.usedFreeCredit = usedFreeCredit ?? 0;
    this.usedPaidCredit = usedPaidCredit ?? 0;
  }
}
