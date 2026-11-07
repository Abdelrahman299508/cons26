"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Status, Role } = require("../../src/domain/model");
const {
  createProject,
  deleteProject,
  addTask,
  assignTask,
  deleteTask,
  changeStatus,
  addComment,
  commentsInCreationOrder,
  groupTasksByStatus,
  listMyTasks,
} = require("../../src/domain/rules");

function team() {
  const created = createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      { name: "Sam", role: Role.MEMBER },
      { name: "Noah", role: Role.MEMBER },
    ],
  });
  assert.equal(created.ok, true);
  const { project, members } = created.value;
  return {
    project,
    manager: members.find((member) => member.role === Role.MANAGER),
    member: members.find((member) => member.name === "Sam"),
    other: members.find((member) => member.name === "Noah"),
  };
}

function openTask(manager, project, title = "Set the beams", dueDate = "2026-12-01") {
  const result = addTask({
    actor: manager,
    title,
    dueDate,
    projectId: project.id,
    today: "2026-11-07",
  });
  assert.equal(result.ok, true);
  return result.value;
}

test("a manager can create a project whose members belong to that project", () => {
  const { project, manager, member } = team();
  assert.equal(project.name, "Bridge");
  assert.equal(manager.projectId, project.id);
  assert.equal(member.projectId, project.id);
  assert.equal(member.role, Role.MEMBER);
});

test("only a manager of the project can delete it", () => {
  const { project, manager, member } = team();
  const rejected = deleteProject({ project, actor: member });
  assert.deepEqual(rejected, {
    ok: false,
    error: "Only a manager of this project can delete it",
  });
  assert.equal(project.name, "Bridge");

  const accepted = deleteProject({ project, actor: manager });
  assert.deepEqual(accepted, { ok: true, value: { id: project.id } });
  assert.equal(project.name, "Bridge");
});

test("a project can include seven members and no more", () => {
  const names = ["Sam", "Noah", "Mia", "Leo", "Ivy", "Omar", "Ren"];
  const accepted = createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      ...names.map((name) => ({ name, role: Role.MEMBER })),
    ],
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value.members.filter((member) => member.role === Role.MEMBER).length, 7);

  const rejected = createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      ...names.map((name) => ({ name, role: Role.MEMBER })),
      { name: "Eve", role: Role.MEMBER },
    ],
  });
  assert.deepEqual(rejected, { ok: false, error: "A project can have at most seven members" });
});

test("a project without a manager is rejected", () => {
  const result = createProject({
    name: "Bridge",
    members: [{ name: "Sam", role: Role.MEMBER }],
  });
  assert.deepEqual(result, { ok: false, error: "Project needs a manager" });
});

test("an empty task title is rejected and no task is returned", () => {
  const { project, manager } = team();
  const result = addTask({
    actor: manager,
    title: "   ",
    dueDate: "2026-12-01",
    projectId: project.id,
  });
  assert.deepEqual(result, { ok: false, error: "Title is required" });
});

test("a due date in the past is rejected and no task is returned", () => {
  const { project, manager } = team();
  const result = addTask({
    actor: manager,
    title: "Old concrete",
    dueDate: "2026-11-06",
    projectId: project.id,
    today: "2026-11-07",
  });
  assert.deepEqual(result, { ok: false, error: "Due date cannot be in the past" });
});

test("a due date of today is accepted", () => {
  const { project, manager } = team();
  const task = openTask(manager, project, "Pour today", "2026-11-07");
  assert.equal(task.dueDate, "2026-11-07");
});

test("a selected day-first due date is stored as a calendar date", () => {
  const { project, manager } = team();
  const task = openTask(manager, project, "Check the date", "15/12/2026");
  assert.equal(task.dueDate, "2026-12-15");
});

test("a task keeps one project, a title, a due date, and starts at To Do", () => {
  const { project, manager } = team();
  const task = openTask(manager, project);
  assert.equal(task.projectId, project.id);
  assert.equal(task.title, "Set the beams");
  assert.equal(task.dueDate, "2026-12-01");
  assert.equal(task.status, Status.TODO);
  assert.equal(task.assigneeId, null);
});

test("a member of the project cannot add a task", () => {
  const { project, member } = team();
  const result = addTask({
    actor: member,
    title: "Set the beams",
    dueDate: "2026-12-01",
    projectId: project.id,
  });
  assert.equal(result.ok, false);
  assert.equal(result.value, undefined);
});

test("a task can be assigned only to a member of its project", () => {
  const { project, manager, member } = team();
  const task = openTask(manager, project);
  const outsider = { id: "outsider", projectId: "other-project", role: Role.MEMBER };

  const rejected = assignTask({ task, actor: manager, assignee: outsider });
  assert.deepEqual(rejected, {
    ok: false,
    error: "Assignee must be a member of this project",
  });
  assert.equal(task.assigneeId, null);

  const accepted = assignTask({ task, actor: manager, assignee: member });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value.assigneeId, member.id);
  assert.equal(task.assigneeId, null);
});

test("only a manager of the project can delete a task", () => {
  const { project, manager, member } = team();
  const task = openTask(manager, project);
  const rejected = deleteTask({ task, actor: member });
  assert.deepEqual(rejected, {
    ok: false,
    error: "Only a manager of this project can delete a task",
  });
  assert.equal(task.title, "Set the beams");

  const accepted = deleteTask({ task, actor: manager });
  assert.deepEqual(accepted, { ok: true, value: { id: task.id } });
  assert.equal(task.title, "Set the beams");
});

test("the assigned member can move a task from To Do to In Progress", () => {
  const { project, manager, member } = team();
  const task = assignTask({
    task: openTask(manager, project),
    actor: manager,
    assignee: member,
  }).value;

  const result = changeStatus({ task, actor: member, nextStatus: Status.IN_PROGRESS });

  assert.equal(result.ok, true);
  assert.equal(result.value.status, Status.IN_PROGRESS);
  assert.equal(task.status, Status.TODO);
});

test("a skipped or backward status change is rejected and describes no new status", () => {
  const { project, manager, member } = team();
  const task = assignTask({
    task: openTask(manager, project),
    actor: manager,
    assignee: member,
  }).value;

  const skipped = changeStatus({ task, actor: member, nextStatus: Status.DONE });
  assert.deepEqual(skipped, {
    ok: false,
    error: "Status can only move from To Do to In Progress to Done",
  });
  assert.equal(task.status, Status.TODO);

  const started = changeStatus({
    task,
    actor: member,
    nextStatus: Status.IN_PROGRESS,
  }).value;
  const backward = changeStatus({
    task: started,
    actor: member,
    nextStatus: Status.TODO,
  });
  assert.equal(backward.ok, false);
  assert.equal(backward.value, undefined);
  assert.equal(started.status, Status.IN_PROGRESS);
});

test("another member cannot change the task status", () => {
  const { project, manager, member, other } = team();
  const task = assignTask({
    task: openTask(manager, project),
    actor: manager,
    assignee: member,
  }).value;

  const result = changeStatus({ task, actor: other, nextStatus: Status.IN_PROGRESS });

  assert.equal(result.ok, false);
  assert.equal(result.value, undefined);
  assert.equal(task.status, Status.TODO);
});

test("a comment keeps its author, text, and time, and cannot be changed", () => {
  const { project, manager, member } = team();
  const task = openTask(manager, project);
  const result = addComment({
    task,
    author: member,
    text: "  Beams arrived  ",
    time: "2026-11-07T09:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.authorId, member.id);
  assert.equal(result.value.text, "Beams arrived");
  assert.equal(result.value.createdAt, "2026-11-07T09:00:00.000Z");
  assert.equal(Object.isFrozen(result.value), true);
  assert.throws(() => {
    result.value.text = "changed";
  });
});

test("comments are ordered by the time they were created", () => {
  const comments = commentsInCreationOrder([
    { createdAt: "2026-11-07T12:00:00.000Z", text: "second" },
    { createdAt: "2026-11-07T09:00:00.000Z", text: "first" },
  ]);
  assert.deepEqual(
    comments.map((comment) => comment.text),
    ["first", "second"]
  );
});

test("the board groups tasks by status", () => {
  const tasks = [
    { id: "1", status: Status.TODO },
    { id: "2", status: Status.DONE },
    { id: "3", status: Status.IN_PROGRESS },
    { id: "4", status: Status.TODO },
  ];
  const board = groupTasksByStatus(tasks);
  assert.deepEqual(
    board[Status.TODO].map((task) => task.id),
    ["1", "4"]
  );
  assert.deepEqual(
    board[Status.IN_PROGRESS].map((task) => task.id),
    ["3"]
  );
  assert.deepEqual(
    board[Status.DONE].map((task) => task.id),
    ["2"]
  );
});

test("my tasks lists only that member's tasks, earliest due date first", () => {
  const { member, other } = team();
  const tasks = [
    { id: "late", assigneeId: member.id, dueDate: "2026-12-20" },
    { id: "theirs", assigneeId: other.id, dueDate: "2026-11-01" },
    { id: "soon", assigneeId: member.id, dueDate: "2026-11-15" },
  ];

  const mine = listMyTasks(tasks, member.id);

  assert.deepEqual(
    mine.map((task) => task.id),
    ["soon", "late"]
  );
});
