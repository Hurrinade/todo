import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { MAX_TODOS_PER_BATCH } from "../shared/todo";
import {
  formatTodo,
  formatTodoList,
  runMcpTool,
  todoListOutputSchema,
  todoOutputSchema,
} from "./format";

const DEFAULT_LIST_TODOS_LIMIT = 50;
const MAX_LIST_TODOS_LIMIT = 100;

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

const newTodoSchema = z.object({
  list_id: z.string().describe("The list ID."),
  title: z.string().describe("The todo title."),
  description: z.string().optional().describe("An optional plain-text note."),
  section_id: z
    .string()
    .optional()
    .describe("A section ID for sectioned lists; defaults to Other."),
});

const singleTodoOutputSchema = z.object({ todo: todoOutputSchema });

export function createRiTodoMcpServer(ctx: ActionCtx, userId: string) {
  const server = new McpServer({
    name: "ritodo",
    version: "1.1.0",
  });

  server.registerTool(
    "list_todo_lists",
    {
      title: "List todo lists",
      description:
        "List every RiTodo list available to the current user, including sections and todo counts.",
      inputSchema: z.object({}),
      outputSchema: z.object({ lists: z.array(todoListOutputSchema) }),
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
      description: `List todos one page at a time, in list order. Returns open todos unless completed is true. Omit list_id and section_id to walk every list. Pages hold up to limit todos (default ${DEFAULT_LIST_TODOS_LIMIT}, max ${MAX_LIST_TODOS_LIMIT}) from a single list and can be shorter; pass next_cursor back with the same filters until it is null.`,
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
          .default(false)
          .describe("List completed todos instead of open ones."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIST_TODOS_LIMIT)
          .default(DEFAULT_LIST_TODOS_LIMIT)
          .describe("The most todos to return in this page."),
        cursor: z
          .string()
          .optional()
          .describe("The next_cursor from the previous page."),
      }),
      outputSchema: z.object({
        todos: z.array(todoOutputSchema),
        next_cursor: z.string().nullable(),
      }),
      annotations: readAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const result = await ctx.runQuery(internal.mcp.queries.listTodos, {
          userId,
          listId: args.list_id,
          sectionId: args.section_id,
          completed: args.completed,
          limit: args.limit,
          cursor: args.cursor,
        });

        return {
          todos: result.records.map(formatTodo),
          next_cursor: result.nextCursor,
        };
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
      outputSchema: singleTodoOutputSchema,
      annotations: readAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const record = await ctx.runQuery(internal.mcp.queries.getTodo, {
          userId,
          todoId: args.todo_id,
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
      outputSchema: z.object({ list_id: z.string() }),
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
      outputSchema: z.object({ list_id: z.string(), title: z.string() }),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const title = await ctx.runMutation(
          internal.mutations.todoLists.renameForUser,
          {
            userId,
            listId: args.list_id,
            title: args.title,
          },
        );

        return { list_id: args.list_id, title };
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
      outputSchema: z.object({ section_id: z.string(), list_id: z.string() }),
      annotations: writeAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const sectionId = await ctx.runMutation(
          internal.mutations.todoSections.createForUser,
          {
            userId,
            listId: args.list_id,
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
      outputSchema: z.object({ section_id: z.string(), title: z.string() }),
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const title = await ctx.runMutation(
          internal.mutations.todoSections.renameForUser,
          {
            userId,
            sectionId: args.section_id,
            title: args.title,
          },
        );

        return { section_id: args.section_id, title };
      }),
  );

  server.registerTool(
    "create_todo",
    {
      title: "Create todo",
      description:
        "Create a todo at the top of a list or section, optionally with a plain-text note. Use create_todos to add several at once.",
      inputSchema: newTodoSchema,
      outputSchema: singleTodoOutputSchema,
      annotations: writeAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const [record] = await ctx.runMutation(
          internal.mutations.todos.createManyForUser,
          { userId, todos: [toNewTodoArgs(args)] },
        );

        return { todo: formatTodo(record) };
      }),
  );

  server.registerTool(
    "create_todos",
    {
      title: "Create todos",
      description: `Create up to ${MAX_TODOS_PER_BATCH} todos in one atomic call. They can target different lists and land at the top of each list or section in the given order. If any todo is invalid, none are created.`,
      inputSchema: z.object({
        todos: z.array(newTodoSchema).min(1).max(MAX_TODOS_PER_BATCH),
      }),
      outputSchema: z.object({ todos: z.array(todoOutputSchema) }),
      annotations: writeAnnotations,
    },
    (args) =>
      runMcpTool(async () => {
        const records = await ctx.runMutation(
          internal.mutations.todos.createManyForUser,
          { userId, todos: args.todos.map(toNewTodoArgs) },
        );

        return { todos: records.map(formatTodo) };
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
      outputSchema: singleTodoOutputSchema,
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const record = await ctx.runMutation(
          internal.mutations.todos.updateForUser,
          {
            userId,
            todoId: args.todo_id,
            title: args.title,
            description: args.description,
          },
        );

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
      outputSchema: singleTodoOutputSchema,
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const record = await ctx.runMutation(
          internal.mutations.todos.moveToSectionEndForUser,
          {
            userId,
            todoId: args.todo_id,
            targetSectionId: args.section_id,
          },
        );

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
      outputSchema: singleTodoOutputSchema,
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    (args) =>
      runMcpTool(async () => {
        const record = await ctx.runMutation(
          internal.mutations.todos.setCompletedForUser,
          {
            userId,
            todoId: args.todo_id,
            completed: args.completed,
          },
        );

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
      outputSchema: z.object({
        todo_id: z.string(),
        deleted: z.literal(true),
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
          todoId: args.todo_id,
        });

        return { todo_id: args.todo_id, deleted: true };
      }),
  );

  return server;
}

function toNewTodoArgs(todo: z.output<typeof newTodoSchema>) {
  return {
    listId: todo.list_id,
    sectionId: todo.section_id,
    title: todo.title,
    description: todo.description,
  };
}
