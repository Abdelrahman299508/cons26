"use strict";

const crypto = require("crypto");
const { Status, STATUS_ORDER, Role, MAX_MEMBERS } = require("./model");

function ok(value) {
  return { ok: true, value };
}

function fail(error) {
  return { ok: false, error };
}

function requireText(value, error) {
  if (typeof value !== "string" || value.trim() === "") {
    return fail(error);
  }
  return ok(value.trim());
}

function calendarToday(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function requireDueDate(value, today = calendarToday()) {
  if (value == null || value === "") {
    return fail("Due date is required");
  }
  if (typeof value !== "string") {
    return fail("Due date is invalid");
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  const local = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(value.trim());
  let year;
  let month;
  let day;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (local) {
    const first = Number(local[1]);
    const second = Number(local[2]);
    year = Number(local[3]);
    if (first > 12) {
      day = first;
      month = second;
    } else if (second > 12) {
      month = first;
      day = second;
    } else {
      day = first;
      month = second;
    }
  } else {
    return fail("Due date is invalid");
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!real) {
    return fail("Due date is invalid");
  }
  const stored = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (stored < today) {
    return fail("Due date cannot be in the past");
  }
  return ok(stored);
}

function isManagerOf(actor, projectId) {
  return Boolean(
    actor &&
      projectId &&
      actor.role === Role.MANAGER &&
      actor.projectId === projectId
  );
}

function createMember({ id, name, role, projectId }) {
  const memberName = requireText(name, "Member name is required");
  if (!memberName.ok) {
    return memberName;
  }
  if (role !== Role.MANAGER && role !== Role.MEMBER) {
    return fail("Member role must be manager or member");
  }
  if (!projectId) {
    return fail("Member must belong to one project");
  }
  return ok({
    id: id || crypto.randomUUID(),
    name: memberName.value,
    role,
    projectId,
  });
}

function createProject({ name, members }) {
  const projectName = requireText(name, "Project name is required");
  if (!projectName.ok) {
    return projectName;
  }
  if (!Array.isArray(members) || members.length === 0) {
    return fail("Project needs a manager");
  }

  const projectId = crypto.randomUUID();
  const builtMembers = [];
  for (const member of members) {
    const built = createMember({ ...member, projectId });
    if (!built.ok) {
      return built;
    }
    builtMembers.push(built.value);
  }
  if (!builtMembers.some((member) => member.role === Role.MANAGER)) {
    return fail("Project needs a manager");
  }
  const memberCount = builtMembers.filter((member) => member.role === Role.MEMBER).length;
  if (memberCount > MAX_MEMBERS) {
    return fail("A project can have at most seven members");
  }

  return ok({
    project: { id: projectId, name: projectName.value },
    members: builtMembers,
  });
}

function deleteProject({ project, actor }) {
  if (!project || !project.id) {
    return fail("Project not found");
  }
  if (!isManagerOf(actor, project.id)) {
    return fail("Only a manager of this project can delete it");
  }
  return ok({ id: project.id });
}

function addTask({ actor, title, dueDate, projectId, today }) {
  if (!projectId) {
    return fail("Task must belong to one project");
  }
  if (!isManagerOf(actor, projectId)) {
    return fail("Only a manager of this project can add a task");
  }
  const taskTitle = requireText(title, "Title is required");
  if (!taskTitle.ok) {
    return taskTitle;
  }
  const taskDueDate = requireDueDate(dueDate, today);
  if (!taskDueDate.ok) {
    return taskDueDate;
  }

  return ok({
    id: crypto.randomUUID(),
    projectId,
    title: taskTitle.value,
    dueDate: taskDueDate.value,
    status: Status.TODO,
    assigneeId: null,
  });
}

function assignTask({ task, actor, assignee }) {
  if (!task || !task.projectId) {
    return fail("Task must belong to one project");
  }
  if (!isManagerOf(actor, task.projectId)) {
    return fail("Only a manager of this project can assign a task");
  }
  if (!assignee || !assignee.id || assignee.projectId !== task.projectId) {
    return fail("Assignee must be a member of this project");
  }
  return ok({ ...task, assigneeId: assignee.id });
}

function deleteTask({ task, actor }) {
  if (!task || !task.id || !task.projectId) {
    return fail("Task must belong to one project");
  }
  if (!isManagerOf(actor, task.projectId)) {
    return fail("Only a manager of this project can delete a task");
  }
  return ok({ id: task.id });
}

function changeStatus({ task, actor, nextStatus }) {
  if (!task || !actor || !task.assigneeId || actor.id !== task.assigneeId) {
    return fail("Only the assigned member can change the status");
  }
  const currentIndex = STATUS_ORDER.indexOf(task.status);
  const nextIndex = STATUS_ORDER.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    return fail("Status can only move from To Do to In Progress to Done");
  }
  return ok({ ...task, status: nextStatus });
}

function addComment({ task, author, text, time }) {
  if (!task || !task.id || !task.projectId) {
    return fail("Task must belong to one project");
  }
  if (!author || !author.id || author.projectId !== task.projectId) {
    return fail("Comment author must be a member of this project");
  }
  const body = requireText(text, "Comment text is required");
  if (!body.ok) {
    return body;
  }

  const createdAt = commentTime(time);
  if (!createdAt.ok) {
    return createdAt;
  }

  return ok(
    Object.freeze({
      id: crypto.randomUUID(),
      taskId: task.id,
      authorId: author.id,
      text: body.value,
      createdAt: createdAt.value,
    })
  );
}

function commentTime(time) {
  if (time == null) {
    return ok(new Date().toISOString());
  }
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) {
    return fail("Comment time is invalid");
  }
  return ok(parsed.toISOString());
}

function commentsInCreationOrder(comments) {
  return comments.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function groupTasksByStatus(tasks) {
  return {
    [Status.TODO]: tasks.filter((task) => task.status === Status.TODO),
    [Status.IN_PROGRESS]: tasks.filter((task) => task.status === Status.IN_PROGRESS),
    [Status.DONE]: tasks.filter((task) => task.status === Status.DONE),
  };
}

function listMyTasks(tasks, memberId) {
  return tasks
    .filter((task) => task.assigneeId === memberId)
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

module.exports = {
  calendarToday,
  createProject,
  deleteProject,
  createMember,
  addTask,
  assignTask,
  deleteTask,
  changeStatus,
  addComment,
  commentsInCreationOrder,
  groupTasksByStatus,
  listMyTasks,
};
