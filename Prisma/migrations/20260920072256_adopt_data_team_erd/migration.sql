/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prediction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SLAProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('New', 'Triaged', 'Assigned', 'In Progress', 'Waiting', 'Resolved', 'Reopened', 'Closed');

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "Prediction" DROP CONSTRAINT "Prediction_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_slaProfileId_fkey";

-- DropForeignKey
ALTER TABLE "TicketHistory" DROP CONSTRAINT "TicketHistory_changedById_fkey";

-- DropForeignKey
ALTER TABLE "TicketHistory" DROP CONSTRAINT "TicketHistory_ticketId_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropTable
DROP TABLE "Attachment";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Prediction";

-- DropTable
DROP TABLE "SLAProfile";

-- DropTable
DROP TABLE "Ticket";

-- DropTable
DROP TABLE "TicketHistory";

-- DropEnum
DROP TYPE "Priority";

-- DropEnum
DROP TYPE "Status";

-- CreateTable
CREATE TABLE "SUPPORT_TEAM" (
    "team_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "team_type" TEXT NOT NULL,

    CONSTRAINT "SUPPORT_TEAM_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "CATEGORY" (
    "category_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_team_id" INTEGER NOT NULL,

    CONSTRAINT "CATEGORY_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "LOCATION" (
    "location_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "LOCATION_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "ASSET" (
    "asset_id" TEXT NOT NULL,
    "location_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "asset_type" TEXT NOT NULL,

    CONSTRAINT "ASSET_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "SLA_POLICY" (
    "priority" TEXT NOT NULL,
    "response_sla_hours" INTEGER NOT NULL,
    "resolution_sla_hours" INTEGER NOT NULL,

    CONSTRAINT "SLA_POLICY_pkey" PRIMARY KEY ("priority")
);

-- CreateTable
CREATE TABLE "TICKET" (
    "ticket_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "asset_id" TEXT,
    "issue_type" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'New',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_response_at" TIMESTAMP(3),
    "assigned_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "response_sla_due_at" TIMESTAMP(3),
    "resolution_sla_due_at" TIMESTAMP(3),
    "user_responded" BOOLEAN NOT NULL DEFAULT false,
    "reopened" BOOLEAN NOT NULL DEFAULT false,
    "reopen_reason" TEXT,
    "duplicate_of" TEXT,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalation_reason" TEXT,
    "escalation_level" SMALLINT,

    CONSTRAINT "TICKET_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "ASSIGNMENT" (
    "assignment_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "team_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ASSIGNMENT_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "PREDICTION" (
    "prediction_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "predicted_category_id" INTEGER NOT NULL,
    "predicted_priority" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "model_version" TEXT NOT NULL,
    "ai_overridden" BOOLEAN NOT NULL DEFAULT false,
    "override_category_id" INTEGER,
    "override_priority" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PREDICTION_pkey" PRIMARY KEY ("prediction_id")
);

-- CreateTable
CREATE TABLE "FEEDBACK" (
    "feedback_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "resolution_confirmed" BOOLEAN NOT NULL,
    "rating" SMALLINT NOT NULL,
    "reopen_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FEEDBACK_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "TICKET_STATUS_HISTORY" (
    "history_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT NOT NULL,

    CONSTRAINT "TICKET_STATUS_HISTORY_pkey" PRIMARY KEY ("history_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CATEGORY_name_key" ON "CATEGORY"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LOCATION_name_key" ON "LOCATION"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PREDICTION_ticket_id_key" ON "PREDICTION"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "FEEDBACK_ticket_id_key" ON "FEEDBACK"("ticket_id");

-- AddForeignKey
ALTER TABLE "CATEGORY" ADD CONSTRAINT "CATEGORY_default_team_id_fkey" FOREIGN KEY ("default_team_id") REFERENCES "SUPPORT_TEAM"("team_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ASSET" ADD CONSTRAINT "ASSET_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LOCATION"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ASSET" ADD CONSTRAINT "ASSET_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "CATEGORY"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET" ADD CONSTRAINT "TICKET_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET" ADD CONSTRAINT "TICKET_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "CATEGORY"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET" ADD CONSTRAINT "TICKET_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "LOCATION"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET" ADD CONSTRAINT "TICKET_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "ASSET"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET" ADD CONSTRAINT "TICKET_priority_fkey" FOREIGN KEY ("priority") REFERENCES "SLA_POLICY"("priority") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET" ADD CONSTRAINT "TICKET_duplicate_of_fkey" FOREIGN KEY ("duplicate_of") REFERENCES "TICKET"("ticket_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ASSIGNMENT" ADD CONSTRAINT "ASSIGNMENT_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "TICKET"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ASSIGNMENT" ADD CONSTRAINT "ASSIGNMENT_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "SUPPORT_TEAM"("team_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PREDICTION" ADD CONSTRAINT "PREDICTION_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "TICKET"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PREDICTION" ADD CONSTRAINT "PREDICTION_predicted_category_id_fkey" FOREIGN KEY ("predicted_category_id") REFERENCES "CATEGORY"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PREDICTION" ADD CONSTRAINT "PREDICTION_override_category_id_fkey" FOREIGN KEY ("override_category_id") REFERENCES "CATEGORY"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FEEDBACK" ADD CONSTRAINT "FEEDBACK_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "TICKET"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TICKET_STATUS_HISTORY" ADD CONSTRAINT "TICKET_STATUS_HISTORY_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "TICKET"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;
