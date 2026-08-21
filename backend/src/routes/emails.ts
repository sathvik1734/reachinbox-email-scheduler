import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const querySchema = z.object({
  view: z.enum(["scheduled", "sent"]).default("scheduled"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

emailsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query);
    const statuses =
      query.view === "scheduled"
        ? (["QUEUED", "SCHEDULED", "SENDING"] as const)
        : (["SENT", "FAILED"] as const);
    const where = {
      campaign: { userId: req.user!.id },
      status: { in: [...statuses] },
    };

    const [items, total] = await prisma.$transaction([
      prisma.emailJob.findMany({
        where,
        include: { campaign: { include: { sender: true } } },
        orderBy:
          query.view === "scheduled"
            ? [{ scheduledAt: "asc" }, { position: "asc" }]
            : [{ sentAt: "desc" }, { updatedAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    res.json({
      items: items.map((item) => ({
        id: item.id,
        recipient: item.recipient,
        subject: item.campaign.subject,
        body: item.campaign.body,
        sender: item.campaign.sender.email,
        scheduledAt: item.scheduledAt,
        sentAt: item.sentAt,
        status: item.status.toLowerCase(),
        failureReason: item.failureReason,
        previewUrl: item.previewUrl,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    });
  }),
);

emailsRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const baseWhere = { campaign: { userId: req.user!.id } };
    const [scheduled, sent, failed] = await prisma.$transaction([
      prisma.emailJob.count({
        where: { ...baseWhere, status: { in: ["QUEUED", "SCHEDULED", "SENDING"] } },
      }),
      prisma.emailJob.count({ where: { ...baseWhere, status: "SENT" } }),
      prisma.emailJob.count({ where: { ...baseWhere, status: "FAILED" } }),
    ]);
    res.json({ scheduled, sent, failed });
  }),
);
