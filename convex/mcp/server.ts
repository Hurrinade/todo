import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { formatTodo, formatTodoList, runMcpTool } from "./format";

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export function createRiTodoMcpServer(ctx: ActionCtx, userId: string) {
  const server = new McpServer({
    name: "ritodo",
    version: "1.0.0",
  });

  server.registerTool(
    "list_todo_lists",
    {
      title: "List todo lists",
      description:
        "List every RiTodo list available to the current user, including sections and todo counts.",
      inputSchema: z.object({}),
      annotations: readAnnotations,
    },
    () =>
      runMcpTool(async () => {
        const records = await ctx.runQuery(internal.mcp.queries.listTodoLists, {
          userId,
        });

        return { lists: records.map(formatTodoList) };
      }),
  );

  server.registerTool(
    "list_todos",
    {
      title: "List todos",
      description:
        "List accessible todos. Omit filters to load every open and completed todo across all lists.",
      inputSchema: z.object({
        list_id: z
          .string()
          .optional()
          .describe("Limit results to one list ID."),
        section_id: z
          .string()
          .optional()
          .describe("Limit results to one section ID."),
        completed: z
          .boolean()
          .optional()
          .describe("Limit results to completed or open todos."),
      }),
      annotations: readAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const records = await ctx.runQuery(internal.mcp.queries.listTodos, {
          userId,
          listId: args.list_id as Id<"todoLists"> | undefined,
          sectionId: args.section_id as Id<"todoSections"> | undefined,
          completed: args.completed,
        });

        return { todos: records.map(formatTodo) };
      }),
  );

  server.registerTool(
    "get_todo",
    {
      title: "Get todo",
      description: "Get one accessible todo with its list and section context.",
      inputSchema: z.object({
        todo_id: z.string().describe("The todo ID."),
      }),
      annotations: readAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const record = await ctx.runQuery(internal.mcp.queries.getTodo, {
          userId,
          todoId: args.todo_id as Id<"todos">,
        });

        return { todo: formatTodo(record) };
      }),
  );

  server.registerTool(
    "create_todo_list",
    {
      title: "Create todo list",
      description:
        "Create a regular or sectioned RiTodo list. Sectioned lists include the default Other section.",
      inputSchema: z.object({
        title: z.string().describe("The list title."),
        kind: z.enum(["regular", "sectioned"]).default("regular"),
        emoji: z.string().optional().describe("An optional list emoji."),
      }),
      annotations: writeAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const listId = await ctx.runMutation(
          internal.mutations.todoLists.createForUser,
          {
            userId,
            title: args.title,
            kind: args.kind,
            emoji: args.emoji,
          },
        );

        return { list_id: listId };
      }),
  );

  server.registerTool(
    "rename_todo_list",
    {
      title: "Rename todo list",
      description: "Rename an accessible RiTodo list.",
      inputSchema: z.object({
        list_id: z.string().describe("The list ID."),
        title: z.string().describe("The new list title."),
      }),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        await ctx.runMutation(internal.mutations.todoLists.renameForUser, {
          userId,
          listId: args.list_id as Id<"todoLists">,
          title: args.title,
        });

        return { list_id: args.list_id, title: args.title };
      }),
  );

  server.registerTool(
    "create_todo_section",
    {
      title: "Create todo section",
      description: "Create a section in an accessible sectioned list.",
      inputSchema: z.object({
        list_id: z.string().describe("The sectioned list ID."),
        title: z.string().describe("The section title."),
      }),
      annotations: writeAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const sectionId = await ctx.runMutation(
          internal.mutations.todoSections.createForUser,
          {
            userId,
            listId: args.list_id as Id<"todoLists">,
            title: args.title,
          },
        );

        return { section_id: sectionId, list_id: args.list_id };
      }),
  );

  server.registerTool(
    "rename_todo_section",
    {
      title: "Rename todo section",
      description:
        "Rename a non-default section. The default Other section cannot be renamed.",
      inputSchema: z.object({
        section_id: z.string().describe("The section ID."),
        title: z.string().describe("The new section title."),
      }),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        await ctx.runMutation(internal.mutations.todoSections.renameForUser, {
          userId,
          sectionId: args.section_id as Id<"todoSections">,
          title: args.title,
        });

        return { section_id: args.section_id, title: args.title };
      }),
  );

  server.registerTool(
    "create_todo",
    {
      title: "Create todo",
      description:
        "Create a todo in a list, optionally with a plain-text note and target section.",
      inputSchema: z.object({
        list_id: z.string().describe("The list ID."),
        title: z.string().describe("The todo title."),
        description: z
          .string()
          .optional()
          .describe("An optional plain-text note."),
        section_id: z
          .string()
          .optional()
          .describe("A section ID for sectioned lists; defaults to Other."),
      }),
      annotations: writeAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const todoId = await ctx.runMutation(
          internal.mutations.todos.createForUser,
          {
            userId,
            listId: args.list_id as Id<"todoLists">,
            sectionId: args.section_id as Id<"todoSections"> | undefined,
            title: args.title,
            description: args.description,
          },
        );
        const record = await ctx.runQuery(internal.mcp.queries.getTodo, {
          userId,
          todoId,
        });

        return { todo: formatTodo(record) };
      }),
  );

  server.registerTool(
    "update_todo",
    {
      title: "Update todo",
      description:
        "Update a todo title or plain-text note. Set description to null to clear the note.",
      inputSchema: z
        .object({
          todo_id: z.string().describe("The todo ID."),
          title: z.string().optional().describe("A replacement title."),
          description: z
            .string()
            .nullable()
            .optional()
            .describe("A replacement note, or null to clear it."),
        })
        .refine(
          (args) => args.title !== undefined || args.description !== undefined,
          { message: "Provide a title or description to update." },
        ),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const todoId = args.todo_id as Id<"todos">;
        await ctx.runMutation(internal.mutations.todos.updateForUser, {
          userId,
          todoId,
          title: args.title,
          description: args.description,
        });
        const record = await ctx.runQuery(internal.mcp.queries.getTodo, {
          userId,
          todoId,
        });

        return { todo: formatTodo(record) };
      }),
  );

  server.registerTool(
    "move_todo",
    {
      title: "Move todo",
      description:
        "Move a todo to the end of a target section while preserving its completion state.",
      inputSchema: z.object({
        todo_id: z.string().describe("The todo ID."),
        section_id: z.string().describe("The target section ID."),
      }),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const todoId = args.todo_id as Id<"todos">;
        await ctx.runMutation(
          internal.mutations.todos.moveToSectionEndForUser,
          {
            userId,
            todoId,
            targetSectionId: args.section_id as Id<"todoSections">,
          },
        );
        const record = await ctx.runQuery(internal.mcp.queries.getTodo, {
          userId,
          todoId,
        });

        return { todo: formatTodo(record) };
      }),
  );

  server.registerTool(
    "set_todo_completed",
    {
      title: "Set todo completion",
      description: "Explicitly mark a todo as completed or not completed.",
      inputSchema: z.object({
        todo_id: z.string().describe("The todo ID."),
        completed: z.boolean().describe("The desired completion state."),
      }),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const todoId = args.todo_id as Id<"todos">;
        await ctx.runMutation(internal.mutations.todos.setCompletedForUser, {
          userId,
          todoId,
          completed: args.completed,
        });
        const record = await ctx.runQuery(internal.mcp.queries.getTodo, {
          userId,
          todoId,
        });

        return { todo: formatTodo(record) };
      }),
  );

  server.registerTool(
    "delete_todo",
    {
      title: "Delete todo",
      description: "Permanently delete an accessible todo.",
      inputSchema: z.object({
        todo_id: z.string().describe("The todo ID."),
      }),
      annotations: {
        ...writeAnnotations,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    (args) =>
      runMcpTool(async () => {
        await ctx.runMutation(internal.mutations.todos.removeForUser, {
          userId,
          todoId: args.todo_id as Id<"todos">,
        });

        return { todo_id: args.todo_id, deleted: true };
      }),
  );

  return server;
}
