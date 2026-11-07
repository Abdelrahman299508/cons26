"use strict";

const { MongoClient } = require("mongodb");
const {
  ProjectRepository,
  MemberRepository,
  TaskRepository,
  CommentRepository,
} = require("../domain/repositories");
const { loadEnv } = require("./loadEnv");

function fromDocument(document) {
  if (!document) {
    return null;
  }
  const { _id, ...entity } = document;
  return entity;
}

class MongoProjectRepository extends ProjectRepository {
  constructor(collection) {
    super();
    this.collection = collection;
  }

  async insert(project) {
    await this.collection.insertOne({ ...project });
    return project;
  }

  async findById(id) {
    return fromDocument(await this.collection.findOne({ id }));
  }

  async findAll() {
    const documents = await this.collection.find({}).sort({ name: 1 }).toArray();
    return documents.map(fromDocument);
  }

  async deleteById(id) {
    await this.collection.deleteOne({ id });
  }
}

class MongoMemberRepository extends MemberRepository {
  constructor(collection) {
    super();
    this.collection = collection;
  }

  async insert(member) {
    await this.collection.insertOne({ ...member });
    return member;
  }

  async findById(id) {
    return fromDocument(await this.collection.findOne({ id }));
  }

  async findByProjectId(projectId) {
    const documents = await this.collection.find({ projectId }).toArray();
    return documents.map(fromDocument);
  }

  async deleteByProjectId(projectId) {
    await this.collection.deleteMany({ projectId });
  }
}

class MongoTaskRepository extends TaskRepository {
  constructor(collection) {
    super();
    this.collection = collection;
  }

  async insert(task) {
    await this.collection.insertOne({ ...task });
    return task;
  }

  async update(task) {
    await this.collection.replaceOne({ id: task.id }, { ...task });
    return task;
  }

  async findById(id) {
    return fromDocument(await this.collection.findOne({ id }));
  }

  async findByProjectId(projectId) {
    const documents = await this.collection.find({ projectId }).toArray();
    return documents.map(fromDocument);
  }

  async findByAssigneeId(assigneeId) {
    const documents = await this.collection.find({ assigneeId }).sort({ dueDate: 1 }).toArray();
    return documents.map(fromDocument);
  }

  async deleteById(id) {
    await this.collection.deleteOne({ id });
  }

  async deleteByProjectId(projectId) {
    await this.collection.deleteMany({ projectId });
  }
}

class MongoCommentRepository extends CommentRepository {
  constructor(collection) {
    super();
    this.collection = collection;
  }

  async insert(comment) {
    await this.collection.insertOne({ ...comment });
    return comment;
  }

  async findByTaskId(taskId) {
    const documents = await this.collection.find({ taskId }).sort({ createdAt: 1 }).toArray();
    return documents.map(fromDocument);
  }

  async deleteByTaskId(taskId) {
    await this.collection.deleteMany({ taskId });
  }
}

async function createRepositories() {
  loadEnv();
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "taskboard");

  const projects = db.collection("projects");
  const members = db.collection("members");
  const tasks = db.collection("tasks");
  const comments = db.collection("comments");

  await projects.createIndex({ id: 1 }, { unique: true });
  await members.createIndex({ id: 1 }, { unique: true });
  await members.createIndex({ projectId: 1 });
  await tasks.createIndex({ id: 1 }, { unique: true });
  await tasks.createIndex({ projectId: 1 });
  await tasks.createIndex({ assigneeId: 1, dueDate: 1 });
  await comments.createIndex({ id: 1 }, { unique: true });
  await comments.createIndex({ taskId: 1, createdAt: 1 });

  return {
    client,
    projects: new MongoProjectRepository(projects),
    members: new MongoMemberRepository(members),
    tasks: new MongoTaskRepository(tasks),
    comments: new MongoCommentRepository(comments),
    close: () => client.close(),
  };
}

module.exports = {
  createRepositories,
  MongoProjectRepository,
  MongoMemberRepository,
  MongoTaskRepository,
  MongoCommentRepository,
};
