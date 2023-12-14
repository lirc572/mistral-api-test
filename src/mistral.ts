type ListResponse = {
  object: "list";
  data: {
    id: string;
    object: "model";
    created: number;
    owned_by: string;
    root: any;
    parent: any;
    permission: any[];
  }[];
};

type EmbeddingsRequest = {
  model: "mistral-embed";
  input: string[];
};

type EmbeddingsResponse = {
  id: string;
  object: "list";
  data: {
    object: "embedding";
    embedding: number[];
    index: number;
  }[];
  model: "mistral-embed";
  usage: {
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens: number;
  };
};

type ChatMessage = {
  role: "user" | "system";
  content: string;
};

type ChatRequest = {
  model: "mistral-tiny" | "mistral-small" | "mistral-medium" | "mistral-embed";
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  random_seed?: number;
  stream?: boolean;
  safe_prompt?: boolean;
};

type ChatResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: "mistral-tiny" | "mistral-small" | "mistral-medium";
  choices: {
    index: number;
    message?: {
      role: "user" | "system";
      content: string;
    };
    delta?: {
      role: "user" | "system";
      content: string;
    };
    finish_reason: "stop" | "length" | null;
  }[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens: number;
  };
};

class MistralClient {
  private endpoint: string;
  private apiKey: string;

  constructor(
    apiKey: string = process.env.MISTRAL_API_KEY as string,
    endpoint: string = "https://api.mistral.ai",
  ) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  private async fetchApi(
    method: string,
    path: string,
    request?: ChatRequest | EmbeddingsRequest,
  ): Promise<any> {
    const response = await fetch(`${this.endpoint}/${path}`, {
      method,
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: request ? JSON.stringify(request) : undefined,
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      return null;
    }

    return response.json();
  }

  public async listModels(): Promise<ListResponse> {
    return this.fetchApi("GET", "v1/models");
  }

  public async embeddings(requestParams: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    if (requestParams.model !== "mistral-embed") {
      throw new Error("Use 'mistral-embed' model for embeddings requests.");
    }
    return this.fetchApi("POST", "v1/embeddings", requestParams);
  }

  public async chat(requestParams: ChatRequest): Promise<ChatResponse> {
    if (requestParams.stream) {
      throw new Error("Use chatStream() for streaming requests.");
    }
    return this.fetchApi(
      "POST",
      "v1/chat/completions",
      requestParams,
    ) as Promise<ChatResponse>;
  }

  public async chatStream(
    requestParams: ChatRequest,
  ): Promise<AsyncGenerator<ChatResponse>> {
    if (requestParams.stream === undefined) {
      requestParams.stream = true;
    }
    if (!requestParams.stream) {
      throw new Error("Use chat() for non-streaming requests.");
    }
    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestParams),
    });

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return (async function* () {
      let done, value;
      do {
        ({ done, value } = await reader.read());
        if (value) {
          const chunk = decoder.decode(value);
          // Process each line of chunk
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const chunkData = line.substring(6).trim();
              if (chunkData !== "[DONE]") {
                yield JSON.parse(chunkData);
              }
            }
          }
        }
      } while (!done);
    })();
  }
}

export default MistralClient;
