const BASE_URL = "https://carapaceai.com/api/v1";

export interface QueryParams {
  question: string;
  context?: string;
  maxResults?: number;
  minConfidence?: number;
  domainTags?: string[];
}

export interface ContributeParams {
  claim: string;
  confidence: number;
  reasoning?: string;
  applicability?: string;
  limitations?: string;
  domainTags?: string[];
}

export interface UpdateParams {
  claim?: string;
  confidence?: number;
  reasoning?: string;
  applicability?: string;
  limitations?: string;
  domainTags?: string[];
}

export class CarapaceClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers(auth: boolean = true): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (auth) {
      h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  private async request(
    path: string,
    options: RequestInit
  ): Promise<unknown> {
    const response = await fetch(`${BASE_URL}${path}`, options);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        (body as { error?: { message?: string } })?.error?.message ||
        `API error: ${response.status}`;
      throw new Error(message);
    }
    return response.json();
  }

  async query(params: QueryParams): Promise<unknown> {
    return this.request("/query", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(params),
    });
  }

  async contribute(params: ContributeParams): Promise<unknown> {
    return this.request("/contributions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(params),
    });
  }

  async get(id: string): Promise<unknown> {
    return this.request(`/contributions/${id}`, {
      method: "GET",
      headers: this.headers(false),
    });
  }

  async update(id: string, params: UpdateParams): Promise<unknown> {
    return this.request(`/contributions/${id}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(params),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request(`/contributions/${id}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }
}
