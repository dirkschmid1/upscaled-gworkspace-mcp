import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth';

// ---- SHEETS CREATE ----
export async function sheetsCreate(
  userEmail: string,
  title: string,
  sheetNames?: string[],
  folderId?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  const requestBody: any = {
    properties: { title },
  };

  if (sheetNames && sheetNames.length > 0) {
    requestBody.sheets = sheetNames.map((name) => ({
      properties: { title: name },
    }));
  }

  const res = await sheets.spreadsheets.create({ requestBody });
  const spreadsheetId = res.data.spreadsheetId!;

  // Move to folder if specified
  if (folderId) {
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      removeParents: 'root',
      fields: 'id, parents',
    });
  }

  return {
    spreadsheetId,
    title: res.data.properties?.title,
    url: res.data.spreadsheetUrl,
    sheets: res.data.sheets?.map((s) => s.properties?.title),
  };
}

// ---- SHEETS GET ----
export async function sheetsGet(
  userEmail: string,
  spreadsheetId: string,
  range?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const sheets = google.sheets({ version: 'v4', auth });

  if (range) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return {
      range: res.data.range,
      values: res.data.values || [],
    };
  }

  // Get spreadsheet metadata + first sheet data
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetList = meta.data.sheets?.map((s) => ({
    title: s.properties?.title,
    sheetId: s.properties?.sheetId,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    spreadsheetId: meta.data.spreadsheetId,
    title: meta.data.properties?.title,
    url: meta.data.spreadsheetUrl,
    sheets: sheetList,
  };
}

// ---- SHEETS UPDATE ----
export async function sheetsUpdate(
  userEmail: string,
  spreadsheetId: string,
  range: string,
  values: string[][],
  inputOption: string = 'USER_ENTERED'
) {
  const auth = await getAuthenticatedClient(userEmail);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: inputOption,
    requestBody: { values },
  });

  return {
    updatedRange: res.data.updatedRange,
    updatedRows: res.data.updatedRows,
    updatedColumns: res.data.updatedColumns,
    updatedCells: res.data.updatedCells,
  };
}

// ---- SHEETS APPEND ----
export async function sheetsAppend(
  userEmail: string,
  spreadsheetId: string,
  range: string,
  values: string[][],
  inputOption: string = 'USER_ENTERED'
) {
  const auth = await getAuthenticatedClient(userEmail);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: inputOption,
    requestBody: { values },
  });

  return {
    updatedRange: res.data.updates?.updatedRange,
    updatedRows: res.data.updates?.updatedRows,
    updatedCells: res.data.updates?.updatedCells,
  };
}

// ---- SHEETS CLEAR ----
export async function sheetsClear(
  userEmail: string,
  spreadsheetId: string,
  range: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  return {
    clearedRange: res.data.clearedRange,
  };
}
