"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Status, Role } = require("../../src/domain/model");
const { createApplication } = require("../../src/application");

function memoryRepositories() {
  const data = { projects: [], members: [], tasks: [], comments: [], updates: 0, taskInserts: 0 };

  return {
    data,
    projects: {
      async insert(project) {
        data.projects.push(project);
        return project;
      },
      async findById(id) {
        return data.projects.find((project) => project.id === id) || null;
      },
      async deleteById(id) {
        data.projects = data.projects.filter((project) => project.id !== id);
      },
    },
    members: {
      async insert(member) {
        data.members.push(member);
        return member;
      },
      async findById(id) {
        return data.members.find((member) => member.id === id) || null;
      },
      async findByProjectId(projectId) {
        return data.members.filter((member) => member.projectId === projectId);
      },
      async deleteByProjectId(projectId) {
        data.members = data.members.filter((member) => member.projectId !== projectId);
      },
    },
    tasks: {
      async insert(task) {
        data.taskInserts += 1;
        data.tasks.push(task);
        return task;
      },
      async update(task) {
        data.updates += 1;
        const index = data.tasks.findIndex((stored) => stored.id === task.id);
        data.tasks[index] = task;
        return task;
      },
      async findById(id) {
        return data.tasks.find((task) => task.id === id) || null;
      },
      async findByProjectId(projectId) {
        return data.tasks.filter((task) => task.projectId === projectId);
      },
      async findByAssigneeId(assigneeId) {
        return data.tasks
          .filter((task) => task.assigneeId === assigneeId)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      },
      async deleteById(id) {
        data.tasks = data.tasks.filter((task) => task.id !== id);
      },
      async deleteByProjectId(projectId) {
        data.tasks = data.tasks.filter((task) => task.projectId !== projectId);
      },
    },
    comments: {
      async insert(comment) {
        data.comments.push({ ...comment });
        return comment;
      },
      async findByTaskId(taskId) {
        return data.comments
          .filter((comment) => comment.taskId === taskId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async deleteByTaskId(taskId) {
        data.comments = data.comments.filter((comment) => comment.taskId !== taskId);
      },
    },
  };
}

test("a rejected task is not stored", async () => {
  const repositories = memoryRepositories();
  const app = createApplication(repositories);
  const created = await app.createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      { name: "Sam", role: Role.MEMBER },
    ],
  });
  const manager = created.value.members.find((member) => member.role === Role.MANAGER);

  const rejected = await app.addTask({
    actorId: manager.id,
    title: "  ",
    dueDate: "2026-12-01",
    projectId: created.value.project.id,
  });

  assert.equal(rejected.ok, false);
  assert.equal(repositories.data.taskInserts, 0);
  assert.equal(repositories.data.tasks.length, 0);
});

test("a rejected status change leaves the stored status unchanged", async () => {
  const repositories = memoryRepositories();
  const app = createApplication(repositories);
  const created = await app.createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      { name: "Sam", role: Role.MEMBER },
    ],
  });
  const manager = created.value.members.find((member) => member.role === Role.MANAGER);
  const member = created.value.members.find((person) => person.name === "Sam");
  const task = await app.addTask({
    actorId: manager.id,
    title: "Set the beams",
    dueDate: "2026-12-01",
    projectId: created.value.project.id,
  });
  await app.assignTask({ actorId: manager.id, taskId: task.value.id, assigneeId: member.id });
  repositories.data.updates = 0;

  const rejected = await app.changeStatus({
    actorId: member.id,
    taskId: task.value.id,
    nextStatus: Status.DONE,
  });

  assert.equal(rejected.ok, false);
  assert.equal(rejected.value, undefined);
  assert.equal(repositories.data.updates, 0);
  assert.equal(repositories.data.tasks[0].status, Status.TODO);
});

test("an accepted status change is saved and the board groups it", async () => {
  const repositories = memoryRepositories();
  const app = createApplication(repositories);
  const created = await app.createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      { name: "Sam", role: Role.MEMBER },
    ],
  });
  const projectId = created.value.project.id;
  const manager = created.value.members.find((member) => member.role === Role.MANAGER);
  const member = created.value.members.find((person) => person.name === "Sam");
  const task = await app.addTask({
    actorId: manager.id,
    title: "Set the beams",
    dueDate: "2026-12-01",
    projectId,
  });
  await app.assignTask({ actorId: manager.id, taskId: task.value.id, assigneeId: member.id });

  const moved = await app.changeStatus({
    actorId: member.id,
    taskId: task.value.id,
    nextStatus: Status.IN_PROGRESS,
  });
  const board = await app.loadBoard({ projectId });
  const mine = await app.listMyTasks({ memberId: member.id });

  assert.equal(moved.ok, true);
  assert.equal(moved.value.status, Status.IN_PROGRESS);
  assert.deepEqual(
    board.value.board[Status.IN_PROGRESS].map((item) => item.id),
    [task.value.id]
  );
  assert.deepEqual(
    mine.value.tasks.map((item) => item.id),
    [task.value.id]
  );
});

test("a manager can delete a task and its comments, and a member cannot", async () => {
  const repositories = memoryRepositories();
  const app = createApplication(repositories);
  const created = await app.createProject({
    name: "Bridge",
    members: [
      { name: "Ada", role: Role.MANAGER },
      { name: "Sam", role: Role.MEMBER },
    ],
  });
  const projectId = created.value.project.id;
  const manager = created.value.members.find((member) => member.role === Role.MANAGER);
  const member = created.value.members.find((person) => person.name === "Sam");
  const task = await app.addTask({
    actorId: manager.id,
    projectId,
    title: "Scrap the formwork",
    dueDate: "2026-12-25",
  });
  await app.assignTask({ actorId: manager.id, taskId: task.value.id, assigneeId: member.id });
  await app.addComment({ actorId: member.id, taskId: task.value.id, text: "Noted" });
  const before = await app.listMyTasks({ memberId: member.id });
  assert.deepEqual(
    before.value.tasks.map((item) => item.id),
    [task.value.id]
  );

  const rejected = await app.deleteTask({ actorId: member.id, taskId: task.value.id });
  assert.equal(rejected.ok, false);
  assert.equal(repositories.data.tasks.length, 1);
  assert.equal(repositories.data.comments.length, 1);

  const removed = await app.deleteTask({ actorId: manager.id, taskId: task.value.id });
  const after = await app.listMyTasks({ memberId: member.id });
  const board = await app.loadBoard({ projectId });
  assert.equal(removed.ok, true);
  assert.equal(removed.value.title, "Scrap the formwork");
  assert.deepEqual(after.value.tasks, []);
  assert.equal(board.value.board["To Do"].length, 0);
  assert.equal(repositories.data.tasks.length, 0);
  assert.equal(repositories.data.comments.length, 0);
});

test("a manager can delete the whole project, and a member cannot", async () => {
  const repositories = memoryRepositories();
  const app = createApplication(repositories);
  const created = await app.createProject({
    name: "Yard",
    members: [
      { name: "Ada", role: Role.MANAGER },
      { name: "Sam", role: Role.MEMBER },
    ],
  });
  const projectId = created.value.project.id;
  const manager = created.value.members.find((member) => member.role === Role.MANAGER);
  const member = created.value.members.find((person) => person.name === "Sam");
  const task = await app.addTask({
    actorId: manager.id,
    projectId,
    title: "Clear the yard",
    dueDate: "2026-12-25",
  });
  await app.addComment({ actorId: member.id, taskId: task.value.id, text: "Started" });

  const rejected = await app.deleteProject({ actorId: member.id, projectId });
  assert.equal(rejected.ok, false);
  assert.equal(repositories.data.projects.length, 1);
  assert.equal(repositories.data.tasks.length, 1);

  const removed = await app.deleteProject({ actorId: manager.id, projectId });
  assert.equal(removed.ok, true);
  assert.equal(removed.value.name, "Yard");
  assert.equal(repositories.data.projects.length, 0);
  assert.equal(repositories.data.members.length, 0);
  assert.equal(repositories.data.tasks.length, 0);
  assert.equal(repositories.data.comments.length, 0);
});
