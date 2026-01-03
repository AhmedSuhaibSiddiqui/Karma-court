export class ErrorHandler {
  static handleSDKError(error: unknown): string {
    console.error("Discord SDK Error:", error);
    return error instanceof Error ? error.message : "Failed to interact with Discord SDK.";
  }

  static handleAPIError(error: unknown): string {
    console.error("API Error:", error);
    return error instanceof Error ? error.message : "Failed to communicate with the server.";
  }

  static handleWebSocketError(error: Event): string {
    console.error("WebSocket Error:", error);
    return "Connection to the game server was lost.";
  }

  static handleGenericError(error: unknown): string {
    console.error("Application Error:", error);
    return error instanceof Error ? error.message : "An unexpected error occurred.";
  }
}