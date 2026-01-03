export class ErrorHandler {
  static handleSDKError(error: any): string {
    console.error("Discord SDK Error:", error);
    return error.message || "Failed to interact with Discord SDK.";
  }

  static handleAPIError(error: any): string {
    console.error("API Error:", error);
    return error.message || "Failed to communicate with the server.";
  }

  static handleWebSocketError(error: Event): string {
    console.error("WebSocket Error:", error);
    return "Connection to the game server was lost.";
  }

  static handleGenericError(error: any): string {
    console.error("Application Error:", error);
    return error.message || "An unexpected error occurred.";
  }
}
