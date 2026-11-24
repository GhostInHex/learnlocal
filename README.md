# LearnLocal

> An offline AI learning system for classrooms that have students, devices, and a teacher, but no reliable internet.

LearnLocal turns one teacher laptop into a complete classroom learning server. Students connect from any phone, tablet, or laptop browser over a local Wi-Fi hotspot. No internet connection, no cloud account, no subscription, and no app install for students. The AI tutor runs locally on the teacher's machine, speaks each student's own language, and adapts to each student's level.

When internet happens to be available, LearnLocal can optionally route heavier work (translation, note generation) to a larger cloud model, and it falls back to the local model automatically if the connection drops. Student chat always stays on the local machine, in every mode.

## Contents

- [The problem](#the-problem)
- [What LearnLocal does](#what-learnlocal-does)
- [Features](#features)
- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Adding curriculum](#adding-curriculum)
- [Model fine-tuning](#model-fine-tuning)
- [Design principles](#design-principles)
- [Attribution and licence](#attribution-and-licence)

## The problem

Roughly 100 million children in conflict zones, refugee camps, and under-resourced rural communities are out of school or learning in classrooms with one teacher for 60 or more students and no dependable connectivity. Mainstream education platforms assume the opposite: cloud accounts, steady bandwidth, and a personal device with an email address for every learner. The hardware to do better is usually already in the room (donated laptops, old Android phones, shared tablets). What is missing is software that runs entirely on that hardware.

## What LearnLocal does

The teacher starts LearnLocal on a laptop. The server loads a local AI model through Ollama, opens a Wi-Fi hotspot, and students join from a browser: they scan a QR code or open the local address, pick their name, and start learning. Each student gets a tutor that knows their name, grade, language, and what they have already mastered. A photograph of a textbook page becomes an explanation at the student's level, in the student's language, in seconds. While the teacher talks, students can read a live translation of the lesson on their own screens.

## Features

### For students

| Feature | What it does |
|---|---|
| AI tutor chat | Conversational tutoring in the student's language, aware of their name, grade, and mastery history |
| Translate and Learn | Upload a PDF, photo, or text and get a translation plus a grade-level explanation |
| Adaptive quizzes | Questions that adjust to the student's level; mastery is tracked per topic over time |
| Text to speech | Any content read aloud; offline voices for many languages, with more available through MMS-TTS |
| Multilingual PDFs | Explanations exported as PDFs that render correctly in scripts such as Arabic (RTL), Devanagari, Tamil, and Ethiopic |
| Live class translation | The teacher's speech is transcribed and translated to each student's language in real time |
| Live quiz games | Whole-class quiz sessions with a join code, played simultaneously on student devices |
| No sign-up | Students pick a name from a list or create a profile with just a name and language; no email, no password |
| Offline-first PWA | Installable on Android and iOS home screens; the interface is cached for instant reloads |
| Gentle feedback | The words "wrong", "failed", and "incorrect" appear nowhere in the interface or the AI prompts |

### For teachers

| Feature | What it does |
|---|---|
| Mastery heatmap | A grid of every student against every topic, so gaps are visible at a glance |
| Automatic alerts | Flags students who are inactive, stuck, or slipping, before they fall behind |
| Quiz builder | Create and assign quizzes, or let the AI generate questions from the curriculum |
| Material upload | Drop in a PDF or image; it is indexed so students can ask questions about it |
| Live class mode | Speak normally; students receive transcription and translation as you teach |
| Progress reports | One-click weekly PDF report per student or class, rendered in the right script |
| Network panel | Hotspot details and a QR code students scan to connect, with a live count of connected devices |
| Interface language | Switch the teacher dashboard language while students keep learning in their own |

## How it works

```
Teacher laptop
  Ollama (local model, port 11434)
  LearnLocal server (FastAPI, ports 8000 / 8443)
    SQLite database, FAISS curriculum index, offline TTS and speech recognition
    React web app, served as static files
        |
  Wi-Fi hotspot (for example 192.168.137.1, or optilearn.local via mDNS)
        |
  Student phones, tablets, and laptops (browser only, nothing to install)
```

Two operating modes, switchable from the teacher dashboard without a restart:

| | Offline mode | Online mode |
|---|---|---|
| Setting | `USE_LOCAL_OLLAMA=true` | `USE_LOCAL_OLLAMA=false` with an API key |
| AI model | Local model via Ollama | Cloud model via the Gemini API, local fallback |
| Internet | Never required | Used for AI calls only |
| Student chat | Always local | Always local |
| Translation and notes | Local model | Cloud model for higher quality |

## Getting started

### Option 1: Web app (the core product)

Requirements: Python 3.11 or 3.12, Node.js 18 or newer, and Ollama. A machine with 8 GB of RAM runs the small local model; 16 GB is more comfortable. No GPU is required.

```bash
git clone <your-repo-url>
cd LearnLocal/optilearn

# One-shot setup (Linux and macOS)
chmod +x scripts/setup.sh scripts/start.sh
./scripts/setup.sh

# Build the frontend
cd frontend && npm install && npm run build && cd ..

# Start the server
./scripts/start.sh
```

Open `http://localhost:8000`. On first start you will be asked to create the teacher account. Students connect over the hotspot at the address shown in the dashboard (commonly `http://192.168.137.1:8000`).

Before the first class, pull a local model:

```bash
ollama pull gemma4:e2b    # about 1.5 GB, runs in 8 GB RAM
ollama pull gemma4:e4b    # about 2.5 GB, stronger reasoning, wants 12 GB RAM
```

On Windows, `start_admin.bat` in the `optilearn` folder sets up firewall ports and hotspot DNS, builds the frontend, and starts the server in one step. See `optilearn/SETUP.md` for the step-by-step guide and troubleshooting.

### Option 2: Desktop app

The `desktop` folder contains an Electron wrapper for non-technical users: a one-click installer with a first-launch wizard that checks for Ollama, downloads the model with a progress bar, and stores optional API keys. It runs the same web app underneath. See `desktop/README.md` for build instructions.

### Classroom setup, briefly

1. Install Ollama and pull a model (above).
2. Copy `optilearn/.env.example` to `optilearn/.env` (the setup script does this) and confirm `USE_LOCAL_OLLAMA=true`.
3. Start a Wi-Fi hotspot on the teacher laptop.
4. Start LearnLocal and share the QR code from the teacher dashboard.

## Configuration

All configuration lives in `optilearn/.env`, created from `optilearn/.env.example` during setup. The most relevant variables:

| Variable | Default | Description |
|---|---|---|
| `USE_LOCAL_OLLAMA` | `true` | `true` for fully offline local models; `false` to use the cloud API when online |
| `GEMMA_API_KEY` | empty | Google AI Studio key; enables online mode for translation and notes |
| `GEMMA_26B_API_KEY` | empty | Optional separate key for the larger cloud model |
| `GEMMA_26B_MODEL` | `gemma-4-26b-a4b-it` | Cloud model used for translation and admin lanes |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server address |
| `OLLAMA_MODEL_FAST` | `gemma4:e2b` | Local model for most routes |
| `OLLAMA_MODEL_DEEP` | `gemma4:e4b` | Local model for harder reasoning |
| `OLLAMA_TUTOR_MODEL` | `gemma4:e2b` | Local model dedicated to student tutor chat |
| `BEY_API_KEY` | empty | Beyond Presence key; enables the optional AI voice avatar |
| `DB_PATH` | `./data/optilearn.db` | SQLite database location |
| `FAISS_INDEX_PATH` | `./data/curriculum.index` | Curriculum vector index |
| `CURRICULUM_DIR` | `./data/curriculum` | Plain-text lesson files |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | HTTP bind address and port |
| `HTTPS_PORT` | `8443` | HTTPS port (needed for microphone access over the LAN) |
| `PIPER_BINARY` / `VOICES_DIR` | `./bin/piper` / `./data/voices` | Offline text-to-speech binary and voice files |
| `WHISPER_BINARY` | `./bin/whisper` | Speech recognition binary for live class transcription |

API keys can also be updated while the server runs, from the settings API or the desktop setup wizard, with no restart.

## Project structure

```
LearnLocal/
├── optilearn/                  Web application (the core product)
│   ├── app/
│   │   ├── main.py             FastAPI application, startup, HTTPS, captive portal handling
│   │   ├── api/routes/         One module per area: chat, teacher, students, quiz,
│   │   │                       live class, live quiz, materials, translate, network, ...
│   │   ├── core/               Settings, language and grade helpers, tutor prompt builder
│   │   ├── services/           AI model routing and scheduling, database, FAISS search,
│   │   │                       text to speech, speech recognition, OCR, networking
│   │   └── tools/              Tools the AI can call during a session (quiz generation,
│   │                           curriculum retrieval, progress updates, language detection)
│   ├── frontend/               React 18 single-page app (Vite, installable PWA)
│   ├── data/curriculum/        Lesson files; add .txt files here
│   ├── scripts/                Setup, start, stop, and admin reset scripts
│   └── SETUP.md                Step-by-step setup guide
├── desktop/                    Electron wrapper with a first-launch setup wizard
├── finetuning/                 Optional pipeline to specialise the local model
└── DOCS.md                     Architecture notes for contributors
```

## API overview

Interactive documentation is served at `http://localhost:8000/docs` while the server runs. The main groups:

| Area | Examples |
|---|---|
| Health and auth | `GET /api/health`, `POST /api/auth/setup`, `POST /api/auth/teacher/login`, `POST /api/auth/student/login` |
| Students and sessions | `POST /api/students`, `GET /api/students/{id}/progress`, `POST /api/sessions`, `POST /api/chat` (streaming tutor) |
| Translate and Learn | `POST /api/feature1/upload`, `POST /api/feature1/translate`, `POST /api/feature1/explain`, `GET /api/feature1/materials/{id}/export` |
| Teacher | `GET /api/teacher/heatmap`, `GET /api/teacher/alerts`, `GET /api/teacher/report`, `POST /api/materials/upload`, `POST /api/teacher/quiz` |
| Settings | `GET /api/settings/network-mode`, `POST /api/settings/network-mode`, `POST /api/settings/api-keys` |

## Adding curriculum

Drop one `.txt` file per topic into `optilearn/data/curriculum/` (300 to 800 words of clear, simple language works best), then rebuild the index:

```bash
source .venv/bin/activate
python data/scripts/build_index.py
```

Materials uploaded through the teacher dashboard are indexed immediately, with no restart.

## Model fine-tuning

The `finetuning` folder holds an optional Unsloth QLoRA pipeline that specialises the local Gemma model on multilingual, trauma-aware tutoring data, plus the dataset used and export steps back to Ollama. It runs on a free Kaggle A100 in a few hours. See `finetuning/README.md` for the full walkthrough and the measured results in `finetuning/FINDINGS.md`.

## Design principles

**Student conversations never leave the room.** Tutor chat is pinned to the local model in code, not just by configuration. Cloud models, when enabled at all, handle teacher-initiated batch work such as translation and note generation.

**No accounts for students.** A name and a language are enough. Nothing about the design assumes a student has an email address, a personal device, or a home connection.

**Language that never shames.** Feedback copy and AI prompts avoid "wrong", "failed", and similar labels by construction, because many of the students this is built for are learning through displacement and interruption.

**One process, boring dependencies.** A single server process hosts the web app, the API, streaming, speech, and search. SQLite instead of a database server, files instead of object storage. If a teacher can copy a folder, they can move a classroom.

## Attribution and licence

LearnLocal is derived from the open-source project **OptiLearn**, created by **Chanitha Abeygunawardena, Ilakian Puvanendra, and Sasiru Virajith**, and available at https://github.com/Ilakiancs/OptiLearn. LearnLocal builds on that codebase with a redesigned interface, rewritten content, and reorganised code; the underlying functionality inherited from the original project is theirs, and credit for it belongs to them.

Both the original project and this derived work are licensed under the Creative Commons Attribution 4.0 International Licence (CC BY 4.0). See the `LICENSE` file in this repository for the full text, and https://creativecommons.org/licenses/by/4.0/ for a summary. If you share or adapt this work, keep the attribution above intact, as the licence requires.
