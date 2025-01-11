export class CreateScheduleDto {
    graphId: string;
    type: string;
    roomNumber: number;
    dayOfWeek: number;
    timeFrom: string;
    timeTo: string;
}