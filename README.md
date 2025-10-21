# DHTMLX Gantt - AI Theme Builder Demo

This demo shows how to connect **DHTMLX Gantt** with an **AI-powered chatbot** that can customize the theme and configuration of the Gantt chart using natural language instructions.  
The chatbot generates **CSS variables** and **Gantt configs** based on user requests, which are instantly applied to the chart.

Additionally, the demo includes two tabs above the chat area:

- **Chat tab** – where you can describe the style/theme you want and send this request to an LLM via the Chatbot.
- **Code tab** – where you can review and edit the generated CSS variables and configuration manually.

The setup combines **DHTMLX Gantt** for project visualization, a **frontend app (Vite + React)** for UI, and a **backend (Express + Socket.IO)** for communication with an LLM (via OpenAI API or a compatible service). Everything is containerized with Docker.

### **[✨ Try the Live Demo >>>](https://dhtmlx.com/docs/demo/ai-gantt-theme-builder/)**

---

## Features

- **AI-driven theme customization** – adjust colors, sizes, and styles by simply describing them in natural language.
- **CSS variables generation** – LLM generates reusable theme variables for Gantt.
- **Config editing** – control Gantt parameters like row/task height, link width, link radius, and more.
- **Two editing modes** – switch between AI chat and manual code editing.

---

## How it works

This demo demonstrates how AI can serve as a **theme builder** for Gantt. For example, when a user types:

> _"Create a bright, warm theme and make row and task bar height slightly bigger."_

the chatbot sends the request to the LLM, which responds with a set of CSS variables and config options. These are then applied to the chart, and the user sees the updated look.

### Main flow:

1. **Function calling with LLM**

   - The backend uses the function calling feature of the OpenAI API.
   - Available functions are defined in `backend/schemaList.js`.
   - Each function has a schema describing the parameters the model can return.

2. **Client-side command runner**

   - On the frontend, the returned tool calls are handled in `frontend/src/command-runner.js`, and generated variables and configs are applied to Gantt.

3. **Two modes (Chatbot and Code tab)**

   - Chat - natural language to generate styles.
   - In the `Code` tab, users can inspect and fine-tune the output.

4. **Models and limitations**
   - Works well with `gpt-5-nano` and `gpt-4.1-mini`.
   - `gpt-4.1-nano` has noticeable limitations in following the schema.
   - If experimenting with other providers, make sure they support **function calling**.

---

## Quick start

### Option 1: Production mode (Docker)

```bash
git clone https://github.com/DHTMLX/gantt-theme-builder-ai-demo.git
cd ai-theme-builder-demo
cp .env.example .env
# Edit .env with your API keys
docker compose up --build
```

Open http://localhost in your browser. The frontend runs on port 80, backend on port 3001. Make sure you have a valid OpenAI API key or another LLM provider configured in your .env.

### Option 2: Development mode (Docker)

Run with hot-reload for development:

```bash
git clone https://github.com/DHTMLX/gantt-theme-builder-ai-demo.git
cd ai-theme-builder-demo
cp .env.dev.example .env
# Edit .env with your API keys
docker compose -f docker-compose.dev.yml up --build
```

Open **http://localhost:3000** in your browser. Changes to code will auto-reload.

### Option 3: Local development (without Docker)

If you prefer running locally without Docker:

```bash
npm install
cp .env.dev.example .env
# Edit .env with your API keys

npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:3000
```

---

## Environment Variables

```bash
# LLM API configuration
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_BASE_URL=YOUR_OPENAI_BASE_URL

# Production mode (docker-compose.yml)
VITE_SOCKET_URL_DOCKER=http://localhost:3001
FRONTEND_ORIGIN_DOCKER=http://localhost

# Development mode (docker-compose.dev.yml)
VITE_SOCKET_URL_DOCKER=http://localhost:3001
FRONTEND_ORIGIN_DOCKER=http://localhost:3000
```

## Repo structure:

```bash
frontend/
├─ src/
│ ├─ gantt-utils/
│ ├─ chat-widget.js
│ ├─ theme-manager.js
│ ├─ demo-data.js
│ ├─ command-runner.js
│ ├─ style.css
│ └─ main.js
├─ vite.config.js
├─ Dockerfile
├─ Dockerfile.dev
├─ index.html
├─ vite.config.js
├─ .gitignore
├─ package-lock.json
└─ package.json

backend/
├─ .gitignore
├─ Dockerfile
├─ Dockerfile.dev
├─ logger.js
├─ schemaList.js
├─ server.js
├─ package-lock.json
└─ package.json

docker-compose.yml
docker-compose.dev.yml
.env.example
.env.dev.example
package.json
README.md
.gitignore
```

## License

Source code in this repo is released under the **MIT License**.

**DHTMLX Gantt** is a commercial library – use under a valid [DHTMLX license](https://dhtmlx.com/docs/products/licenses.shtml) or evaluation agreement.
Usage of OpenAI API (or other LLM providers) is subject to their terms of service and billing.

## Useful links

- [DHTMLX Gantt Product Page](https://dhtmlx.com/docs/products/dhtmlxGantt/)
- [DHTMLX Gantt Documentation](https://docs.dhtmlx.com/gantt/)
- [OpenAI API Docs](https://platform.openai.com/docs/)
- [Socket.IO Docs](https://socket.io/docs/v4/)
- [DHTMLX technical support forum](https://forum.dhtmlx.com/)
