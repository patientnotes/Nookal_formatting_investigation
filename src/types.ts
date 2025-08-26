// Nookal API Response Types

export interface NookalApiResponse<T = unknown> {
  status: "success" | "failure";
  data?: T;
  message?: string;
  error?: string;
  details?: {
    errorMessage?: string;
    errorCode?: string;
  };
}

export interface Patient {
  ID: string;
  FirstName: string;
  LastName: string;
  Email?: string;
  Mobile?: string;
  Phone?: string;
  DateOfBirth?: string;
  Gender?: "M" | "F" | "O";
  Address?: string;
  Suburb?: string;
  State?: string;
  Postcode?: string;
  Country?: string;
  EmergencyContact?: string;
  EmergencyPhone?: string;
  MedicalAlerts?: string;
  PrivateHealthFund?: string;
  PrivateHealthNumber?: string;
  Medicare?: string;
  Occupation?: string;
  Employer?: string;
  ReferralSource?: string;
  Notes?: string;
  CreatedDate?: string;
  ModifiedDate?: string;
  Status?: string;
}

export interface TreatmentNote {
  ID: string;
  PatientID: string;
  CaseID: string;
  PractitionerID: string;
  AppointmentID?: string;
  Date: string;
  Notes: string;
  CreatedDate?: string;
  ModifiedDate?: string;
}

export interface Practitioner {
  ID: string;
  FirstName: string;
  LastName: string;
  Email?: string;
  Mobile?: string;
  Phone?: string;
  Title?: string;
  Speciality?: string;
  RegistrationNumber?: string;
  ShowInOnlineBooking?: boolean;
  Status?: string;
  CreatedDate?: string;
  ModifiedDate?: string;
}

export interface Location {
  ID: string;
  Name: string;
  Address?: string;
  Suburb?: string;
  State?: string;
  Postcode?: string;
  Country?: string;
  Phone?: string;
  Email?: string;
  TimeZone?: string;
  Status?: string;
  CreatedDate?: string;
  ModifiedDate?: string;
}

export interface Appointment {
  ID: string;
  PatientID: string;
  PractitionerID: string;
  LocationID: string;
  AppointmentType?: string;
  StartTime: string;
  EndTime: string;
  Duration: number;
  Status: string;
  Notes?: string;
  InternalNotes?: string;
  ArrivalTime?: string;
  CancelledDate?: string;
  CancellationReason?: string;
  CreatedDate?: string;
  ModifiedDate?: string;
}

export interface NookalApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface QueryParameters {
  [key: string]: string | number | boolean | undefined;
}

// Common query parameters that might be used across endpoints
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  locationID?: string;
}

export interface GetPatientsParams extends BaseQueryParams {
  patientID?: string;
  email?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  page_length?: number;
}

export interface GetAppointmentsParams extends BaseQueryParams {
  appointmentID?: string;
  patientID?: string;
  practitionerID?: string;
  status?: string;
  page_length?: number;
}

export interface GetPractitionersParams extends BaseQueryParams {
  practitionerID?: string;
  showInOnlineBooking?: boolean;
}

export interface GetLocationsParams extends BaseQueryParams {
  locationID?: string;
}

export interface GetTreatmentNotesParams extends BaseQueryParams {
  page?: number;
  page_length?: number;
  last_modified?: string;
}

export interface AddTreatmentNoteParams {
  patientId: number;
  caseId: number;
  practitionerId: number;
  date: string; // Format: YYYY-MM-DD HH:ii:ss
  notes: string;
  apptId?: number;
}

export interface GetCasesParams extends BaseQueryParams {
  page?: number;
  page_length?: number;
  last_modified?: string;
}

export interface GetAllTreatmentNotesParams {
  page?: number;
  page_length?: number; // Max 50 for getAllTreatmentNotes
  last_modified?: string;
  practitioner_id?: string;
}

// Common Nookal error codes
export type NookalErrorCode =
  | "L003" // Unable to retrieve locations
  | "L004" // Unable to retrieve practitioners
  | "L005" // Unable to retrieve patients
  | "L006" // Unable to retrieve appointments
  | "L007" // Unable to retrieve treatment notes
  | "UNKNOWN";

export interface NookalError {
  errorMessage: string;
  errorCode: NookalErrorCode;
}
