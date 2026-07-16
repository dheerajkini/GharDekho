/**
 * Project Storage Utility — localStorage-based project management
 * Each user gets isolated storage keyed by their user ID.
 * 
 * Schema: { folders: [ { id, name, createdAt, projects: [ { id, name, folderId, createdAt, lastModified, thumbnail, data } ] } ] }
 */

const STORAGE_PREFIX = "ghardekho_projects_";

// ── Helpers ──

function getStorageKey(userId) {
  return STORAGE_PREFIX + userId;
}

function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem("ghardekho_active_user") || "null");
  return user ? user.id : null;
}

function loadStore(userId) {
  const key = getStorageKey(userId || getCurrentUserId());
  const raw = localStorage.getItem(key);
  if (!raw) return { folders: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { folders: [] };
  }
}

function saveStore(store, userId) {
  const key = getStorageKey(userId || getCurrentUserId());
  localStorage.setItem(key, JSON.stringify(store));
}

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ── Folder Operations ──

export function getFolders(userId) {
  const store = loadStore(userId);
  return store.folders;
}

export function createFolder(name, userId) {
  const store = loadStore(userId);
  const folder = {
    id: generateId("folder"),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    projects: [],
  };
  store.folders.push(folder);
  saveStore(store, userId);
  return folder;
}

export function renameFolder(folderId, newName, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return null;
  folder.name = newName.trim();
  saveStore(store, userId);
  return folder;
}

export function deleteFolder(folderId, userId) {
  const store = loadStore(userId);
  store.folders = store.folders.filter((f) => f.id !== folderId);
  saveStore(store, userId);
  return true;
}

// ── Project Operations ──

export function getProject(folderId, projectId, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return null;
  return folder.projects.find((p) => p.id === projectId) || null;
}

export function createProject(folderId, name, projectData, thumbnail, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const project = {
    id: generateId("proj"),
    name: name.trim(),
    folderId,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    thumbnail: thumbnail || "",
    data: projectData,
  };

  folder.projects.push(project);
  saveStore(store, userId);
  return project;
}

export function updateProject(folderId, projectId, projectData, thumbnail, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const project = folder.projects.find((p) => p.id === projectId);
  if (!project) return null;

  project.data = projectData;
  project.lastModified = new Date().toISOString();
  if (thumbnail) project.thumbnail = thumbnail;

  saveStore(store, userId);
  return project;
}

export function renameProject(folderId, projectId, newName, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const project = folder.projects.find((p) => p.id === projectId);
  if (!project) return null;

  project.name = newName.trim();
  project.lastModified = new Date().toISOString();
  saveStore(store, userId);
  return project;
}

export function duplicateProject(folderId, projectId, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const original = folder.projects.find((p) => p.id === projectId);
  if (!original) return null;

  const duplicate = {
    ...JSON.parse(JSON.stringify(original)),
    id: generateId("proj"),
    name: original.name + " (Copy)",
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };

  folder.projects.push(duplicate);
  saveStore(store, userId);
  return duplicate;
}

export function deleteProject(folderId, projectId, userId) {
  const store = loadStore(userId);
  const folder = store.folders.find((f) => f.id === folderId);
  if (!folder) return false;

  folder.projects = folder.projects.filter((p) => p.id !== projectId);
  saveStore(store, userId);
  return true;
}

export function moveProject(sourceFolderId, targetFolderId, projectId, userId) {
  const store = loadStore(userId);
  const sourceFolder = store.folders.find((f) => f.id === sourceFolderId);
  const targetFolder = store.folders.find((f) => f.id === targetFolderId);
  if (!sourceFolder || !targetFolder) return false;

  const projectIndex = sourceFolder.projects.findIndex((p) => p.id === projectId);
  if (projectIndex === -1) return false;

  const [project] = sourceFolder.projects.splice(projectIndex, 1);
  project.folderId = targetFolderId;
  project.lastModified = new Date().toISOString();
  targetFolder.projects.push(project);

  saveStore(store, userId);
  return true;
}

// ── Thumbnail Generation ──

export function generateThumbnail(maxWidth = 240, maxHeight = 160) {
  const canvas = document.getElementById("blueprint-canvas-element");
  if (!canvas) return "";

  try {
    // Create a scaled-down copy
    const tempCanvas = document.createElement("canvas");
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    tempCanvas.width = canvas.width * scale;
    tempCanvas.height = canvas.height * scale;

    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    return tempCanvas.toDataURL("image/png", 0.7);
  } catch (e) {
    console.error("Thumbnail generation failed:", e);
    return "";
  }
}

// ── Collect all design state for saving ──

export function collectDesignState({
  room, sharedItems, doorPos, theme, wallColor,
  floorPattern, wallPattern, wallVisibility,
  showScenery, vastuEnabled, showDims
}) {
  return {
    room: { ...room },
    sharedItems: JSON.parse(JSON.stringify(sharedItems)),
    doorPos: { ...doorPos },
    theme,
    wallColor,
    floorPattern,
    wallPattern,
    wallVisibility,
    showScenery,
    vastuEnabled,
    showDims,
  };
}
