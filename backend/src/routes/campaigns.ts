import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { enqueueEmails } from "../queue/emailQueue.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const scheduleSchema = z.object({
  senderEmail: z.email(),
  senderName: z.string().trim().max(100).optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(50_000),
  recipients: z.array(z.email()).min(1).max(5_000),
  startAt: z.iso.datetime(),
  delayMs: z.number().int().min(100).max(60 * 60 * 1000),
  hourlyLimit: z.number().int().min(1).max(100_000),
});

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

campaignsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = scheduleSchema.parse(req.body);
    const recipients = [...new Set(input.recipients.map((email) => email.toLowerCase()))];
    const startAt = new Date(input.startAt);
    const effectiveDelayMs = Math.max(input.delayMs, env.MIN_SEND_DELAY_MS);
    const effectiveHourlyLimit = Math.min(
      input.hourlyLimit,
      env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    );

    const emails = recipients.map((recipient, position) => ({
      id: randomUUID(),
      recipient,
      position,
      scheduledAt: new Date(startAt.getTime() + position * effectiveDelayMs),
    }));

    const campaign = await prisma.$transaction(async (transaction) => {
      const sender = await transaction.sender.upsert({
        where: { userId_email: { userId: req.user!.id, email: input.senderEmail.toLowerCase() } },
        create: {
          userId: req.user!.id,
          email: input.senderEmail.toLowerCase(),
          name: input.senderName,
        },
        update: { name: input.senderName },
      });

      const createdCampaign = await transaction.campaign.create({
        data: {
          userId: req.user!.id,
          senderId: sender.id,
          subject: input.subject,
          body: input.body,
          startAt,
          delayMs: effectiveDelayMs,
          hourlyLimit: effectiveHourlyLimit,
          recipientCount: recipients.length,
        },
      });

      await transaction.emailJob.createMany({
        data: emails.map((email) => ({ ...email, campaignId: createdCampaign.id })),
      });
      return createdCampaign;
    });

    let queueState: "scheduled" | "pending_recovery" = "scheduled";
    try {
      await enqueueEmails(emails);
    } catch (error) {
      queueState = "pending_recovery";
      logger.error({ err: error, campaignId: campaign.id }, "Campaign persisted; queue recovery pending");
    }

    res.status(queueState === "scheduled" ? 201 : 202).json({
      campaign: {
        id: campaign.id,
        recipientCount: recipients.length,
        startAt: campaign.startAt,
        delayMs: campaign.delayMs,
        hourlyLimit: campaign.hourlyLimit,
        queueState,
      },
    });
  }),
);
