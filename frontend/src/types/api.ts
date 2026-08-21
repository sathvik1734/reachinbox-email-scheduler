export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export type EmailStatus = "queued" | "scheduled" | "sending" | "sent" | "failed";

export interface EmailItem {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  failureReason: string | null;
  previewUrl: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface EmailListResponse {
  items: EmailItem[];
  pagination: Pagination;
}

export interface Stats {
  scheduled: number;
  sent: number;
  failed: number;
}

export interface SystemConfig {
  minSendDelayMs: number;
  maxEmailsPerHourPerSender: number;
  maxRecipientsPerCampaign: number;
}

export interface ScheduleCampaignInput {
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayMs: number;
  hourlyLimit: number;
}

export interface ScheduleCampaignResponse {
  campaign: {
    id: string;
    recipientCount: number;
    startAt: string;
    delayMs: number;
    hourlyLimit: number;
    queueState: "scheduled" | "pending_recovery";
  };
}
