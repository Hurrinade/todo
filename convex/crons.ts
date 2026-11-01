import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete completed todos older than two weeks",
  { hourUTC: 3, minuteUTC: 0 },
  internal.system.todoBatches.deleteExpiredCompletedTodos,
);

export default crons;
