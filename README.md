# Trout Log

A simple web application for logging trout fishing catches.

## Features

- Log a catch with date, species, weight, location, and notes
- View all catches in a clean, card-based layout
- Delete individual entries

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm test
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/entries` | List all entries |
| `GET` | `/api/entries/:id` | Get a single entry |
| `POST` | `/api/entries` | Create a new entry |
| `DELETE` | `/api/entries/:id` | Delete an entry |

### Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string (YYYY-MM-DD) | ✅ | Date of the catch |
| `species` | string | ✅ | Trout species (e.g. Rainbow, Brown, Brook) |
| `weight` | number | | Weight in pounds |
| `location` | string | | Where the catch was made |
| `notes` | string | | Additional notes |
