"use strict";

const http = require("http");
const { Role } = require("../domain/model");
const { renderHome, renderProject, renderMessage } = require("./page");

function createServer(app) {
  return http.createServer(async (req, res) => {
    try {
      await route(app, req, res);
    } catch (error) {
      console.error(error.message);
      sendHtml(res, 500, renderMessage("The page could not be loaded."));
    }
  });
}

async function route(app, req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = decodeURIComponent(url.pathname);

  if (req.method === "GET" && path === "/") {
    const listed = await app.listProjects();
    sendHtml(res, 200, renderHome({
      projects: listed.value,
      error: url.searchParams.get("error"),
      notice: url.searchParams.get("notice"),
    }));
    return;
  }

  if (req.method === "POST" && path === "/projects") {
    const body = await readForm(req);
    const members = [{ name: body.get("managerName") || "", role: Role.MANAGER }];
    for (const name of body.getAll("memberName")) {
      if (name && name.trim()) {
        members.push({ name, role: Role.MEMBER });
      }
    }
    const result = await app.createProject({ name: body.get("name") || "", members });
    if (!result.ok) {
      const listed = await app.listProjects();
      sendHtml(res, 400, renderHome({ projects: listed.value, error: result.error }));
      return;
    }
    const manager = result.value.members.find((member) => member.role === Role.MANAGER);
    redirect(res, `/projects/${encodeURIComponent(result.value.project.id)}?as=${encodeURIComponent(manager.id)}`);
    return;
  }

  const projectPage = path.match(/^\/projects\/([^/]+)$/);
  if (req.method === "GET" && projectPage) {
    await showProject(app, res, projectPage[1], url.searchParams);
    return;
  }

  const projectDelete = path.match(/^\/projects\/([^/]+)\/delete$/);
  if (req.method === "POST" && projectDelete) {
    const body = await readForm(req);
    const actorId = body.get("actorId") || "";
    const result = await app.deleteProject({ actorId, projectId: projectDelete[1] });
    if (!result.ok) {
      const params = new URLSearchParams();
      if (actorId) {
        params.set("as", actorId);
      }
      params.set("error", result.error);
      redirect(res, `/projects/${encodeURIComponent(projectDelete[1])}?${params.toString()}`);
      return;
    }
    redirect(res, `/?notice=${encodeURIComponent(`${result.value.name} was deleted`)}`);
    return;
  }

  const action = path.match(/^\/projects\/([^/]+)\/tasks(?:\/([^/]+)\/(assign|status|comments|delete))?$/);
  if (req.method === "POST" && action) {
    const projectId = action[1];
    const taskId = action[2] || "";
    const kind = action[3] || "create";
    const body = await readForm(req);
    const actorId = body.get("actorId") || "";
    const result = await runAction(app, kind, { projectId, taskId, actorId, body });
    const params = new URLSearchParams();
    if (actorId) {
      params.set("as", actorId);
    }
    if (!result.ok) {
      params.set("error", result.error);
    } else if (kind === "status" && result.value) {
      params.set("notice", `${result.value.title} is now ${result.value.status}`);
    } else if (kind === "delete" && result.value) {
      params.set("notice", `${result.value.title} was deleted`);
    }
    redirect(res, `/projects/${encodeURIComponent(projectId)}?${params.toString()}`);
    return;
  }

  sendHtml(res, 404, renderMessage("That page does not exist."));
}

async function showProject(app, res, projectId, searchParams) {
  const loaded = await app.loadBoard({ projectId });
  if (!loaded.ok) {
    sendHtml(res, 404, renderMessage(loaded.error));
    return;
  }

  const actor = loaded.value.members.find((member) => member.id === searchParams.get("as")) || null;
  let myTasks = [];
  if (actor) {
    const mine = await app.listMyTasks({ memberId: actor.id });
    myTasks = mine.ok ? mine.value.tasks : [];
  }

  sendHtml(res, 200, renderProject({
    project: loaded.value.project,
    members: loaded.value.members,
    board: loaded.value.board,
    actor,
    myTasks,
    error: searchParams.get("error"),
    notice: searchParams.get("notice"),
  }));
}

async function runAction(app, kind, { projectId, taskId, actorId, body }) {
  if (kind === "create") {
    return app.addTask({
      actorId,
      projectId,
      title: body.get("title") || "",
      dueDate: body.get("dueDate") || "",
    });
  }
  if (kind === "assign") {
    return app.assignTask({
      actorId,
      taskId,
      assigneeId: body.get("assigneeId") || "",
    });
  }
  if (kind === "status") {
    return app.changeStatus({
      actorId,
      taskId,
      nextStatus: body.get("nextStatus") || "",
    });
  }
  if (kind === "delete") {
    return app.deleteTask({ actorId, taskId });
  }
  return app.addComment({
    actorId,
    taskId,
    text: body.get("text") || "",
  });
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(new URLSearchParams(Buffer.concat(chunks).toString("utf8"))));
    req.on("error", reject);
  });
}

function sendHtml(res, status, html) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(303, { location });
  res.end();
}

module.exports = { createServer };
