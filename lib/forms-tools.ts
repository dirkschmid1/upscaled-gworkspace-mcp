import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth';

interface FormQuestion {
  title: string;
  type: 'SHORT_TEXT' | 'LONG_TEXT' | 'MULTIPLE_CHOICE' | 'CHECKBOX' | 'DROPDOWN' | 'SCALE' | 'DATE' | 'TIME';
  required?: boolean;
  options?: string[]; // for MULTIPLE_CHOICE, CHECKBOX, DROPDOWN
  scaleMin?: number;  // for SCALE
  scaleMax?: number;  // for SCALE
  scaleLowLabel?: string;
  scaleHighLabel?: string;
}

function buildQuestionItem(q: FormQuestion, index: number): any {
  const item: any = {
    title: q.title,
    questionItem: {
      question: {
        required: q.required ?? false,
      },
    },
  };

  switch (q.type) {
    case 'SHORT_TEXT':
      item.questionItem.question.textQuestion = { paragraph: false };
      break;
    case 'LONG_TEXT':
      item.questionItem.question.textQuestion = { paragraph: true };
      break;
    case 'MULTIPLE_CHOICE':
      item.questionItem.question.choiceQuestion = {
        type: 'RADIO',
        options: (q.options || []).map((o) => ({ value: o })),
      };
      break;
    case 'CHECKBOX':
      item.questionItem.question.choiceQuestion = {
        type: 'CHECKBOX',
        options: (q.options || []).map((o) => ({ value: o })),
      };
      break;
    case 'DROPDOWN':
      item.questionItem.question.choiceQuestion = {
        type: 'DROP_DOWN',
        options: (q.options || []).map((o) => ({ value: o })),
      };
      break;
    case 'SCALE':
      item.questionItem.question.scaleQuestion = {
        low: q.scaleMin ?? 1,
        high: q.scaleMax ?? 5,
        lowLabel: q.scaleLowLabel || '',
        highLabel: q.scaleHighLabel || '',
      };
      break;
    case 'DATE':
      item.questionItem.question.dateQuestion = { includeYear: true };
      break;
    case 'TIME':
      item.questionItem.question.timeQuestion = { duration: false };
      break;
  }

  return item;
}

// ---- FORMS CREATE ----
export async function formsCreate(
  userEmail: string,
  title: string,
  description?: string,
  questions?: FormQuestion[],
  folderId?: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const forms = google.forms({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Create basic form
  const createRes = await forms.forms.create({
    requestBody: {
      info: {
        title,
        documentTitle: title,
      },
    },
  });

  const formId = createRes.data.formId!;

  // Add description and questions via batchUpdate
  const requests: any[] = [];

  if (description) {
    requests.push({
      updateFormInfo: {
        info: { description },
        updateMask: 'description',
      },
    });
  }

  if (questions && questions.length > 0) {
    questions.forEach((q, i) => {
      requests.push({
        createItem: {
          item: buildQuestionItem(q, i),
          location: { index: i },
        },
      });
    });
  }

  if (requests.length > 0) {
    await forms.forms.batchUpdate({
      formId,
      requestBody: { requests },
    });
  }

  // Move to folder if specified
  if (folderId) {
    await drive.files.update({
      fileId: formId,
      addParents: folderId,
      removeParents: 'root',
      fields: 'id, parents',
    });
  }

  return {
    formId,
    title,
    responderUri: createRes.data.responderUri,
    editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
  };
}

// ---- FORMS GET ----
export async function formsGet(
  userEmail: string,
  formId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const forms = google.forms({ version: 'v1', auth });

  const res = await forms.forms.get({ formId });

  return {
    formId: res.data.formId,
    title: res.data.info?.title,
    description: res.data.info?.description,
    responderUri: res.data.responderUri,
    editUrl: `https://docs.google.com/forms/d/${res.data.formId}/edit`,
    items: res.data.items?.map((item) => ({
      itemId: item.itemId,
      title: item.title,
      description: item.description,
    })),
  };
}

// ---- FORMS GET RESPONSES ----
export async function formsGetResponses(
  userEmail: string,
  formId: string
) {
  const auth = await getAuthenticatedClient(userEmail);
  const forms = google.forms({ version: 'v1', auth });

  const res = await forms.forms.responses.list({ formId });

  return {
    formId,
    totalResponses: res.data.responses?.length || 0,
    responses: (res.data.responses || []).map((r) => ({
      responseId: r.responseId,
      createTime: r.createTime,
      lastSubmittedTime: r.lastSubmittedTime,
      answers: r.answers
        ? Object.entries(r.answers).reduce((acc, [qId, answer]) => {
            acc[qId] = answer.textAnswers?.answers?.map((a) => a.value) || [];
            return acc;
          }, {} as Record<string, string[]>)
        : {},
    })),
  };
}
