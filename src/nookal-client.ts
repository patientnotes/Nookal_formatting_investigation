import type {
  Appointment,
  AddTreatmentNoteParams,
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

// Nookal's actual response format
interface NookalActualResponse<T = unknown> {
  status: "success" | "failure";
  data?: {
    api_call: string;
    results: T;
  };
  details?: {
    errorMessage?: string;
    errorCode?: string;
    totalItems?: string;
    currentItems?: number;
  };
  settings?: {
    currentPage: number;
    nextPage: number | null;
    pageLength: number;
  };
  message?: string;
  error?: string;
}

export class NookalClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NookalApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: QueryParameters): string {
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    // Always add the API key
    url.searchParams.set("api_key", this.apiKey);

    // Add other parameters if they exist and are not undefined
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Make HTTP request to Nookal API
   */
  private async makeRequest<T>(
    endpoint: string,
    params?: QueryParameters,
    options: {
      method?: "GET" | "POST";
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    const { method = "GET", body } = options;

    let url: string;
    let requestInit: RequestInit;

    if (method === "GET") {
      url = this.buildUrl(endpoint, params);
      requestInit = {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json; charset=utf-8",
          "User-Agent": "Nookal-Client/1.0.0",
        },
      };
    } else {
      // For POST requests, put API key and other params in the body
      url = `${this.baseUrl}/${endpoint}`;
      const postData = {
        api_key: this.apiKey,
        ...params,
        ...body,
      };

      const bodyString = new URLSearchParams(
        Object.entries(postData).reduce(
          (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value);
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString();

      requestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Content-Length": bodyString.length.toString(),
          "User-Agent": "Nookal-Client/1.0.0",
        },
        body: bodyString,
      };
    }

    try {
      const response = await fetch(url, requestInit);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      let data: NookalActualResponse<T>;
      try {
        data = JSON.parse(responseText) as NookalActualResponse<T>;
      } catch (parseError) {
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 200)}`,
        );
      }

      if (data.status !== "success") {
        const errorMessage =
          data.details?.errorMessage ||
          data.error ||
          data.message ||
          "Unknown error";
        const errorCode = data.details?.errorCode || "UNKNOWN";
        throw new Error(`API Error [${errorCode}]: ${errorMessage}`);
      }

      return data.data?.results || ([] as unknown as T);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Nookal API request failed: ${error.message}`);
      }
      throw new Error("Nookal API request failed: Unknown error");
    }
  }

  /**
   * Get patients from Nookal API
   */
  async getPatients(params?: GetPatientsParams): Promise<Patient[]> {
    const result = await this.makeRequest<{ patients: Patient[] }>(
      "getPatients",
      params,
    );
    return result.patients || [];
  }

  /**
   * Get a specific patient by ID
   */
  async getPatient(patientId: string): Promise<Patient[]> {
    return this.getPatients({ patientID: patientId });
  }

  /**
   * Get appointments from Nookal API
   */
  async getAppointments(
    params?: GetAppointmentsParams,
  ): Promise<Appointment[]> {
    const result = await this.makeRequest<{ appointments: Appointment[] }>(
      "getAppointments",
      params,
    );
    return result.appointments || [];
  }

  /**
   * Get a specific appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<Appointment[]> {
    return this.getAppointments({ appointmentID: appointmentId });
  }

  /**
   * Get practitioners from Nookal API
   */
  async getPractitioners(
    params?: GetPractitionersParams,
  ): Promise<Practitioner[]> {
    const result = await this.makeRequest<{ practitioners: Practitioner[] }>(
      "getPractitioners",
      params,
    );
    return result.practitioners || [];
  }

  /**
   * Get a specific practitioner by ID
   */
  async getPractitioner(practitionerId: string): Promise<Practitioner[]> {
    return this.getPractitioners({ practitionerID: practitionerId });
  }

  /**
   * Get locations from Nookal API
   */
  async getLocations(params?: GetLocationsParams): Promise<Location[]> {
    const result = await this.makeRequest<{ locations: Location[] }>(
      "getLocations",
      params,
    );
    return result.locations || [];
  }

  /**
   * Get a specific location by ID
   */
  async getLocation(locationId: string): Promise<Location[]> {
    return this.getLocations({ locationID: locationId });
  }

  /**
   * Get treatment notes for a specific patient from Nookal API
   * Note: patient_id is required for this endpoint
   */
  async getTreatmentNotes(
    params: { patientID: string } & GetTreatmentNotesParams,
  ): Promise<TreatmentNote[]> {
    const result = await this.makeRequest<{ notes: TreatmentNote[] }>(
      "getTreatmentNotes",
      { patient_id: params.patientID, ...params },
    );
    return result.notes || [];
  }

  /**
   * Get all treatment notes from Nookal API
   * Note: This endpoint doesn't require patient_id but has lower page limit (50)
   */
  async getAllTreatmentNotes(params?: {
    page?: number;
    page_length?: number;
    last_modified?: string;
    practitioner_id?: string;
  }): Promise<TreatmentNote[]> {
    const result = await this.makeRequest<{ notes: TreatmentNote[] }>(
      "getAllTreatmentNotes",
      params,
    );
    return result.notes || [];
  }

  /**
   * Get cases for a specific patient from Nookal API
   * Note: patient_id is required for this endpoint
   */
  async getCases(
    params: { patientID: string } & {
      page?: number;
      page_length?: number;
      last_modified?: string;
    },
  ): Promise<any[]> {
    const result = await this.makeRequest<{ cases: any[] }>("getCases", {
      patient_id: params.patientID,
      ...params,
    });
    return result.cases || [];
  }

  /**
   * Get all cases from Nookal API
   */
  async getAllCases(params?: {
    page?: number;
    page_length?: number;
    last_modified?: string;
  }): Promise<any[]> {
    const result = await this.makeRequest<{ cases: any[] }>(
      "getAllCases",
      params,
    );
    return result.cases || [];
  }

  /**
   * Add a treatment note
   */
  async addTreatmentNote(params: AddTreatmentNoteParams): Promise<any> {
    const postData = {
      patient_id: params.patientId,
      case_id: params.caseId,
      practitioner_id: params.practitionerId,
      date: params.date,
      notes: params.notes,
      ...(params.apptId && { appt_id: params.apptId }),
    };

    return this.makeRequest<any>("addTreatmentNote", undefined, {
      method: "POST",
      body: postData,
    });
  }

  /**
   * Generic method for custom endpoints
   */
  async customEndpoint<T>(
    endpoint: string,
    params?: QueryParameters,
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, params);
  }

  /**
   * Generic method for custom POST endpoints
   */
  async customPostEndpoint<T>(
    endpoint: string,
    body: Record<string, unknown>,
    params?: QueryParameters,
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, params, {
      method: "POST",
      body,
    });
  }
}

/**
 * Create a Nookal client instance from environment variables
 */
export function createNookalClientFromEnv(): NookalClient {
  const apiKey = process.env.NOOKAL_API_KEY;
  const baseUrl =
    process.env.NOOKAL_BASE_URL || "https://api.nookal.com/production/v2";

  if (!apiKey) {
    throw new Error("NOOKAL_API_KEY environment variable is required");
  }

  return new NookalClient({ apiKey, baseUrl });
}
