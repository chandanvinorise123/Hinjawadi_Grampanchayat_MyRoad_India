import { getHomeComplaintMapPinType } from "./homeComplaintMapPinType";

const parseDate = (value) => {
  if (!value) return null;

  const dateOnly = typeof value === "string"
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    : null;
  const reportedAt = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(value);

  return Number.isNaN(reportedAt.getTime()) ? null : reportedAt;
};

export const getComplaintReportedDate = (complaint) =>
  parseDate(complaint.createdAt) || parseDate(complaint.date);

export const getComplaintAgeInDays = (complaint, today = new Date()) => {
  const reportedAt = getComplaintReportedDate(complaint);
  if (!reportedAt) return null;

  const reportedDay = Date.UTC(
    reportedAt.getFullYear(),
    reportedAt.getMonth(),
    reportedAt.getDate()
  );
  const currentDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return Math.max(0, Math.floor((currentDay - reportedDay) / 86_400_000));
};

const subtractCalendarMonths = (date, months) => {
  const result = new Date(date);
  const dayOfMonth = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() - months);
  const lastDayOfMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();
  result.setDate(Math.min(dayOfMonth, lastDayOfMonth));
  return result;
};

const getReportedRange = (range, today = new Date()) => {
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff15Days = new Date(startOfToday);
  cutoff15Days.setDate(cutoff15Days.getDate() - 15);
  const cutoff1Month = subtractCalendarMonths(startOfToday, 1);
  const cutoff3Months = subtractCalendarMonths(startOfToday, 3);
  const cutoff6Months = subtractCalendarMonths(startOfToday, 6);

  switch (range) {
    case "15days":
      return { from: cutoff15Days, through: endOfToday };
    case "1month":
      return { from: cutoff1Month, through: endOfToday };
    case "3months":
      return { from: cutoff3Months, through: endOfToday };
    case "6months":
      return { from: cutoff6Months, through: endOfToday };
    default:
      return null;
  }
};

export const isWithinReportedRange = (
  complaint,
  range,
  today = new Date()
) => {
  const reportedAt = getComplaintReportedDate(complaint);
  if (!reportedAt && range === "all") return true;

  const reportedRange = getReportedRange(
    range === "all" ? "6months" : range,
    today
  );
  if (!reportedAt || !reportedRange) return false;

  return reportedAt >= reportedRange.from &&
    reportedAt <= reportedRange.through;
};

export const filterHomeComplaints = (
  complaints,
  range,
  status,
  today = new Date()
) =>
  complaints.filter((complaint) =>
    isWithinReportedRange(complaint, range, today) &&
    (status === "all" || getHomeComplaintMapPinType(complaint) === status)
  );
