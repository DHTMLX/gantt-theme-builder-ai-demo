// ---------------------------------------------------------------------------
// JSON schemas for OpenAI "function-calling" mode
// ---------------------------------------------------------------------------
export const schemaList = [
  {
    type: "function",
    function: {
      name: "set_theme",
      description:
        `Update the Gantt chart theme. **variables** parameter MUST contain the **current theme**, even if only some are changed. 
        If current theme doesn't have variable according to users question add it. If it exists update. 
        **Do NOT** omit any variables unless the user explicitly requests a full reset.  **configs** is a required list of layout/behavior overrides.`,
      parameters: {
        type: "object",
        properties: {
          variables: {
            type: "array",
            description:
              "list of CSS variables for the current theme. Change only those explicitly mentioned by the user; keep the rest untouched.",
            items: {
              type: "object",
              properties: {
                key: { type: "string", description: "Name of the css variable (e.g. --dhx-gantt-task-blue)" },
                value: { type: "string", description: "Value of the css variable (e.g. #e0e0e0)" },
              },
              required: ["key", "value"],
            },
            minItems: 0,
          },
          configs: {
            type: "array",
            description:
              "Complete list of config settings. Modify only those the user changed; preserve the rest. Omit entirely if no configs added or changed.",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the config, e.g. 'link_line_width', 'row_height'",
                },
                value: {
                  type: ["number", "boolean"],
                  description: "New value for the config (pixels or boolean)",
                },
              },
              required: ["name", "value"],
            },
            minItems: 0,
          },
        },
        required: ["variables", "configs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reset_theme",
      description: "Reset the current Gantt theme by clearing all custom CSS variables and configs (back to defaults).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];
