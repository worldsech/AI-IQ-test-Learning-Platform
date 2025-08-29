# LearnIQ - AI Learning Platform

## Description

LearnIQ is an AI-powered learning platform designed to provide personalized learning assistance based on individual cognitive profiles. It leverages AI to tailor responses to a user's IQ level, offering an optimized learning experience. Users can upload documents for context-specific discussions with the AI, enhancing the learning process.

## Prerequisites

Before running the project, ensure you have the following installed:

-   **Node.js and npm (or yarn):**  You can download them from the official Node.js website (https://nodejs.org/).
-   **Firebase Account:** You'll need a Firebase account to use Firebase services. Create a project on the Firebase Console (https://console.firebase.google.com/).

## Installation

1.  **Clone the Repository:**

    ```bash
    git clone <repository_url>
    ```

    Replace `<repository_url>` with the actual URL of the project's Git repository.

2.  **Install Dependencies:**

    Navigate to the project directory in your terminal:

    ```bash
    cd <project_directory>
    ```

    Install the project dependencies using npm or yarn:

    ```bash
    npm install
    # or
    yarn install
    ```

## Configuration

1.  **Firebase Configuration:**

    *   Obtain your Firebase configuration object from your Firebase project settings.
    *   Create a `.env.local` file in the root of your project and add your Firebase configuration values:

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
    ```

    *   Update your Firebase initialization code (e.g., in `src/lib/firebase.ts`) to use these environment variables.

## Running the Project

1.  **Start the Development Server:**

    ```bash
    npm run dev
    # or
    yarn dev
    ```

    This will start the application at `http://localhost:3000`. Open this URL in your web browser to view the running application.

## Additional Notes

*   **Firebase Authentication:**  Ensure that you have enabled the necessary sign-in methods in the Firebase Console.
*   **API Keys:**  Store any other required API keys in your `.env.local` file.
*   **Database Setup:**  If the project requires specific data in Firestore, add it through the Firebase Console.


