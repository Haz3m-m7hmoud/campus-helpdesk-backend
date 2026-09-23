-- CreateTable
CREATE TABLE "COMMENT" (
    "comment_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "COMMENT_pkey" PRIMARY KEY ("comment_id")
);

-- AddForeignKey
ALTER TABLE "COMMENT" ADD CONSTRAINT "COMMENT_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "TICKET"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMMENT" ADD CONSTRAINT "COMMENT_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
