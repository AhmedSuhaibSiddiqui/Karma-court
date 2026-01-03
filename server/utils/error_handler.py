import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def handle_error(error: Exception, context: str = ""):
    """
    Logs the error and returns a friendly error message or structure.
    """
    error_msg = str(error)
    trace = traceback.format_exc()
    
    logger.error(f"Error in {context}: {error_msg}\n{trace}")
    
    return {
        "status": "error",
        "message": "An internal server error occurred.",
        "details": error_msg if context == "dev" else None # Hide details in prod usually
    }

def log_info(message: str):
    logger.info(message)

