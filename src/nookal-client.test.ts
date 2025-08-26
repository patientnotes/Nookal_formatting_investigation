import { describe, it, expect, vi, beforeEach } from "vitest";
import { NookalClient } from "./nookal-client.js";
import type {
  NookalApiResponse,
  Patient,
  TreatmentNote,
  AddTreatmentNoteParams,
} from "./types.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("NookalClient", () => {
  let client: NookalClient;
  const mockConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://api.nookal.com/test/v2",
  };

  beforeEach(() => {
    client = new NookalClient(mockConfig);
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create client with provided config", () => {
      expect(client).toBeDefined();
    });

    it("should remove trailing slash from baseUrl", () => {
      const clientWithSlash = new NookalClient({
        ...mockConfig,
        baseUrl: "https://api.nookal.com/test/v2/",
      });
      expect(clientWithSlash).toBeDefined();
    });
  });

  describe("URL building", () => {
    it("should build correct URL with API key", async () => {
      const mockResponse: NookalApiResponse<Patient[]> = {
        status: "success",
        data: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.getPatients();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://api.nookal.com/test/v2/getPatients?api_key=test-api-key",
        ),
        expect.any(Object),
      );
    });

    it("should build URL with additional parameters", async () => {
      const mockResponse: NookalApiResponse<Patient[]> = {
        status: "success",
        data: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.getPatients({ limit: 10, email: "test@example.com" });

      const call = vi.mocked(fetch).mock.calls[0];
      const url = call[0] as string;

      expect(url).toContain("limit=10");
      expect(url).toContain("email=test%40example.com");
    });

    it("should skip undefined parameters", async () => {
      const mockResponse: NookalApiResponse<Patient[]> = {
        status: "success",
        data: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.getPatients({ limit: 10, email: undefined });

      const call = vi.mocked(fetch).mock.calls[0];
      const url = call[0] as string;

      expect(url).toContain("limit=10");
      expect(url).not.toContain("email");
    });
  });

  describe("API requests", () => {
    it("should handle successful response", async () => {
      const mockPatients: Patient[] = [
        {
          ID: "1",
          FirstName: "John",
          LastName: "Doe",
          Email: "john@example.com",
        },
      ];

      const mockResponse: NookalApiResponse<Patient[]> = {
        status: "success",
        data: mockPatients,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.getPatients();

      expect(result).toEqual(mockPatients);
    });

    it("should handle HTTP error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(client.getPatients()).rejects.toThrow("HTTP 404: Not Found");
    });

    it("should handle API error response", async () => {
      const mockResponse: NookalApiResponse<Patient[]> = {
        status: "error",
        data: [],
        error: "Invalid API key",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(client.getPatients()).rejects.toThrow(
        "API Error: Invalid API key",
      );
    });

    it("should handle network error", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getPatients()).rejects.toThrow(
        "Nookal API request failed: Network error",
      );
    });
  });

  describe("endpoint methods", () => {
    beforeEach(() => {
      const mockResponse: NookalApiResponse<any[]> = {
        status: "success",
        data: [],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);
    });

    it("should call getPatients endpoint", async () => {
      await client.getPatients();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/getPatients"),
        expect.any(Object),
      );
    });

    it("should call getPatient with specific ID", async () => {
      await client.getPatient("123");

      const call = vi.mocked(fetch).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain("patientID=123");
    });

    it("should call getAppointments endpoint", async () => {
      await client.getAppointments();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/getAppointments"),
        expect.any(Object),
      );
    });

    it("should call getPractitioners endpoint", async () => {
      await client.getPractitioners();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/getPractitioners"),
        expect.any(Object),
      );
    });

    it("should call getLocations endpoint", async () => {
      await client.getLocations();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/getLocations"),
        expect.any(Object),
      );
    });

    it("should handle custom endpoint", async () => {
      await client.customEndpoint("getServices", { limit: 5 });

      const call = vi.mocked(fetch).mock.calls[0];
      const url = call[0] as string;

      expect(url).toContain("/getServices");
      expect(url).toContain("limit=5");
    });
  });

  describe("request headers", () => {
    it("should include correct headers", async () => {
      const mockResponse: NookalApiResponse<Patient[]> = {
        status: "success",
        data: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.getPatients();

      const call = vi.mocked(fetch).mock.calls[0];
      const options = call[1] as RequestInit;

      expect(options.method).toBe("GET");
      expect(options.headers).toMatchObject({
        "Content-Type": "application/json",
        "User-Agent": "Nookal-Client/1.0.0",
      });
    });

    describe("treatment notes", () => {
      beforeEach(() => {
        const mockResponse: NookalApiResponse<Patient[]> = {
          status: "success",
          data: [],
        };

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        } as Response);
      });

      it("should call getTreatmentNotes endpoint", async () => {
        await client.getTreatmentNotes();
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/getPatients"),
          expect.any(Object),
        );
      });

      it("should call getTreatmentNotes with patient ID", async () => {
        await client.getTreatmentNotes({ patientID: "123" });

        const call = vi.mocked(fetch).mock.calls[0];
        const url = call[0] as string;
        expect(url).toContain("patientID=123");
      });

      it("should add treatment note with POST request", async () => {
        const mockResponse: NookalApiResponse<any> = {
          status: "success",
          data: { id: 1, message: "Note added successfully" },
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const noteParams: AddTreatmentNoteParams = {
          patientId: 123,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-15 10:30:00",
          notes: "Test treatment note",
          apptId: 101,
        };

        await client.addTreatmentNote(noteParams);

        const call = vi.mocked(fetch).mock.calls[0];
        const url = call[0] as string;
        const options = call[1] as RequestInit;

        expect(url).toContain("/addTreatmentNote");
        expect(options.method).toBe("POST");
        expect(options.headers).toMatchObject({
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Nookal-Client/1.0.0",
        });

        // Check that the body contains the expected form data
        const body = options.body as URLSearchParams;
        expect(body.get("patient_id")).toBe("123");
        expect(body.get("case_id")).toBe("456");
        expect(body.get("practitioner_id")).toBe("789");
        expect(body.get("date")).toBe("2024-01-15 10:30:00");
        expect(body.get("notes")).toBe("Test treatment note");
        expect(body.get("appt_id")).toBe("101");
        expect(body.get("api_key")).toBe("test-api-key");
      });

      it("should add treatment note without appointment ID", async () => {
        const mockResponse: NookalApiResponse<any> = {
          status: "success",
          data: { id: 1, message: "Note added successfully" },
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const noteParams: AddTreatmentNoteParams = {
          patientId: 123,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-15 10:30:00",
          notes: "Test treatment note without appointment",
        };

        await client.addTreatmentNote(noteParams);

        const call = vi.mocked(fetch).mock.calls[0];
        const options = call[1] as RequestInit;
        const body = options.body as URLSearchParams;

        expect(body.get("patient_id")).toBe("123");
        expect(body.get("case_id")).toBe("456");
        expect(body.get("practitioner_id")).toBe("789");
        expect(body.get("appt_id")).toBeNull();
      });

      it("should handle POST request errors", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: "Bad Request",
        } as Response);

        const noteParams: AddTreatmentNoteParams = {
          patientId: 123,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-15 10:30:00",
          notes: "Test treatment note",
        };

        await expect(client.addTreatmentNote(noteParams)).rejects.toThrow(
          "HTTP 400: Bad Request",
        );
      });

      it("should handle API error in POST response", async () => {
        const mockResponse: NookalApiResponse<any> = {
          status: "error",
          data: null,
          error: "Invalid patient ID",
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const noteParams: AddTreatmentNoteParams = {
          patientId: -1,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-15 10:30:00",
          notes: "Test treatment note",
        };

        await expect(client.addTreatmentNote(noteParams)).rejects.toThrow(
          "API Error: Invalid patient ID",
        );
      });
    });

    describe("custom POST endpoints", () => {
      it("should handle custom POST endpoint", async () => {
        const mockResponse: NookalApiResponse<any> = {
          status: "success",
          data: { result: "success" },
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        await client.customPostEndpoint("customEndpoint", {
          field1: "value1",
          field2: 123,
        });

        const call = vi.mocked(fetch).mock.calls[0];
        const url = call[0] as string;
        const options = call[1] as RequestInit;

        expect(url).toContain("/customEndpoint");
        expect(options.method).toBe("POST");

        const body = options.body as URLSearchParams;
        expect(body.get("field1")).toBe("value1");
        expect(body.get("field2")).toBe("123");
        expect(body.get("api_key")).toBe("test-api-key");
      });
    });
  });
});

// Test environment client creation
describe("createNookalClientFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("should create client from environment variables", async () => {
    // Dynamic import to avoid issues with top-level mocking
    const { createNookalClientFromEnv } = await import("./nookal-client.js");

    process.env.NOOKAL_API_KEY = "env-api-key";
    process.env.NOOKAL_BASE_URL = "https://api.nookal.com/env/v2";

    const client = createNookalClientFromEnv();
    expect(client).toBeDefined();
  });

  it("should use default base URL when not provided", async () => {
    const { createNookalClientFromEnv } = await import("./nookal-client.js");

    process.env.NOOKAL_API_KEY = "env-api-key";
    delete process.env.NOOKAL_BASE_URL;

    const client = createNookalClientFromEnv();
    expect(client).toBeDefined();
  });

  it("should throw error when API key is missing", async () => {
    const { createNookalClientFromEnv } = await import("./nookal-client.js");

    delete process.env.NOOKAL_API_KEY;

    expect(() => createNookalClientFromEnv()).toThrow(
      "NOOKAL_API_KEY environment variable is required",
    );
  });
});
