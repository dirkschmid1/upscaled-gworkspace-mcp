import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth';

// ---- DRIVE SEARCH ----
export async function driveSearch(
  userEmail: string,
  query: string,
  maxResults: number = 10
) {
  const auth = await getAuthenticatedClient(userEmail);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: query,
    pageSize: maxResults,
    fields:
      'files(id, name, mimeType, modifiedTime, size, webViewLink, parents, owners)',
    orderBy: 'modifiedTime desc',
  });

  return (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size,
    webViewLink: f.webViewLink,
    parents: f.parents,
  }));
}

// ---- DRIVE GET FILE ----
export async function driveGetFile(
  userEmail: string,
  fileId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const drive = google.drive({ version: 'v3', auth });

  const meta = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, size, webViewLink',
  });

  const mimeType = meta.data.mimeType || '';
  let content = '';

  if (mimeType === 'application/vnd.google-apps.document') {
    const exported = await drive.files.export({
      fileId,
      mimeType: 'text/plain',
    });
    content = String(exported.data);
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const exported = await drive.files.export({
      fileId,
      mimeType: 'text/csv',
    });
    content = String(exported.data);
  } else if (mimeType === 'application/vnd.google-apps.presentation') {
    const exported = await drive.files.export({
      fileId,
      mimeType: 'text/plain',
    });
    content = String(exported.data);
  } else if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json'
  ) {
    const downloaded = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    content = String(downloaded.data);
  } else {
    content = `[Binary file – cannot display content. Download at: ${meta.data.webViewLink}]`;
  }

  return {
    id: meta.data.id,
    name: meta.data.name,
    mimeType: meta.data.mimeType,
    modifiedTime: meta.data.modifiedTime,
    webViewLink: meta.data.webViewLink,
    content: content.substring(0, 15000),
  };
}

// ---- DRIVE CREATE DOCUMENT ----
export async function driveCreateDocument(
  userEmail: string,
  title: string,
  content: string,
  folderId?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  const createRes = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      parents: folderId ? [folderId] : undefined,
    },
    fields: 'id, name, webViewLink',
  });

  const fileId = createRes.data.id!;

  if (content.trim()) {
    await docs.documents.batchUpdate({
      documentId: fileId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  return {
    id: fileId,
    name: createRes.data.name,
    webViewLink: createRes.data.webViewLink,
  };
}

// ---- DRIVE LIST FILES ----
export async function driveListFiles(
  userEmail: string,
  folderId?: string,
  maxResults: number = 20
) {
  const auth = await getAuthenticatedClient(userEmail);
  const drive = google.drive({ version: 'v3', auth });

  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : 'trashed = false';

  const res = await drive.files.list({
    q: query,
    pageSize: maxResults,
    fields:
      'files(id, name, mimeType, modifiedTime, size, webViewLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  return (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size,
    webViewLink: f.webViewLink,
  }));
}

// ---- DRIVE UPLOAD FILE ----
export async function driveUploadFile(
  userEmail: string,
  name: string,
  content: string,
  mimeType: string = 'text/plain',
  folderId?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const drive = google.drive({ version: 'v3', auth });

  const { Readable } = require('stream');
  const stream = Readable.from([content]);

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, mimeType, webViewLink',
  });

  return {
    id: res.data.id,
    name: res.data.name,
    mimeType: res.data.mimeType,
    webViewLink: res.data.webViewLink,
  };
}

// ---- DRIVE CREATE FOLDER ----
export async function driveCreateFolder(
  userEmail: string,
  name: string,
  parentFolderId?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    fields: 'id, name, webViewLink',
  });

  return {
    id: res.data.id,
    name: res.data.name,
    webViewLink: res.data.webViewLink,
  };
}

// ---- DRIVE MOVE FILE ----
export async function driveMoveFile(
  userEmail: string,
  fileId: string,
  newParentId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const drive = google.drive({ version: 'v3', auth });

  const file = await drive.files.get({
    fileId,
    fields: 'id, name, parents',
  });
  const currentParents = (file.data.parents || []).join(',');

  const res = await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: currentParents,
    fields: 'id, name, parents, webViewLink',
  });

  return {
    id: res.data.id,
    name: res.data.name,
    newParent: newParentId,
    webViewLink: res.data.webViewLink,
    moved: true,
  };
}
