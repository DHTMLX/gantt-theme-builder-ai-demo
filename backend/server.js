import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import OpenAI from "openai";
import { schemaList } from "./schemaList.js";
import { log } from "./logger.js";
import variables from "./variablesList.json" with {type: 'json'};
import configListJSON from "./configList.json" with {type: 'json'};
import { getMessagesHistoryByClient, sessionMessagesByClient } from "./helper.js";

const app = express();
const http = createServer(app);
const io = new Server(http, { cors: { origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" } });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

app.use(express.static("../frontend/dist"));

io.on("connection", (socket) => {
  socket.on("user_msg", async (text) => {
    const { message, theme } = JSON.parse(text);
    const ganttTheme = `Here is the current gantt theme: ${JSON.stringify(theme)}`;
    const questionContent = `Here is the question: ${message}`;
    const messages = getMessagesHistoryByClient(socket.id, generateSystemPrompt());
    messages.push({ role: "user", content: ganttTheme });
    messages.push({ role: "user", content: questionContent });

    const reply = await talkToLLM(messages);
    // if assistant ask additional question
    if (reply.assistant_msg) socket.emit("assistant_msg", reply.assistant_msg);
    // if assistant used tool_call
    if (reply.call){
      messages.push({
        role: "assistant",
        tool_calls: reply.tool_calls,
        content: reply.content ?? "",
      });
      messages.push({
        role: "tool",
        tool_call_id: reply.tool_call_id,
        content: reply.content ?? "",
      });
      socket.emit("tool_call", reply.call);
    } 
  });
  socket.on("disconnect", () => {
    sessionMessagesByClient.delete(socket.id);
  });
});

function buildVariablesList() {
  return variables.map((variable) => `${variable.name}: ${variable.defaultValue} -- ${variable.description}`).join("\n");
}

function buildConfigsList(configArr) {
  return configArr.map(config => `${config.name}: ${config.description}`).join('\n')
}

function generateSystemPrompt() {
  const varList = buildVariablesList();
  const availableConfigs = buildConfigsList(configListJSON);

  return `You are **ProjectGanttAssistant**, your goal is to help the user operating DHTMLX Gantt chart using natural language commands.

Today is ${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}

Always use one tool call for one command.

Your replies will be displayed in chat side panel, so try to be short and clear. You can use markdown formatting.

You can customize the Gantt appearance using these CSS list:
${varList}

Here are the available config options (gantt.config.*):
${availableConfigs}

When changing the current theme in some way (for example, making the task bars lighter) or adding new styles to the current theme, use the active theme CSS variables created earlier and update its variables according to the user's requirements, or add new variables.

Rules for changing the current theme:
1. **Never** delete, omit, or reorder existing variables from the theme (key and value must mot change inside variables).
2. Always return the **entire list of variables**, even if only one was changed.
3. Modify **only** those variables that are explicitly mentioned or clearly implied by the user's message.
4. If the user says something general (e.g. "make it darker"), update only the most relevant variables, but still preserve all others.

For example:
If the user says “Make the task background lighter,” you should only change the value of --dhx-gantt-task-background (if that's the relevant variable), and return all others unchanged.

Remember to use tools in your replies.
`;
}

async function talkToLLM(request) {
  log.success("calling llm");
  const res = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: request,
    tools: schemaList,
  });

  log.success("Got LLM reply");
  log.info(
    `Processing took ${res.usage.approximate_total}. Prompt tokens: ${res.usage.prompt_tokens}, response tokens: ${res.usage.completion_tokens}, perf ${res.usage["response_token/s"]}T/s`
  );

  const msg = res.choices[0].message;
  let content = msg.content;
  let calls = msg.tool_calls;


  const toolCall = calls ? calls[0] : "";

  log.info(`output: ${content}`);
  log.info(`tool call: ${JSON.stringify(toolCall)}`);
  return {
    assistant_msg: content,
    call: toolCall
      ? JSON.stringify({ cmd: toolCall.function.name, params: JSON.parse(toolCall.function.arguments) })
      : "",
    tool_call_id: msg.tool_calls ? msg.tool_calls[0].id : "",
    tool_calls: msg.tool_calls ? msg.tool_calls : "",
  };
}

http.listen(3001, () => console.log("API on :3001"));
