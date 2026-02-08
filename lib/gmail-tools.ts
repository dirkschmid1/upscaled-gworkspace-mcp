import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth';

// ---- GMAIL SEARCH ----
export async function gmailSearch(
  userEmail: string,
  query: string,
  maxResults: number = 10
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  if (!res.data.messages?.length) {
    return { messages: [], resultCount: 0 };
  }

  const messages = await Promise.all(
    res.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });
      const headers = detail.data.payload?.headers || [];
      const h = (name: string) =>
        headers.find(
          (x) => x.name?.toLowerCase() === name.toLowerCase()
        )?.value || '';
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: h('From'),
        to: h('To'),
        subject: h('Subject'),
        date: h('Date'),
        snippet: detail.data.snippet,
        labelIds: detail.data.labelIds,
      };
    })
  );

  return { messages, resultCount: messages.length };
}

// ---- GMAIL GET ----
export async function gmailGet(userEmail: string, messageId: string) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const headers = res.data.payload?.headers || [];
  const h = (name: string) =>
    headers.find(
      (x) => x.name?.toLowerCase() === name.toLowerCase()
    )?.value || '';

  let body = '';
  const payload = res.data.payload;
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload?.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === 'text/plain' && p.body?.data
    );
    const htmlPart = payload.parts.find(
      (p) => p.mimeType === 'text/html' && p.body?.data
    );
    const part = textPart || htmlPart;
    if (part?.body?.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (!body) {
      for (const p of payload.parts) {
        if (p.parts) {
          const nested = p.parts.find(
            (x) => x.mimeType === 'text/plain' && x.body?.data
          );
          if (nested?.body?.data) {
            body = Buffer.from(nested.body.data, 'base64').toString(
              'utf-8'
            );
            break;
          }
        }
      }
    }
  }

  return {
    id: res.data.id,
    threadId: res.data.threadId,
    from: h('From'),
    to: h('To'),
    cc: h('Cc'),
    subject: h('Subject'),
    date: h('Date'),
    body: body.substring(0, 10000),
    labelIds: res.data.labelIds,
    snippet: res.data.snippet,
  };
}

// ---- GMAIL CREATE DRAFT ----
export async function gmailCreateDraft(
  userEmail: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
  ];
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const raw = Buffer.from([...headers, '', body].join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const draftData: any = { message: { raw } };
  if (threadId) draftData.message.threadId = threadId;

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: draftData,
  });

  return {
    draftId: res.data.id,
    messageId: res.data.message?.id,
    threadId: res.data.message?.threadId,
  };
}

// ---- GMAIL ADD LABEL ----
export async function gmailAddLabel(
  userEmail: string,
  messageId: string,
  labelIds: string[]
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: labelIds },
  });

  return { success: true, messageId, addedLabels: labelIds };
}

// ---- GMAIL REMOVE LABEL ----
export async function gmailRemoveLabel(
  userEmail: string,
  messageId: string,
  labelIds: string[]
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: labelIds },
  });

  return { success: true, messageId, removedLabels: labelIds };
}

// ---- GMAIL LIST LABELS ----
export async function gmailListLabels(userEmail: string) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.labels.list({ userId: 'me' });
  return (res.data.labels || []).map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
  }));
}

// ---- GMAIL SEND ----
export async function gmailSend(
  userEmail: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string,
  cc?: string,
  bcc?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  const headers = [
    `From: ${userEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
  ];
  if (cc) headers.push(`Cc: ${cc}`);
  if (bcc) headers.push(`Bcc: ${bcc}`);
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const raw = Buffer.from([...headers, '', body].join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sendData: any = { raw };
  if (threadId) sendData.threadId = threadId;

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: sendData,
  });

  return {
    messageId: res.data.id,
    threadId: res.data.threadId,
    labelIds: res.data.labelIds,
    sent: true,
  };
}

// ---- GMAIL CREATE LABEL ----
export async function gmailCreateLabel(
  userEmail: string,
  name: string,
  backgroundColor?: string,
  textColor?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  const labelBody: any = {
    name,
    labelListVisibility: 'labelShow',
    messageListVisibility: 'show',
  };
  if (backgroundColor || textColor) {
    labelBody.color = {
      backgroundColor: backgroundColor || '#000000',
      textColor: textColor || '#ffffff',
    };
  }

  const res = await gmail.users.labels.create({
    userId: 'me',
    requestBody: labelBody,
  });

  return {
    id: res.data.id,
    name: res.data.name,
    type: res.data.type,
  };
}

// ---- GMAIL MARK AS READ ----
export async function gmailMarkAsRead(
  userEmail: string,
  messageId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });

  return { success: true, messageId, markedAsRead: true };
}

// ---- GMAIL TRASH ----
export async function gmailTrash(
  userEmail: string,
  messageId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const gmail = google.gmail({ version: 'v1', auth });

  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });

  return { success: true, messageId, trashed: true };
}
