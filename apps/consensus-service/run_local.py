import os
from dotenv import load_dotenv
from api.update_gac_scores import main

# Load environment variables from .env file
load_dotenv()

if __name__ == "__main__":
    main()