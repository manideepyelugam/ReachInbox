import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env';

export const esClient = new Client({
  node: config.ELASTICSEARCH_NODE,
});

export const EMAIL_INDEX = config.ELASTICSEARCH_INDEX;

export interface IEmailEsDocument {
  id: string;
  userId: string;
  senderAccountId: string;
  senderEmail?: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

/**
 * Initialize Elasticsearch index with proper field mappings
 */
export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        body: {
          settings: {
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'uax_url_email',
                  filter: ['lowercase'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderAccountId: { type: 'keyword' },
              senderEmail: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              recipientEmail: {
                type: 'text',
                analyzer: 'email_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              subject: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              bodyText: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              previewUrl: { type: 'keyword' },
              errorMessage: { type: 'text' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`✅ Elasticsearch index '${EMAIL_INDEX}' initialized`);
    } else {
      console.log(`✅ Elasticsearch index '${EMAIL_INDEX}' is ready`);
    }
  } catch (error: any) {
    console.warn(`⚠️ Elasticsearch connection notice: ${error.message}`);
  }
}

/**
 * Index or upsert an email job document in Elasticsearch
 */
export async function indexEmailJob(doc: IEmailEsDocument) {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: doc.id,
      document: doc,
    });
  } catch (error: any) {
    console.error(`[Elasticsearch Index Error] ${error.message}`);
  }
}

/**
 * Update email job status in Elasticsearch
 */
export async function updateEmailStatusInEs(id: string, updates: Partial<IEmailEsDocument>) {
  try {
    await esClient.update({
      index: EMAIL_INDEX,
      id,
      doc: updates,
    });
  } catch (error: any) {
    console.error(`[Elasticsearch Update Error] ${error.message}`);
  }
}

/**
 * Search emails with full-text query across recipient, sender, subject, bodyText, filtered by userId and status
 */
export async function searchEmailsInEs(params: {
  userId: string;
  query?: string;
  status?: string;
  from?: number;
  size?: number;
}) {
  const { userId, query, status, from = 0, size = 50 } = params;

  const mustClauses: any[] = [
    { term: { userId } },
  ];

  if (status) {
    mustClauses.push({ term: { status } });
  }

  if (query && query.trim() !== '') {
    mustClauses.push({
      multi_match: {
        query: query.trim(),
        fields: ['recipientEmail^3', 'senderEmail^2', 'subject^2', 'bodyText'],
        fuzziness: 'AUTO',
      },
    });
  }

  try {
    const result = await esClient.search({
      index: EMAIL_INDEX,
      from,
      size,
      query: {
        bool: {
          must: mustClauses,
        },
      },
      sort: [
        { scheduledAt: { order: 'desc' } },
      ],
    });

    const total = typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value || 0);
    const hits = result.hits.hits.map((hit) => hit._source as IEmailEsDocument);

    return {
      total,
      hits,
    };
  } catch (error: any) {
    console.error(`[Elasticsearch Search Error] ${error.message}`);
    return {
      total: 0,
      hits: [],
      error: error.message,
    };
  }
}
