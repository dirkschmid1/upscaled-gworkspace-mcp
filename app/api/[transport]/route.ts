import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import {
  gmailSearch,
  gmailGet,
  gmailCreateDraft,
  gmailSend,
  gmailAddLabel,
  gmailRemoveLabel,
  gmailListLabels,
  gmailCreateLabel,
  gmailMarkAsRead,
  gmailTrash,
} from '@/lib/gmail-tools';
import {
  calendarGetEvents,
  calendarCreateEvent,
  calendarUpdateEvent,
  calendarDeleteEvent,
  calendarFindFreeSlots,
} from '@/lib/calendar-tools';
import {
  driveSearch,
  driveGetFile,
  driveCreateDocument,
  driveListFiles,
  driveUploadFile,
  driveCreateFolder,
  driveMoveFile,
} from '@/lib/drive-tools';
import {
  sheetsCreate,
  sheetsGet,
  sheetsUpdate,
  sheetsAppend,
  sheetsClear,
} from '@/lib/sheets-tools';
import {
  formsCreate,
  formsGet,
  formsGetResponses,
} from '@/lib/forms-tools';

const handler = createMcpHandler(
  (server) => {
    // =====================
    // GMAIL TOOLS
    // =====================

    server.registerTool(
      'gmail_search',
      {
        title: 'Gmail Search',
        description:
          'Search Gmail inbox. Examples: "is:unread", "from:eike newer_than:1d", "label:inbox subject:angebot"',
        inputSchema: {
          userEmail: z
            .string()
            .email()
            .describe(
              'Email address of the user whose inbox to search. Ask the user for their email if unknown.'
            ),
          query: z.string().describe('Gmail search query'),
          maxResults: z.number().int().min(1).max(50).default(10),
        },
      },
      async ({ userEmail, query, maxResults }) => {
        const result = await gmailSearch(userEmail, query, maxResults);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_get',
      {
        title: 'Gmail Get Message',
        description: 'Get full email content by message ID.',
        inputSchema: {
          userEmail: z.string().email(),
          messageId: z.string(),
        },
      },
      async ({ userEmail, messageId }) => {
        const result = await gmailGet(userEmail, messageId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_create_draft',
      {
        title: 'Gmail Create Draft',
        description:
          'Create a draft email or reply. ALWAYS create drafts, NEVER send directly.',
        inputSchema: {
          userEmail: z.string().email(),
          to: z.string().describe('Recipient email address'),
          subject: z.string(),
          body: z.string().describe('Plain text email body'),
          threadId: z
            .string()
            .optional()
            .describe('Thread ID for replies'),
          inReplyTo: z
            .string()
            .optional()
            .describe('Message-ID header for threading'),
        },
      },
      async ({ userEmail, to, subject, body, threadId, inReplyTo }) => {
        const result = await gmailCreateDraft(
          userEmail, to, subject, body, threadId, inReplyTo
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_add_label',
      {
        title: 'Gmail Add Label',
        description:
          'Add labels to an email. Use gmail_list_labels first to get label IDs.',
        inputSchema: {
          userEmail: z.string().email(),
          messageId: z.string(),
          labelIds: z.array(z.string()),
        },
      },
      async ({ userEmail, messageId, labelIds }) => {
        const result = await gmailAddLabel(userEmail, messageId, labelIds);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_remove_label',
      {
        title: 'Gmail Remove Label',
        description: 'Remove labels from an email.',
        inputSchema: {
          userEmail: z.string().email(),
          messageId: z.string(),
          labelIds: z.array(z.string()),
        },
      },
      async ({ userEmail, messageId, labelIds }) => {
        const result = await gmailRemoveLabel(
          userEmail, messageId, labelIds
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_list_labels',
      {
        title: 'Gmail List Labels',
        description: 'List all Gmail labels with their IDs.',
        inputSchema: {
          userEmail: z.string().email(),
        },
      },
      async ({ userEmail }) => {
        const result = await gmailListLabels(userEmail);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_send',
      {
        title: 'Gmail Send Email',
        description:
          'Send an email. IMPORTANT: Only use after the user has explicitly confirmed they want to send. Always show the draft to the user first and get confirmation before calling this tool.',
        inputSchema: {
          userEmail: z.string().email(),
          to: z.string().describe('Recipient email address'),
          subject: z.string(),
          body: z.string().describe('Plain text email body'),
          threadId: z.string().optional().describe('Thread ID for replies'),
          inReplyTo: z.string().optional().describe('Message-ID header for threading'),
          cc: z.string().optional().describe('CC recipients (comma-separated)'),
          bcc: z.string().optional().describe('BCC recipients (comma-separated)'),
        },
      },
      async ({ userEmail, to, subject, body, threadId, inReplyTo, cc, bcc }) => {
        const result = await gmailSend(
          userEmail, to, subject, body, threadId, inReplyTo, cc, bcc
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_create_label',
      {
        title: 'Gmail Create Label',
        description:
          'Create a new Gmail label. Useful for creating GPS labels like @gps/reply-needed. For colors use hex codes like #16a765 (green), #fb8c00 (orange), #4986e7 (blue).',
        inputSchema: {
          userEmail: z.string().email(),
          name: z.string().describe('Label name, e.g. "@gps/reply-needed"'),
          backgroundColor: z.string().optional().describe('Background hex color'),
          textColor: z.string().optional().describe('Text hex color'),
        },
      },
      async ({ userEmail, name, backgroundColor, textColor }) => {
        const result = await gmailCreateLabel(
          userEmail, name, backgroundColor, textColor
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_mark_as_read',
      {
        title: 'Gmail Mark as Read',
        description: 'Mark an email as read by removing the UNREAD label.',
        inputSchema: {
          userEmail: z.string().email(),
          messageId: z.string(),
        },
      },
      async ({ userEmail, messageId }) => {
        const result = await gmailMarkAsRead(userEmail, messageId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'gmail_trash',
      {
        title: 'Gmail Trash',
        description:
          'Move an email to trash. Use for spam or irrelevant emails (GPS category: archive).',
        inputSchema: {
          userEmail: z.string().email(),
          messageId: z.string(),
        },
      },
      async ({ userEmail, messageId }) => {
        const result = await gmailTrash(userEmail, messageId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    // =====================
    // CALENDAR TOOLS
    // =====================

    server.registerTool(
      'calendar_get_events',
      {
        title: 'Google Calendar – Get Events',
        description:
          'Get upcoming calendar events. Defaults to next 7 days.',
        inputSchema: {
          userEmail: z.string().email(),
          timeMin: z
            .string()
            .optional()
            .describe('Start time (ISO 8601). Default: now'),
          timeMax: z
            .string()
            .optional()
            .describe('End time (ISO 8601). Default: +7 days'),
          maxResults: z.number().int().min(1).max(50).default(10),
        },
      },
      async ({ userEmail, timeMin, timeMax, maxResults }) => {
        const result = await calendarGetEvents(
          userEmail, timeMin, timeMax, maxResults
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'calendar_create_event',
      {
        title: 'Google Calendar – Create Event',
        description:
          'Create a new calendar event. Times must be ISO 8601 format.',
        inputSchema: {
          userEmail: z.string().email(),
          summary: z.string().describe('Event title'),
          startTime: z
            .string()
            .describe('Start time (ISO 8601, e.g. 2026-02-10T10:00:00+01:00)'),
          endTime: z
            .string()
            .describe('End time (ISO 8601, e.g. 2026-02-10T11:00:00+01:00)'),
          description: z.string().optional(),
          location: z.string().optional(),
          attendees: z
            .array(z.string())
            .optional()
            .describe('Email addresses of attendees'),
        },
      },
      async ({
        userEmail,
        summary,
        startTime,
        endTime,
        description,
        location,
        attendees,
      }) => {
        const result = await calendarCreateEvent(
          userEmail, summary, startTime, endTime,
          description, location, attendees
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'calendar_update_event',
      {
        title: 'Google Calendar – Update Event',
        description: 'Update an existing calendar event by event ID.',
        inputSchema: {
          userEmail: z.string().email(),
          eventId: z.string(),
          summary: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
        },
      },
      async ({
        userEmail,
        eventId,
        summary,
        startTime,
        endTime,
        description,
        location,
      }) => {
        const result = await calendarUpdateEvent(userEmail, eventId, {
          summary, startTime, endTime, description, location,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'calendar_delete_event',
      {
        title: 'Google Calendar – Delete Event',
        description: 'Delete a calendar event by event ID.',
        inputSchema: {
          userEmail: z.string().email(),
          eventId: z.string(),
        },
      },
      async ({ userEmail, eventId }) => {
        const result = await calendarDeleteEvent(userEmail, eventId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'calendar_find_free_slots',
      {
        title: 'Google Calendar – Find Free Slots',
        description:
          'Find available time slots in the calendar. Checks working hours (default 9-17) on weekdays, excludes existing events. Perfect for scheduling meetings.',
        inputSchema: {
          userEmail: z.string().email(),
          dateMin: z
            .string()
            .describe('Start of search range (ISO 8601, e.g. 2026-02-09T00:00:00+01:00)'),
          dateMax: z
            .string()
            .describe('End of search range (ISO 8601, e.g. 2026-02-13T23:59:59+01:00)'),
          durationMinutes: z
            .number()
            .int()
            .min(15)
            .max(480)
            .default(30)
            .describe('Minimum slot duration in minutes (default: 30)'),
          workingHoursStart: z
            .number()
            .int()
            .min(0)
            .max(23)
            .default(9)
            .describe('Working hours start (default: 9)'),
          workingHoursEnd: z
            .number()
            .int()
            .min(1)
            .max(24)
            .default(17)
            .describe('Working hours end (default: 17)'),
        },
      },
      async ({
        userEmail, dateMin, dateMax, durationMinutes,
        workingHoursStart, workingHoursEnd,
      }) => {
        const result = await calendarFindFreeSlots(
          userEmail, dateMin, dateMax, durationMinutes,
          workingHoursStart, workingHoursEnd
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    // =====================
    // DRIVE TOOLS
    // =====================

    server.registerTool(
      'drive_search',
      {
        title: 'Google Drive – Search Files',
        description:
          'Search Google Drive files. Uses Drive query syntax. Examples: "name contains \'Angebot\'", "mimeType = \'application/vnd.google-apps.document\'", "fullText contains \'SEO Strategie\'"',
        inputSchema: {
          userEmail: z.string().email(),
          query: z.string().describe('Google Drive search query'),
          maxResults: z.number().int().min(1).max(50).default(10),
        },
      },
      async ({ userEmail, query, maxResults }) => {
        const result = await driveSearch(userEmail, query, maxResults);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'drive_get_file',
      {
        title: 'Google Drive – Get File Content',
        description:
          'Read file content by file ID. Google Docs exported as text, Sheets as CSV, other text files read directly. Binary files return metadata only.',
        inputSchema: {
          userEmail: z.string().email(),
          fileId: z.string(),
        },
      },
      async ({ userEmail, fileId }) => {
        const result = await driveGetFile(userEmail, fileId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'drive_create_document',
      {
        title: 'Google Drive – Create Google Doc',
        description:
          'Create a new Google Doc with text content. Returns link to the document.',
        inputSchema: {
          userEmail: z.string().email(),
          title: z.string().describe('Document title'),
          content: z.string().describe('Text content for the document'),
          folderId: z
            .string()
            .optional()
            .describe('Parent folder ID (optional)'),
        },
      },
      async ({ userEmail, title, content, folderId }) => {
        const result = await driveCreateDocument(
          userEmail, title, content, folderId
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'drive_list_files',
      {
        title: 'Google Drive – List Files',
        description:
          'List files in Drive or a specific folder. Returns most recently modified first.',
        inputSchema: {
          userEmail: z.string().email(),
          folderId: z
            .string()
            .optional()
            .describe('Folder ID to list. Omit for root/all files.'),
          maxResults: z.number().int().min(1).max(50).default(20),
        },
      },
      async ({ userEmail, folderId, maxResults }) => {
        const result = await driveListFiles(
          userEmail, folderId, maxResults
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'drive_upload_file',
      {
        title: 'Google Drive – Upload File',
        description:
          'Upload a text file to Drive. Supports text/plain, text/csv, application/json, text/markdown.',
        inputSchema: {
          userEmail: z.string().email(),
          name: z.string().describe('File name including extension'),
          content: z.string().describe('File content as text'),
          mimeType: z
            .string()
            .default('text/plain')
            .describe('MIME type (default: text/plain)'),
          folderId: z
            .string()
            .optional()
            .describe('Parent folder ID (optional)'),
        },
      },
      async ({ userEmail, name, content, mimeType, folderId }) => {
        const result = await driveUploadFile(
          userEmail, name, content, mimeType, folderId
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'drive_create_folder',
      {
        title: 'Google Drive – Create Folder',
        description:
          'Create a new folder in Google Drive. Can be nested inside another folder.',
        inputSchema: {
          userEmail: z.string().email(),
          name: z.string().describe('Folder name'),
          parentFolderId: z
            .string()
            .optional()
            .describe('Parent folder ID to create inside (optional)'),
        },
      },
      async ({ userEmail, name, parentFolderId }) => {
        const result = await driveCreateFolder(
          userEmail, name, parentFolderId
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'drive_move_file',
      {
        title: 'Google Drive – Move File',
        description:
          'Move a file to a different folder. Removes from current parent and adds to new parent.',
        inputSchema: {
          userEmail: z.string().email(),
          fileId: z.string().describe('ID of the file to move'),
          newParentId: z
            .string()
            .describe('ID of the destination folder'),
        },
      },
      async ({ userEmail, fileId, newParentId }) => {
        const result = await driveMoveFile(
          userEmail, fileId, newParentId
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );
    // =====================
    // SHEETS TOOLS
    // =====================

    server.registerTool(
      'sheets_create',
      {
        title: 'Google Sheets – Create Spreadsheet',
        description:
          'Create a new Google Spreadsheet. Optionally specify sheet tab names and a target folder.',
        inputSchema: {
          userEmail: z.string().email(),
          title: z.string().describe('Spreadsheet title'),
          sheetNames: z
            .array(z.string())
            .optional()
            .describe('Names for the sheet tabs (default: "Sheet1")'),
          folderId: z
            .string()
            .optional()
            .describe('Parent folder ID (optional)'),
        },
      },
      async ({ userEmail, title, sheetNames, folderId }) => {
        const result = await sheetsCreate(userEmail, title, sheetNames, folderId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'sheets_get',
      {
        title: 'Google Sheets – Get Data',
        description:
          'Get spreadsheet metadata or read cell values. Specify range like "Sheet1!A1:D10" to read data, or omit range to get sheet metadata.',
        inputSchema: {
          userEmail: z.string().email(),
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          range: z
            .string()
            .optional()
            .describe('Cell range, e.g. "Sheet1!A1:D10". Omit for metadata only.'),
        },
      },
      async ({ userEmail, spreadsheetId, range }) => {
        const result = await sheetsGet(userEmail, spreadsheetId, range);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'sheets_update',
      {
        title: 'Google Sheets – Update Cells',
        description:
          'Write values to a specific range. Overwrites existing data.',
        inputSchema: {
          userEmail: z.string().email(),
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          range: z.string().describe('Target range, e.g. "Sheet1!A1:C3"'),
          values: z
            .array(z.array(z.string()))
            .describe('2D array of cell values, e.g. [["Name","Age"],["Dirk","35"]]'),
        },
      },
      async ({ userEmail, spreadsheetId, range, values }) => {
        const result = await sheetsUpdate(userEmail, spreadsheetId, range, values);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'sheets_append',
      {
        title: 'Google Sheets – Append Rows',
        description:
          'Append rows to the end of existing data in a sheet. Perfect for adding new entries.',
        inputSchema: {
          userEmail: z.string().email(),
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          range: z.string().describe('Target sheet, e.g. "Sheet1!A:D"'),
          values: z
            .array(z.array(z.string()))
            .describe('Rows to append, e.g. [["New","Row","Data"]]'),
        },
      },
      async ({ userEmail, spreadsheetId, range, values }) => {
        const result = await sheetsAppend(userEmail, spreadsheetId, range, values);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'sheets_clear',
      {
        title: 'Google Sheets – Clear Range',
        description: 'Clear all values in a specified range.',
        inputSchema: {
          userEmail: z.string().email(),
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          range: z.string().describe('Range to clear, e.g. "Sheet1!A1:Z100"'),
        },
      },
      async ({ userEmail, spreadsheetId, range }) => {
        const result = await sheetsClear(userEmail, spreadsheetId, range);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    // =====================
    // FORMS TOOLS
    // =====================

    server.registerTool(
      'forms_create',
      {
        title: 'Google Forms – Create Form',
        description:
          'Create a new Google Form with questions. Supported question types: SHORT_TEXT, LONG_TEXT, MULTIPLE_CHOICE, CHECKBOX, DROPDOWN, SCALE, DATE, TIME.',
        inputSchema: {
          userEmail: z.string().email(),
          title: z.string().describe('Form title'),
          description: z.string().optional().describe('Form description'),
          questions: z
            .array(
              z.object({
                title: z.string().describe('Question text'),
                type: z
                  .enum([
                    'SHORT_TEXT', 'LONG_TEXT', 'MULTIPLE_CHOICE',
                    'CHECKBOX', 'DROPDOWN', 'SCALE', 'DATE', 'TIME',
                  ])
                  .describe('Question type'),
                required: z.boolean().optional().describe('Is answer required?'),
                options: z
                  .array(z.string())
                  .optional()
                  .describe('Options for MULTIPLE_CHOICE, CHECKBOX, DROPDOWN'),
                scaleMin: z.number().optional(),
                scaleMax: z.number().optional(),
                scaleLowLabel: z.string().optional(),
                scaleHighLabel: z.string().optional(),
              })
            )
            .optional()
            .describe('List of questions'),
          folderId: z
            .string()
            .optional()
            .describe('Parent folder ID (optional)'),
        },
      },
      async ({ userEmail, title, description, questions, folderId }) => {
        const result = await formsCreate(
          userEmail, title, description, questions, folderId
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'forms_get',
      {
        title: 'Google Forms – Get Form',
        description: 'Get form metadata and questions by form ID.',
        inputSchema: {
          userEmail: z.string().email(),
          formId: z.string().describe('Google Form ID'),
        },
      },
      async ({ userEmail, formId }) => {
        const result = await formsGet(userEmail, formId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    server.registerTool(
      'forms_get_responses',
      {
        title: 'Google Forms – Get Responses',
        description: 'Get all responses/submissions for a form.',
        inputSchema: {
          userEmail: z.string().email(),
          formId: z.string().describe('Google Form ID'),
        },
      },
      async ({ userEmail, formId }) => {
        const result = await formsGetResponses(userEmail, formId);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );
  },
  {
    serverInfo: {
      name: 'Upscaled Google Workspace MCP',
      version: '2.0.0',
    },
  },
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: true,
    redisUrl: process.env.REDIS_URL,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
