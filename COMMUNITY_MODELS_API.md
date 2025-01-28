# CommunityModels API Documentation

This document describes the API endpoints available for external developers to integrate with CommunityModels.

## Authentication

API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Each API key is scoped to a specific Community Model and can only be used to submit statements and votes for that model's polls.

## Currently Available Endpoints

### Submit Statement

`POST /api/polls/{pollId}/statements`

Submit a new statement to a poll. The API key must be associated with the Community Model that owns the poll.

**Request:**

```json
{
  "content": "Statement text",
  "anonymousId": "optional-anonymous-id"
}
```

**Response:**

```json
{
  "uid": "statement-id",
  "text": "Statement text",
  "status": "PENDING",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

### Submit Vote

`POST /api/polls/{pollId}/votes`

Submit a vote on a statement. The API key must be associated with the Community Model that owns the poll.

**Request:**

```json
{
  "statementId": "statement-id",
  "vote": "AGREE" | "DISAGREE" | "PASS",
  "anonymousId": "optional-anonymous-id"
}
```

**Response:**

```json
{
  "uid": "vote-id",
  "voteValue": "AGREE",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

### Create Constitution

`POST /api/models/{modelId}/constitutions`

Create a new constitution from the current set of constitutionable statements and set it as the active constitution. The API key must be associated with the Community Model.

**Response:**

```json
{
  "uid": "constitution-id",
  "version": 1,
  "status": "ACTIVE",
  "content": "Constitution content...",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

### Chat Completions

`POST /api/v1/chat/completions`

OpenAI-compatible chat completion endpoint that uses your community model's active constitution.

**Request:**

```json
{
  "messages": [{ "role": "user", "content": "Your message here" }],
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response:**

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "your-model-name",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The response"
      },
      "finish_reason": "stop"
    }
  ]
}
```

## Not Yet Implemented

The following endpoints are planned but not yet implemented:

### Create Community Model

`POST /api/models`

Creating new Community Models is currently only available through the web interface.

### Create Poll

`POST /api/models/{modelId}/polls`

Creating new Polls is currently only available through the web interface.
