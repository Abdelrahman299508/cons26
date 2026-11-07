"use strict";

const { Status, Role, MAX_MEMBERS } = require("../domain/model");
const { calendarToday } = require("../domain/rules");

const COLUMNS = [Status.TODO, Status.IN_PROGRESS, Status.DONE];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout({ title, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 16px/1.45 Georgia, "Iowan Old Style", serif; color: #1c1915; background: #f4efe6; }
    a { color: #1f4d3a; }
    header, main { width: min(1100px, calc(100% - 32px)); margin: 0 auto; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; padding: 24px 0 8px; }
    h1, h2, h3 { font-family: "Avenir Next", "Segoe UI", sans-serif; font-weight: 650; letter-spacing: 0; }
    h1 { font-size: 1.7rem; margin: 0; }
    h2 { font-size: 1.15rem; margin: 0 0 12px; }
    h3 { font-size: 1rem; margin: 0 0 6px; }
    .panel { background: #fffdf8; border: 1px solid #e2d8c8; border-radius: 14px; padding: 16px; margin: 16px 0; }
    .error { background: #fff1ee; border-color: #e7b2a8; color: #6d2418; }
    .notice { background: #eef6f1; border-color: #b7d4c4; color: #1f4d3a; }
    .status { margin: 6px 0; font-family: "Avenir Next", "Segoe UI", sans-serif; font-weight: 650; }
    form { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
    label { display: grid; gap: 4px; font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 0.82rem; }
    input, select, button, textarea { font: inherit; color: inherit; }
    input, select, textarea { background: #fff; border: 1px solid #cfc3b0; border-radius: 8px; padding: 8px 10px; }
    textarea { width: 100%; min-height: 64px; }
    button { background: #1f4d3a; color: #f7f3ea; border: 0; border-radius: 8px; padding: 9px 12px; cursor: pointer; }
    button.danger { background: #6d2418; }
    button.secondary { background: transparent; color: #1f4d3a; border: 1px solid #1f4d3a; }
    #members { display: contents; }
    .member-row { display: flex; gap: 8px; align-items: end; }
    .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .column { background: #efe7da; border-radius: 14px; padding: 12px; }
    .card { background: #fffdf8; border-radius: 12px; padding: 12px; margin-top: 10px; }
    .card p, .card li { margin: 4px 0; }
    .meta { color: #5e564c; font-size: 0.92rem; }
    .assigned { margin: 6px 0; font-family: "Avenir Next", "Segoe UI", sans-serif; font-weight: 650; }
    .stack { display: grid; gap: 8px; margin-top: 10px; }
    .stack form { display: grid; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    @media (max-width: 800px) { .board { grid-template-columns: 1fr; } header { display: block; } }
  </style>
</head>
<body>
  <header>
    <h1>Task board</h1>
    <a href="/">All projects</a>
  </header>
  <main>${body}</main>
</body>
</html>`;
}

function renderMessage(message) {
  return layout({
    title: "Task board",
    body: `<section class="panel"><p>${escapeHtml(message)}</p></section>`,
  });
}

function renderHome({ projects, error, notice }) {
  const list = projects.length
    ? `<ul>${projects
        .map(
          (project) =>
            `<li><a href="/projects/${encodeURIComponent(project.id)}">${escapeHtml(project.name)}</a></li>`
        )
        .join("")}</ul>`
    : `<p class="meta">No projects yet.</p>`;

  return layout({
    title: "Projects",
    body: `
      ${notice ? `<section class="panel notice">${escapeHtml(notice)}</section>` : ""}
      ${error ? `<section class="panel error">${escapeHtml(error)}</section>` : ""}
      <section class="panel">
        <h2>Create a project</h2>
        <p class="meta">There is no login. After the project exists, you pick which member you are acting as.</p>
        <form method="post" action="/projects">
          <label>Project name <input name="name"></label>
          <label>Manager <input name="managerName"></label>
          <div id="members">
            <div class="member-row">
              <label>Member 1 <input name="memberName"></label>
              <button type="button" class="danger">Remove</button>
            </div>
            <div class="member-row">
              <label>Member 2 <input name="memberName"></label>
              <button type="button" class="danger">Remove</button>
            </div>
          </div>
          <button type="button" class="secondary" id="add-member">Add another member</button>
          <button type="submit">Create project</button>
        </form>
        <script>
          const memberFields = document.getElementById("members");
          const addMember = document.getElementById("add-member");
          const memberLimit = ${MAX_MEMBERS};

          function renumberMembers() {
            const rows = memberFields.querySelectorAll(".member-row");
            rows.forEach(function (row, index) {
              const label = row.querySelector("label");
              const input = row.querySelector("input");
              label.replaceChildren();
              label.append("Member " + (index + 1) + " ");
              label.append(input);
            });
            addMember.hidden = rows.length >= memberLimit;
          }

          function removeMember(row) {
            row.remove();
            renumberMembers();
          }

          function bindRemove(row) {
            row.querySelector("button").addEventListener("click", function () {
              removeMember(row);
            });
          }

          memberFields.querySelectorAll(".member-row").forEach(bindRemove);

          addMember.addEventListener("click", function () {
            if (memberFields.querySelectorAll(".member-row").length >= memberLimit) {
              addMember.hidden = true;
              return;
            }
            const row = document.createElement("div");
            row.className = "member-row";
            const label = document.createElement("label");
            const input = document.createElement("input");
            input.name = "memberName";
            label.append(input);
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "danger";
            remove.textContent = "Remove";
            row.append(label, remove);
            memberFields.appendChild(row);
            bindRemove(row);
            renumberMembers();
            input.focus();
          });
        </script>
      </section>
      <section class="panel">
        <h2>Projects</h2>
        ${list}
      </section>`,
  });
}

function memberName(members, memberId) {
  const member = members.find((person) => person.id === memberId);
  return member ? member.name : "";
}

function assignedLabel(members, memberId) {
  const name = memberName(members, memberId);
  return name ? `Assigned to ${name}` : "Not assigned yet";
}

function renderTask(task, { projectId, members, actor }) {
  const comments = (task.comments || [])
    .map(
      (comment) =>
        `<li><strong>${escapeHtml(memberName(members, comment.authorId))}</strong> ${escapeHtml(comment.text)} <span class="meta">${escapeHtml(comment.createdAt)}</span></li>`
    )
    .join("");
  const people = members
    .map((member) => {
      const selected = task.assigneeId === member.id ? " selected" : "";
      return `<option value="${escapeHtml(member.id)}"${selected}>${escapeHtml(member.name)}</option>`;
    })
    .join("");
  const assignForm =
    actor && actor.role === Role.MANAGER && !task.assigneeId
      ? `<form method="post" action="/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}/assign">
          <input type="hidden" name="actorId" value="${escapeHtml(actor.id)}">
          <label>Assign to <select name="assigneeId">${people}</select></label>
          <button type="submit">Assign</button>
        </form>`
      : "";
  const actions = actor
    ? `<div class="stack">
        ${assignForm}
        ${statusForm(task, { projectId, actor })}
        <form method="post" action="/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}/comments">
          <input type="hidden" name="actorId" value="${escapeHtml(actor.id)}">
          <label>Comment <textarea name="text"></textarea></label>
          <button type="submit">Add comment</button>
        </form>
        ${deleteForm(task, { projectId, actor })}
      </div>`
    : "";

  return `<article class="card">
    <h3>${escapeHtml(task.title)}</h3>
    <p class="meta">Due ${escapeHtml(task.dueDate)}</p>
    <p class="assigned">${escapeHtml(assignedLabel(members, task.assigneeId))}</p>
    <p class="status">Now: ${escapeHtml(task.status || "To Do")}</p>
    ${comments ? `<ul>${comments}</ul>` : `<p class="meta">No comments yet.</p>`}
    ${actions}
  </article>`;
}

function deleteForm(task, { projectId, actor }) {
  if (!actor || actor.role !== Role.MANAGER) {
    return "";
  }
  return `<form method="post" action="/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}/delete" onsubmit="return confirm('Delete this task?')">
          <input type="hidden" name="actorId" value="${escapeHtml(actor.id)}">
          <button class="danger" type="submit">Delete task</button>
        </form>`;
}

function statusForm(task, { projectId, actor }) {
  const currentIndex = COLUMNS.indexOf(task.status);
  const nextStatus = currentIndex >= 0 ? COLUMNS[currentIndex + 1] : null;
  if (!actor || actor.id !== task.assigneeId || !nextStatus) {
    return "";
  }
  return `<form method="post" action="/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}/status">
          <input type="hidden" name="actorId" value="${escapeHtml(actor.id)}">
          <input type="hidden" name="nextStatus" value="${escapeHtml(nextStatus)}">
          <button type="submit">Move to ${escapeHtml(nextStatus)}</button>
        </form>`;
}

function renderProject({ project, members, board, actor, myTasks, error, notice }) {
  const options = [`<option value="">Choose a member</option>`]
    .concat(
      members.map((member) => {
        const selected = actor && actor.id === member.id ? " selected" : "";
        return `<option value="${escapeHtml(member.id)}"${selected}>${escapeHtml(member.name)} (${escapeHtml(member.role)})</option>`;
      })
    )
    .join("");
  const columns = COLUMNS.map((status) => {
    const tasks = board[status] || [];
    const cards = tasks
      .map((task) => renderTask(task, { projectId: project.id, members, actor }))
      .join("");
    return `<section class="column"><h2>${escapeHtml(status)}</h2>${cards || `<p class="meta">None</p>`}</section>`;
  }).join("");
  const tasksOnBoard = new Map(
    COLUMNS.flatMap((status) => board[status] || []).map((task) => [task.id, task])
  );
  const ownTasks = actor ? myTasks.map((task) => tasksOnBoard.get(task.id) || task) : [];
  const ownCards = ownTasks
    .map((task) => renderTask(task, { projectId: project.id, members, actor }))
    .join("");
  const mine = !actor
    ? `<p class="meta">Choose a member to see that member's tasks.</p>`
    : ownTasks.length
      ? `<ul>${ownTasks
          .map(
            (task) =>
              `<li>${escapeHtml(task.title)} <span class="meta">Due ${escapeHtml(task.dueDate)}</span></li>`
          )
          .join("")}</ul>`
      : `<p class="meta">No tasks assigned to ${escapeHtml(actor.name)}.</p>`;
  const addTask =
    actor && actor.role === Role.MANAGER
      ? `<section class="panel">
        <h2>Add a task</h2>
        <form method="post" action="/projects/${encodeURIComponent(project.id)}/tasks">
          <input type="hidden" name="actorId" value="${escapeHtml(actor.id)}">
          <label>Title <input name="title"></label>
          <label>Due date <input name="dueDate" type="date" min="${escapeHtml(calendarToday())}"></label>
          <button type="submit">Add task</button>
        </form>
      </section>`
      : "";

  return layout({
    title: project.name,
    body: `
      <section class="panel">
        <h2>${escapeHtml(project.name)}</h2>
        <form method="get" action="/projects/${encodeURIComponent(project.id)}">
          <label>Acting as <select name="as">${options}</select></label>
          <button type="submit">Use this member</button>
        </form>
        ${
          actor && actor.role === Role.MANAGER
            ? `<form method="post" action="/projects/${encodeURIComponent(project.id)}/delete" onsubmit="return confirm('Delete this project?')">
          <input type="hidden" name="actorId" value="${escapeHtml(actor.id)}">
          <button class="danger" type="submit">Delete project</button>
        </form>`
            : ""
        }
      </section>
      ${notice ? `<section class="panel notice">${escapeHtml(notice)}</section>` : ""}
      ${error ? `<section class="panel error">${escapeHtml(error)}</section>` : ""}
      ${
        actor && actor.role === Role.MANAGER
          ? `<section class="panel">
        <h2>My Tasks</h2>
        ${mine}
      </section>
      ${addTask}
      <section class="board">${columns}</section>`
          : `<section class="panel">
        <h2>My Tasks</h2>
        ${actor ? ownCards || `<p class="meta">No tasks assigned to ${escapeHtml(actor.name)}.</p>` : mine}
      </section>`
      }`,
  });
}

module.exports = { renderHome, renderProject, renderMessage };
