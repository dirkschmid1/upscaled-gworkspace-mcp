import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth';

// ---- CALENDAR GET EVENTS ----
export async function calendarGetEvents(
  userEmail: string,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 10
) {
  const auth = await getAuthenticatedClient(userEmail);
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin || now.toISOString(),
    timeMax:
      timeMax ||
      new Date(now.getTime() + 7 * 86400000).toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map((e) => ({
    id: e.id,
    summary: e.summary,
    description: e.description?.substring(0, 500),
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    location: e.location,
    attendees: e.attendees?.map((a) => ({
      email: a.email,
      responseStatus: a.responseStatus,
    })),
    htmlLink: e.htmlLink,
  }));
}

// ---- CALENDAR CREATE EVENT ----
export async function calendarCreateEvent(
  userEmail: string,
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string,
  attendees?: string[]
) {
  const auth = await getAuthenticatedClient(userEmail);
  const calendar = google.calendar({ version: 'v3', auth });

  const event: any = {
    summary,
    start: { dateTime: startTime, timeZone: 'Europe/Berlin' },
    end: { dateTime: endTime, timeZone: 'Europe/Berlin' },
  };
  if (description) event.description = description;
  if (location) event.location = location;
  if (attendees?.length) {
    event.attendees = attendees.map((email) => ({ email }));
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: attendees?.length ? 'all' : 'none',
  });

  return {
    id: res.data.id,
    summary: res.data.summary,
    start: res.data.start?.dateTime || res.data.start?.date,
    end: res.data.end?.dateTime || res.data.end?.date,
    htmlLink: res.data.htmlLink,
  };
}

// ---- CALENDAR UPDATE EVENT ----
export async function calendarUpdateEvent(
  userEmail: string,
  eventId: string,
  updates: {
    summary?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
  }
) {
  const auth = await getAuthenticatedClient(userEmail);
  const calendar = google.calendar({ version: 'v3', auth });

  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  const patch: any = {};
  if (updates.summary) patch.summary = updates.summary;
  if (updates.description !== undefined)
    patch.description = updates.description;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.startTime)
    patch.start = {
      dateTime: updates.startTime,
      timeZone: 'Europe/Berlin',
    };
  if (updates.endTime)
    patch.end = {
      dateTime: updates.endTime,
      timeZone: 'Europe/Berlin',
    };

  const res = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: patch,
  });

  return {
    id: res.data.id,
    summary: res.data.summary,
    start: res.data.start?.dateTime || res.data.start?.date,
    end: res.data.end?.dateTime || res.data.end?.date,
    htmlLink: res.data.htmlLink,
    updated: true,
  };
}

// ---- CALENDAR DELETE EVENT ----
export async function calendarDeleteEvent(
  userEmail: string,
  eventId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });

  return { success: true, eventId, deleted: true };
}

// ---- CALENDAR FIND FREE SLOTS ----
export async function calendarFindFreeSlots(
  userEmail: string,
  dateMin: string,
  dateMax: string,
  durationMinutes: number = 30,
  workingHoursStart: number = 9,
  workingHoursEnd: number = 17
) {
  const auth = await getAuthenticatedClient(userEmail);
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: dateMin,
    timeMax: dateMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  const events = (res.data.items || [])
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      start: new Date(e.start!.dateTime!),
      end: new Date(e.end!.dateTime!),
      summary: e.summary,
    }));

  const freeSlots: Array<{
    start: string;
    end: string;
    durationMinutes: number;
  }> = [];

  const startDate = new Date(dateMin);
  const endDate = new Date(dateMax);
  const current = new Date(startDate);

  while (current < endDate) {
    const day = current.getDay();
    if (day === 0 || day === 6) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    const dayStart = new Date(current);
    dayStart.setHours(workingHoursStart, 0, 0, 0);
    const dayEnd = new Date(current);
    dayEnd.setHours(workingHoursEnd, 0, 0, 0);

    const dayEvents = events
      .filter((e) => e.start < dayEnd && e.end > dayStart)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let pointer = dayStart;
    for (const event of dayEvents) {
      const gapStart = pointer > dayStart ? pointer : dayStart;
      const gapEnd = event.start < dayEnd ? event.start : dayEnd;
      const gapMinutes =
        (gapEnd.getTime() - gapStart.getTime()) / 60000;

      if (gapMinutes >= durationMinutes && gapStart < gapEnd) {
        freeSlots.push({
          start: gapStart.toISOString(),
          end: gapEnd.toISOString(),
          durationMinutes: Math.round(gapMinutes),
        });
      }
      if (event.end > pointer) pointer = event.end;
    }

    const finalGapStart = pointer > dayStart ? pointer : dayStart;
    const finalGapMinutes =
      (dayEnd.getTime() - finalGapStart.getTime()) / 60000;
    if (finalGapMinutes >= durationMinutes && finalGapStart < dayEnd) {
      freeSlots.push({
        start: finalGapStart.toISOString(),
        end: dayEnd.toISOString(),
        durationMinutes: Math.round(finalGapMinutes),
      });
    }

    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return {
    freeSlots,
    totalSlots: freeSlots.length,
    searchRange: { from: dateMin, to: dateMax },
    workingHours: `${workingHoursStart}:00 - ${workingHoursEnd}:00`,
    minimumDuration: `${durationMinutes} minutes`,
  };
}
