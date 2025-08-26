// Main library exports for the Nookal API Client

export { NookalClient, createNookalClientFromEnv } from "./nookal-client";
export type {
  AddTreatmentNoteParams,
  Appointment,
  BaseQueryParams,
  GetAppointmentsParams,
  GetLocationsParams,
  GetPatientsParams,
  GetPractitionersParams,
  GetTreatmentNotesParams,
  Location,
  NookalApiConfig,
  NookalApiResponse,
  Patient,
  Practitioner,
  QueryParameters,
  TreatmentNote,
} from "./types.js";
export {
  formatDate,
  formatDateTime,
  getDateRange,
  loadEnvFile,
  parseDate,
  prettyPrint,
  retry,
  sanitiseForLogging,
  sleep,
} from "./utils";
