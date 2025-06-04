# AiCompanion

AiCompanion is a full-stack application that enables users to create, customize, and chat with AI character companions. The project consists of a Node.js Express backend and a Next.js frontend.

## Project Structure

```
AiCompanion/
├── backend/             # Express server backend
│   ├── server.js        # Main server file with API endpoints
│   └── package.json     # Backend dependencies
│
└── ai-companion-nextjs/ # Next.js frontend
    ├── src/             # Source code
    │   ├── app/         # Next.js app router pages
    │   ├── components/  # React components
    │   └── services/    # API service layer
    └── package.json     # Frontend dependencies
```

## Features

- **User Authentication**: Secure user management with Clerk
- **Character Creation**: Create and customize AI companions with personalities, interests, and appearances
- **Conversational AI**: Chat with AI characters that maintain their unique personalities
- **Character Management**: Edit, view, and delete your created characters
- **Conversation History**: Access and manage previous conversations with characters

## Backend

The backend server is built with Express.js and provides API endpoints for character and conversation management.

### Setup

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
PORT=3001
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Running the Backend

```bash
cd backend
node server.js
```

### API Endpoints

#### Characters

- `GET /v1/characters/:clerkId` - Get all characters for a user
- `GET /v1/character/:characterId` - Get a specific character by ID
- `POST /v1/characters` - Create a new character
- `PUT /v1/characters/:characterId` - Update a character
- `DELETE /v1/characters/:characterId` - Delete a character

#### Conversations

- `GET /v1/conversations/:clerkId` - Get all conversations for a user
- `GET /v1/conversations/:clerkId/:characterId` - Get conversations with a specific character
- `GET /v1/conversation/:conversationId` - Get a specific conversation
- `POST /v1/conversations` - Create a new conversation
- `PUT /v1/conversation/:conversationId/title` - Update a conversation title
- `DELETE /v1/conversation/:conversationId` - Delete a conversation

#### Messages

- `GET /v1/messages/:conversationId` - Get all messages in a conversation
- `POST /v1/messages` - Send a new message

## Frontend

The frontend is built with Next.js and provides a modern, responsive UI for interacting with AI characters.

### Setup

```bash
cd ai-companion-nextjs
npm install
```

### Environment Variables

Create a `.env.local` file in the ai-companion-nextjs directory:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Running the Frontend

```bash
cd ai-companion-nextjs
npm run dev
```

The application will be available at `http://localhost:3000`.

### Key Pages

- `/` - Home page with app introduction
- `/characters` - List of user-created characters
- `/characters/[characterId]` - View character details
- `/characters/create` - Create a new character
- `/characters/edit/[characterId]` - Edit an existing character
- `/chat/[characterId]` - Chat with a specific character

## Development

### Dependencies

#### Backend Dependencies
- Express.js - Web server framework
- MongoDB - Database for storing characters and conversations
- OpenAI - AI services for character interactions
- Clerk - Authentication and user management

#### Frontend Dependencies
- Next.js - React framework
- React - UI library
- Clerk/nextjs - Authentication components
- TailwindCSS - Utility-first CSS framework

## Deployment

### Backend Deployment
1. Set up a Node.js environment on your hosting service
2. Configure environment variables
3. Run `npm install` to install dependencies
4. Start the server with `node server.js` or using a process manager like PM2

### Frontend Deployment
1. Build the Next.js application: `npm run build`
2. Deploy the built application to a hosting service that supports Next.js (Vercel, Netlify, etc.)
3. Configure environment variables on your hosting service

## License

This project is licensed under the MIT License - see the LICENSE file for details.