import { handleAiHttpRequest } from "../src/server/ai/http-handler";

export default function handler(request: Request): Promise<Response> {
  return handleAiHttpRequest(request);
}
