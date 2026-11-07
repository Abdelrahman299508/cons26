const Status = Object.freeze({
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
});

const STATUS_ORDER = Object.freeze([Status.TODO, Status.IN_PROGRESS, Status.DONE]);

const Role = Object.freeze({
  MANAGER: "manager",
  MEMBER: "member",
});

const MAX_MEMBERS = 7;

module.exports = { Status, STATUS_ORDER, Role, MAX_MEMBERS };
